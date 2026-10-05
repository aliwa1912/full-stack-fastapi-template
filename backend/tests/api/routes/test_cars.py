import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app import crud
from app.core.config import settings
from app.core.uploads import UPLOADS_DIR
from app.models import Car, CarImage, CarInquiry, User
from tests.utils.user import authentication_token_from_email

API = settings.API_V1_STR

# Uploads are validated by content type, so a minimal valid PNG is enough.
PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d494844520000000100000001080200000090"
    "7753de0000000c4944415408d76360000002000100ffff03000006000557bfabd4"
    "0000000049454e44ae426082"
)


def seller_headers(client: TestClient, db: Session, email: str) -> dict[str, str]:
    """
    Return a valid token for `email`, creating the account when needed.

    This also acts as the account creation step for tests that need a seller.
    """
    headers = authentication_token_from_email(client=client, email=email, db=db)
    assert crud.get_user_by_email(session=db, email=email) is not None
    return headers


def unique_email(db: Session, prefix: str = "seller") -> str:
    index = db.exec(select(func.count()).select_from(User)).one()
    return f"{prefix}{index}@example.com"


def create_car(
    db: Session,
    client: TestClient,
    *,
    owner_email: str | None = None,
    **overrides: object,
) -> Car:
    if owner_email is None:
        owner_email = unique_email(db)
    seller_headers(client, db, owner_email)
    owner = crud.get_user_by_email(session=db, email=owner_email)
    assert owner is not None

    data: dict[str, object] = {
        "title": "2021 Ferrari 812 Superfast",
        "make": "Ferrari",
        "model": "812 Superfast",
        "year": 2021,
        "price": 3_250_000,
        "mileage": 1_240,
        "engine": "6.5L V12",
        "transmission": "7-Speed DCT",
    }
    data.update(overrides)

    car = Car(**data, created_by_id=owner.id)
    db.add(car)
    db.commit()
    db.refresh(car)
    return car


def image_count(db: Session, car_id: object | None = None) -> int:
    statement = select(func.count()).select_from(CarImage)
    if car_id is not None:
        statement = statement.where(CarImage.car_id == car_id)
    return db.exec(statement).one()


def upload_images(
    client: TestClient, car_id: object, headers: dict[str, str], count: int = 3
) -> list[dict]:
    files = [
        ("files", (f"photo{index}.png", PNG_BYTES, "image/png"))
        for index in range(count)
    ]
    response = client.post(f"{API}/cars/{car_id}/images", files=files, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_read_cars_public(client: TestClient, db: Session) -> None:
    create_car(db, client, make="McLaren", model="720S")
    create_car(db, client, title="1967 Mustang", make="Ford", model="Mustang")

    response = client.get(f"{API}/cars/", params={"search": "Mustang"})

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["data"][0]["make"] == "Ford"


def test_read_cars_hides_sold_by_default(client: TestClient, db: Session) -> None:
    sold = create_car(db, client, title="Unsold example", make="Pagani")
    create_car(db, client, title="Sold Pagani", make="Pagani", is_sold=True)

    default = client.get(f"{API}/cars/", params={"make": "Pagani"})
    include_sold = client.get(
        f"{API}/cars/", params={"make": "Pagani", "include_sold": True}
    )

    assert default.json()["count"] == 1
    assert default.json()["data"][0]["id"] == str(sold.id)
    assert include_sold.json()["count"] == 2


def test_read_car_detail(client: TestClient, db: Session) -> None:
    car = create_car(db, client)

    response = client.get(f"{API}/cars/{car.id}")

    assert response.status_code == 200
    assert response.json()["make"] == "Ferrari"
    assert response.json()["title"] == car.title


def test_read_car_not_found(client: TestClient) -> None:
    response = client.get(f"{API}/cars/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404


def test_create_car_requires_auth(client: TestClient) -> None:
    response = client.post(f"{API}/cars/", json={"title": "No auth"})

    assert response.status_code == 401


def test_create_and_update_car(client: TestClient, db: Session) -> None:
    email = unique_email(db, "creator")
    headers = seller_headers(client, db, email)

    payload = {
        "title": "2022 Lamborghini Huracan STO",
        "make": "Lamborghini",
        "model": "Huracan STO",
        "year": 2022,
        "price": 3_277_000,
        "mileage": 120,
        "engine": "5.2L V10",
        "transmission": "7-Speed DCT",
    }

    created = client.post(f"{API}/cars/", json=payload, headers=headers)

    assert created.status_code == 200
    car_id = created.json()["id"]

    updated = client.patch(
        f"{API}/cars/{car_id}",
        json={"price": 3_000_000, "is_sold": True},
        headers=headers,
    )

    assert updated.status_code == 200
    assert updated.json()["price"] == 3_000_000
    assert updated.json()["is_sold"] is True


def test_delete_car(client: TestClient, db: Session) -> None:
    email = unique_email(db, "deleter")
    car = create_car(db, client, owner_email=email)
    headers = seller_headers(client, db, email)
    car_id = car.id

    response = client.delete(f"{API}/cars/{car.id}", headers=headers)

    assert response.status_code == 200
    db.expire_all()
    assert db.get(Car, car_id) is None


def test_cannot_modify_another_users_car(client: TestClient, db: Session) -> None:
    car = create_car(db, client)
    intruder = unique_email(db, "intruder")
    headers = seller_headers(client, db, intruder)

    response = client.patch(f"{API}/cars/{car.id}", json={"price": 1}, headers=headers)

    assert response.status_code == 403


def test_upload_multiple_images_marks_first_primary(
    client: TestClient, db: Session
) -> None:
    email = unique_email(db, "uploader")
    car = create_car(db, client, owner_email=email)
    headers = seller_headers(client, db, email)

    images = upload_images(client, car.id, headers, count=3)

    assert len(images) == 3
    assert images[0]["is_primary"] is True
    assert images[0]["image_url"].startswith("http")

    detail = client.get(f"{API}/cars/{car.id}")
    assert len(detail.json()["images"]) == 3


def test_uploaded_image_is_served(client: TestClient, db: Session) -> None:
    email = unique_email(db, "served")
    car = create_car(db, client, owner_email=email)
    headers = seller_headers(client, db, email)
    images = upload_images(client, car.id, headers, count=1)

    stored = images[0]["image_url"].replace(str(client.base_url).rstrip("/"), "")
    response = client.get(stored)

    assert response.status_code == 200
    assert response.content == PNG_BYTES


def test_upload_rejects_non_image(client: TestClient, db: Session) -> None:
    email = unique_email(db, "bads")
    car = create_car(db, client, owner_email=email)
    headers = seller_headers(client, db, email)

    response = client.post(
        f"{API}/cars/{car.id}/images",
        files=[("files", ("payload.txt", b"not an image", "text/plain"))],
        headers=headers,
    )

    assert response.status_code == 415


def test_delete_own_image(client: TestClient, db: Session) -> None:
    email = unique_email(db, "imgdel")
    car = create_car(db, client, owner_email=email)
    headers = seller_headers(client, db, email)
    images = upload_images(client, car.id, headers, count=1)

    response = client.delete(
        f"{API}/cars/{car.id}/images/{images[0]['id']}", headers=headers
    )

    assert response.status_code == 200
    db.expire_all()
    assert image_count(db, car.id) == 0


def test_create_inquiry(client: TestClient, db: Session) -> None:
    car = create_car(db, client)

    response = client.post(
        f"{API}/cars/{car.id}/inquiries",
        json={
            "name": "A Buyer",
            "email": "buyer@example.com",
            "phone": "+1 555 0100",
            "message": "Is this available for private viewing?",
        },
    )

    assert response.status_code == 201


def test_inquiry_rejects_bad_email(client: TestClient, db: Session) -> None:
    car = create_car(db, client)

    response = client.post(
        f"{API}/cars/{car.id}/inquiries",
        json={"name": "A Buyer", "email": "not-an-email"},
    )

    assert response.status_code == 422


def test_inquiry_is_persisted(client: TestClient, db: Session) -> None:
    car = create_car(db, client)
    before = db.exec(
        select(func.count()).select_from(CarInquiry).where(CarInquiry.car_id == car.id)
    ).one()

    response = client.post(
        f"{API}/cars/{car.id}/inquiries",
        json={"name": "Persisted Buyer", "email": "kept@example.com"},
    )

    assert response.status_code == 201
    db.expire_all()
    after = db.exec(
        select(func.count()).select_from(CarInquiry).where(CarInquiry.car_id == car.id)
    ).one()
    assert after == before + 1


def test_inquiry_for_unknown_car(client: TestClient) -> None:
    response = client.post(
        f"{API}/cars/00000000-0000-0000-0000-000000000000/inquiries",
        json={"name": "A Buyer", "email": "buyer@example.com"},
    )

    assert response.status_code == 404


def test_read_makes(client: TestClient, db: Session) -> None:
    create_car(db, client, make="Koenigsegg", model="Jesko")
    create_car(db, client, title="Ford Mustang", make="Ford", model="Mustang")

    response = client.get(f"{API}/cars/makes")

    assert response.status_code == 200
    makes = response.json()
    assert "Koenigsegg" in makes
    assert "Ford" in makes
    # A duplicated make must only be listed once.
    assert makes.count("Ford") == 1


def test_filters_and_sort(client: TestClient, db: Session) -> None:
    create_car(
        db, client, make="Aston", model="DB11", price=500_000, year=2019, mileage=10
    )
    create_car(
        db,
        client,
        make="Bentley",
        model="Continental",
        price=3_000_000,
        year=2022,
        mileage=100,
    )

    cheap = client.get(f"{API}/cars/", params={"make": "Aston", "max_price": 1_000_000})
    pricey_first = client.get(
        f"{API}/cars/", params={"make": "Bentley", "sort": "price_desc"}
    )
    low_mileage = client.get(
        f"{API}/cars/", params={"make": "Aston", "max_mileage": 50}
    )
    min_year = client.get(f"{API}/cars/", params={"make": "Bentley", "min_year": 2020})

    assert cheap.json()["count"] == 1
    assert pricey_first.json()["data"][0]["price"] == 3_000_000
    assert low_mileage.json()["count"] == 1
    assert min_year.json()["count"] == 1


def test_search_matches_make_and_model(client: TestClient, db: Session) -> None:
    create_car(db, client, make="Lambo", model="Countach")
    create_car(db, client, make="Maserati", model="MC20")

    assert (
        client.get(f"{API}/cars/", params={"search": "countach"}).json()["count"] == 1
    )
    assert client.get(f"{API}/cars/", params={"search": "mc20"}).json()["count"] == 1
    assert client.get(f"{API}/cars/", params={"search": "zzz"}).json()["count"] == 0


def test_site_settings_public_and_admin_update(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # The showroom hero reads this endpoint, so it must not require a token.
    public = client.get(f"{API}/admin/site-settings")
    assert public.status_code == 200

    unauthorized = client.put(
        f"{API}/admin/site-settings", json={"dealership_name": "Hijacked"}
    )
    assert unauthorized.status_code == 401

    updated = client.put(
        f"{API}/admin/site-settings",
        json={
            "dealership_name": "Aurelia Monaco",
            "contact_phone": "+377",
            "hero_headline": "Monaco nights",
        },
        headers=superuser_token_headers,
    )

    assert updated.status_code == 200
    assert updated.json()["dealership_name"] == "Aurelia Monaco"
    assert updated.json()["hero_headline"] == "Monaco nights"

    # The public read must reflect the change.
    assert client.get(f"{API}/admin/site-settings").json()["contact_phone"] == "+377"


def test_site_settings_rejects_invalid_email(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.put(
        f"{API}/admin/site-settings",
        json={"contact_email": "not-an-email"},
        headers=superuser_token_headers,
    )

    assert response.status_code == 422


def test_admin_list_all_cars_across_owners(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    create_car(db, client, owner_email=unique_email(db, "one"), make="Lotus")
    create_car(db, client, owner_email=unique_email(db, "two"), make="Lotus")

    response = client.get(
        f"{API}/admin/cars/",
        params={"make": "Lotus"},
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["count"] == 2


def test_admin_list_includes_sold_cars(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    create_car(db, client, make="Saleen", is_sold=True)

    response = client.get(
        f"{API}/admin/cars/",
        params={"make": "Saleen"},
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_admin_can_update_any_car(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)

    response = client.patch(
        f"{API}/admin/cars/{car.id}",
        json={"is_featured": True, "price": 3_100_000},
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["is_featured"] is True
    assert response.json()["price"] == 3_100_000


def test_admin_reorder_and_set_primary(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    images = upload_images(client, car.id, superuser_token_headers, count=3)
    second = images[1]

    promoted = client.patch(
        f"{API}/admin/cars/{car.id}/images/{second['id']}",
        params={"is_primary": True},
        headers=superuser_token_headers,
    )

    assert promoted.status_code == 200
    assert promoted.json()["is_primary"] is True

    reordered = client.put(
        f"{API}/admin/cars/{car.id}/images/reorder",
        json={"image_ids": [second["id"], images[0]["id"], images[2]["id"]]},
        headers=superuser_token_headers,
    )

    assert reordered.status_code == 200
    assert [row["id"] for row in reordered.json()] == [
        second["id"],
        images[0]["id"],
        images[2]["id"],
    ]


def test_admin_can_delete_any_car(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    car_id = car.id

    response = client.delete(
        f"{API}/admin/cars/{car.id}", headers=superuser_token_headers
    )

    assert response.status_code == 200
    db.expire_all()
    assert db.get(Car, car_id) is None


def test_admin_routes_reject_regular_users(client: TestClient, db: Session) -> None:
    headers = seller_headers(client, db, unique_email(db, "regular"))

    listing = client.get(f"{API}/admin/cars/", headers=headers)
    update_settings = client.put(
        f"{API}/admin/site-settings",
        json={"dealership_name": "Nope"},
        headers=headers,
    )

    assert listing.status_code == 403
    assert update_settings.status_code == 403


def test_sold_car_disappears_from_public_listing(
    client: TestClient, db: Session
) -> None:
    email = unique_email(db, "sellers")
    car = create_car(db, client, owner_email=email)
    headers = seller_headers(client, db, email)

    client.patch(f"{API}/cars/{car.id}", json={"is_sold": True}, headers=headers)
    public = client.get(f"{API}/cars/", params={"search": "Ferrari"})

    assert all(row["id"] != str(car.id) for row in public.json()["data"])


def test_cascade_delete_removes_images(client: TestClient, db: Session) -> None:
    email = unique_email(db, "cascade")
    car = create_car(db, client, owner_email=email)
    headers = seller_headers(client, db, email)
    car_id = car.id
    upload_images(client, car_id, headers, count=2)

    client.delete(f"{API}/cars/{car_id}", headers=headers)
    db.expire_all()

    assert image_count(db, car_id) == 0


def test_seller_registration_and_listing_flow(client: TestClient, db: Session) -> None:
    email = unique_email(db, "flow")
    registration = client.post(
        f"{API}/users/signup",
        json={
            "email": email,
            "password": "flowpassword123",
            "full_name": "Flow Seller",
        },
    )
    assert registration.status_code == 200
    assert registration.json()["email"] == email

    headers = seller_headers(client, db, email)
    created = client.post(
        f"{API}/cars/",
        json={
            "title": "2020 McLaren 720S",
            "make": "McLaren",
            "model": "720S",
            "year": 2020,
            "price": 2_500_000,
            "mileage": 900,
        },
        headers=headers,
    )

    assert created.status_code == 200
    assert created.json()["make"] == "McLaren"


def send_inquiry(
    client: TestClient, car_id: object, **overrides: object
) -> dict[str, str]:
    """
    Post a public lead for `car_id` and return the created row as the admin sees it.
    """
    payload: dict[str, object] = {
        "name": "A Buyer",
        "email": "buyer@example.com",
        "phone": "+1 555 0100",
        "message": "Is this available for private viewing?",
    }
    payload.update(overrides)

    created = client.post(f"{API}/cars/{car_id}/inquiries", json=payload)
    assert created.status_code == 201, created.text
    return payload


def list_inquiries(
    client: TestClient, headers: dict[str, str], car_id: object, **params: object
) -> dict:
    """
    List leads scoped to a single listing.

    The test database is shared for the whole session, so counts are only
    meaningful when filtered down to the vehicle a test just created.
    """
    response = client.get(
        f"{API}/admin/inquiries/",
        params={"car_id": str(car_id), **params},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_admin_reads_inquiries_with_car_context(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)

    send_inquiry(client, car.id)

    body = list_inquiries(client, superuser_token_headers, car.id)

    assert body["count"] == 1
    assert body["new_count"] == 1
    lead = body["data"][0]
    assert lead["email"] == "buyer@example.com"
    assert lead["is_read"] is False
    # The lead is useless without knowing which vehicle it refers to.
    assert lead["car"]["id"] == str(car.id)
    assert lead["car"]["make"] == "Ferrari"


def test_admin_marks_inquiry_read_and_saves_notes(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    send_inquiry(client, car.id)
    inquiry_id = list_inquiries(client, superuser_token_headers, car.id)["data"][0][
        "id"
    ]

    patched = client.patch(
        f"{API}/admin/inquiries/{inquiry_id}",
        json={"is_read": True, "notes": "Client called, viewing booked."},
        headers=superuser_token_headers,
    )

    assert patched.status_code == 200
    assert patched.json()["is_read"] is True
    assert patched.json()["notes"] == "Client called, viewing booked."

    listing = list_inquiries(client, superuser_token_headers, car.id)
    assert listing["count"] == 1
    assert listing["new_count"] == 0


def test_admin_filters_inquiries_by_unread(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    send_inquiry(client, car.id, email="kept@example.com")
    send_inquiry(client, car.id, email="handled@example.com")
    inquiries = list_inquiries(client, superuser_token_headers, car.id)["data"]

    handled = next(row for row in inquiries if row["email"] == "handled@example.com")
    client.patch(
        f"{API}/admin/inquiries/{handled['id']}",
        json={"is_read": True},
        headers=superuser_token_headers,
    )

    unread = list_inquiries(client, superuser_token_headers, car.id, is_read=False)

    assert unread["count"] == 1
    assert unread["data"][0]["email"] == "kept@example.com"


def test_admin_deletes_inquiry(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    send_inquiry(client, car.id)
    inquiry_id = list_inquiries(client, superuser_token_headers, car.id)["data"][0][
        "id"
    ]

    response = client.delete(
        f"{API}/admin/inquiries/{inquiry_id}", headers=superuser_token_headers
    )

    assert response.status_code == 200
    db.expire_all()
    assert db.get(CarInquiry, inquiry_id) is None


def test_inquiry_routes_require_superuser(client: TestClient, db: Session) -> None:
    car = create_car(db, client)
    send_inquiry(client, car.id)
    headers = seller_headers(client, db, unique_email(db, "nosy"))

    listing = client.get(f"{API}/admin/inquiries/", headers=headers)
    stats = client.get(f"{API}/admin/stats/", headers=headers)

    assert listing.status_code == 403
    assert stats.status_code == 403


def test_admin_stats_counts_site_wide(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client, make="Stats", is_featured=True)
    create_car(db, client, make="Stats", is_sold=True)
    send_inquiry(client, car.id)

    response = client.get(f"{API}/admin/stats/", headers=superuser_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["featured_cars"] >= 1
    assert body["sold_cars"] >= 1
    assert body["available_cars"] >= 1
    assert body["total_cars"] == body["available_cars"] + body["sold_cars"]
    assert body["total_users"] >= 1
    assert body["total_inquiries"] >= 1
    assert body["new_inquiries"] >= 1


def test_admin_uploads_photos_to_any_listing(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    owner_id = car.created_by_id

    files = [
        ("files", ("angle.png", PNG_BYTES, "image/png")),
        ("files", ("detail.png", PNG_BYTES, "image/png")),
    ]
    response = client.post(
        f"{API}/admin/cars/{car.id}/images",
        files=files,
        headers=superuser_token_headers,
    )

    assert response.status_code == 200, response.text
    created = response.json()
    assert [row["is_primary"] for row in created] == [True, False]
    assert image_count(db, car.id) == 2
    db.expire_all()
    assert db.get(Car, car.id).created_by_id == owner_id


def test_admin_deletes_photo_and_promotes_a_replacement(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    images = upload_images(client, car.id, superuser_token_headers, count=2)
    primary = db.exec(
        select(CarImage).where(CarImage.id == uuid.UUID(images[0]["id"]))
    ).one()
    stored_url = primary.image_url

    response = client.delete(
        f"{API}/admin/cars/{car.id}/images/{images[0]['id']}",
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Image deleted successfully"
    assert image_count(db, car.id) == 1
    assert not (UPLOADS_DIR / stored_url.removeprefix("/uploads/")).exists()

    db.expire_all()
    remaining = db.exec(select(CarImage).where(CarImage.car_id == car.id)).one()
    assert remaining.is_primary is True


def test_admin_image_endpoints_reject_regular_users(
    client: TestClient, db: Session
) -> None:
    email = unique_email(db, "photographer")
    headers = seller_headers(client, db, email)
    car = create_car(db, client, owner_email=email)
    images = upload_images(client, car.id, headers, count=1)

    upload = client.post(
        f"{API}/admin/cars/{car.id}/images",
        files=[("files", ("sneaky.png", PNG_BYTES, "image/png"))],
        headers=headers,
    )
    promote = client.patch(
        f"{API}/admin/cars/{car.id}/images/{images[0]['id']}",
        params={"is_primary": True},
        headers=headers,
    )
    reorder = client.put(
        f"{API}/admin/cars/{car.id}/images/reorder",
        json={"image_ids": [images[0]["id"]]},
        headers=headers,
    )
    remove = client.delete(
        f"{API}/admin/cars/{car.id}/images/{images[0]['id']}", headers=headers
    )

    assert upload.status_code == 403
    assert promote.status_code == 403
    assert reorder.status_code == 403
    assert remove.status_code == 403


def test_admin_image_lookup_failures(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    other = create_car(db, client)
    images = upload_images(client, car.id, superuser_token_headers, count=1)
    missing_id = str(uuid.uuid4())

    # An image that belongs to a different listing must not be reachable.
    wrong_listing = client.patch(
        f"{API}/admin/cars/{other.id}/images/{images[0]['id']}",
        params={"is_primary": True},
        headers=superuser_token_headers,
    )
    unknown_delete = client.delete(
        f"{API}/admin/cars/{car.id}/images/{missing_id}",
        headers=superuser_token_headers,
    )
    unknown_reorder = client.put(
        f"{API}/admin/cars/{car.id}/images/reorder",
        json={"image_ids": [missing_id]},
        headers=superuser_token_headers,
    )

    assert wrong_listing.status_code == 404
    assert unknown_delete.status_code == 404
    assert unknown_reorder.status_code == 422


def test_admin_inquiry_lookup_failures(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    missing_id = str(uuid.uuid4())

    patched = client.patch(
        f"{API}/admin/inquiries/{missing_id}",
        json={"is_read": True},
        headers=superuser_token_headers,
    )
    deleted = client.delete(
        f"{API}/admin/inquiries/{missing_id}", headers=superuser_token_headers
    )

    assert patched.status_code == 404
    assert deleted.status_code == 404


def test_admin_searches_inquiries_by_name_email_or_message(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    send_inquiry(client, car.id, name="Beatrice Ferrand")
    send_inquiry(
        client, car.id, email="collector@example.com", message="Only the V12, please"
    )

    def search(term: str) -> dict:
        response = client.get(
            f"{API}/admin/inquiries/",
            params={"search": term},
            headers=superuser_token_headers,
        )
        assert response.status_code == 200, response.text
        return response.json()

    by_name = search("beatrice")
    by_email = search("collector@example.com")
    by_message = search("only the v12")
    unknown = search("nobody-by-that-name")

    assert [row["name"] for row in by_name["data"]] == ["Beatrice Ferrand"]
    assert by_name["count"] == 1
    assert [row["email"] for row in by_email["data"]] == ["collector@example.com"]
    assert by_email["count"] == 1
    assert by_message["count"] == 1
    assert by_message["new_count"] == 1
    assert unknown["count"] == 0
    assert unknown["data"] == []


def test_admin_image_display_order_can_be_nudged(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    car = create_car(db, client)
    images = upload_images(client, car.id, superuser_token_headers, count=3)

    response = client.patch(
        f"{API}/admin/cars/{car.id}/images/{images[2]['id']}",
        params={"display_order": 1},
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["display_order"] == 1
    assert response.json()["is_primary"] is False
