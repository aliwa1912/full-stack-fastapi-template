import uuid
from typing import Any

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import selectinload
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.uploads import delete_image_file, public_image, save_upload
from app.models import (
    Car,
    CarCreate,
    CarImage,
    CarImagePublic,
    CarInquiry,
    CarInquiryCreate,
    CarPublic,
    CarSort,
    CarsPublic,
    CarUpdate,
    Message,
    UserPublic,
)
from app.utils import send_email

router = APIRouter(prefix="/cars", tags=["cars"])

SORT_COLUMNS = {
    "newest": (col(Car.created_at).desc(),),
    "oldest": (col(Car.created_at).asc(),),
    "price_asc": (col(Car.price).asc(),),
    "price_desc": (col(Car.price).desc(),),
    "year_desc": (col(Car.year).desc(),),
    "year_asc": (col(Car.year).asc(),),
    "mileage_asc": (col(Car.mileage).asc(),),
}


def sort_images(images: list[CarImage]) -> list[CarImage]:
    """Primary image first, then the manual display order, then a stable tiebreak."""
    return sorted(
        images,
        key=lambda image: (not image.is_primary, image.display_order, str(image.id)),
    )


def to_public(car: Car, base_url: str) -> CarPublic:
    """Build the API representation of a car with a full URL for every image."""
    return CarPublic(
        id=car.id,
        title=car.title,
        make=car.make,
        model=car.model,
        year=car.year,
        price=car.price,
        mileage=car.mileage,
        engine=car.engine,
        transmission=car.transmission,
        exterior_color=car.exterior_color,
        interior_color=car.interior_color,
        vin=car.vin,
        description=car.description,
        is_featured=car.is_featured,
        is_sold=car.is_sold,
        created_at=car.created_at,
        created_by_id=car.created_by_id,
        created_by=UserPublic.model_validate(car.created_by)
        if car.created_by is not None
        else None,
        images=[public_image(image, base_url) for image in sort_images(car.images)],
    )


def get_car_or_404(
    session: SessionDep, car_id: uuid.UUID, *, eager: bool = True
) -> Car:
    statement = select(Car).where(Car.id == car_id)
    if eager:
        statement = statement.options(
            selectinload(Car.images), selectinload(Car.created_by)
        )
    car = session.exec(statement).one_or_none()
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    return car


def ensure_can_manage(car: Car, current_user: CurrentUser) -> None:
    """Only the uploader or a superuser may change a listing."""
    if not current_user.is_superuser and car.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")


def apply_filters(
    statement: Any,
    count_statement: Any,
    *,
    make: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    year: int | None = None,
    is_featured: bool | None = None,
    is_sold: bool | None = None,
    created_by_id: uuid.UUID | None = None,
    search: str | None = None,
) -> tuple[Any, Any]:
    """Apply the shared filter set to both the listing and the count query."""
    for value, column in (
        (make, Car.make),
        (year, Car.year),
        (is_featured, Car.is_featured),
        (is_sold, Car.is_sold),
        (created_by_id, Car.created_by_id),
    ):
        if value is not None:
            statement = statement.where(column == value)
            count_statement = count_statement.where(column == value)

    if min_price is not None:
        statement = statement.where(Car.price >= min_price)
        count_statement = count_statement.where(Car.price >= min_price)
    if max_price is not None:
        statement = statement.where(Car.price <= max_price)
        count_statement = count_statement.where(Car.price <= max_price)
    if search:
        pattern = f"%{search}%"
        condition = col(Car.title).ilike(pattern) | col(Car.make).ilike(pattern)
        condition = condition | col(Car.model).ilike(pattern)
        condition = condition | col(Car.vin).ilike(pattern)
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)

    return statement, count_statement


# Registered without a trailing slash so it is never shadowed by "/{car_id}",
# which would try to parse "makes" as a UUID.
@router.get("/makes", response_model=list[str])
@router.get("/makes/", response_model=list[str], include_in_schema=False)
def read_makes(session: SessionDep) -> Any:
    """
    List every make currently in stock, for the inventory filter.
    """
    statement = select(Car.make).distinct().order_by(col(Car.make).asc())
    return list(session.exec(statement).all())


@router.get("/", response_model=CarsPublic)
def read_cars(
    session: SessionDep,
    request: Request,
    skip: int = 0,
    limit: int = Query(default=20, ge=1, le=100),
    make: str | None = None,
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    year: int | None = Query(default=None, ge=1886, le=2100),
    is_featured: bool | None = None,
    include_sold: bool = False,
    search: str | None = None,
    sort: CarSort = "newest",
) -> Any:
    """
    Browse the showroom inventory.
    """
    base_url = str(request.base_url)
    statement = select(Car).options(
        selectinload(Car.images), selectinload(Car.created_by)
    )
    count_statement = select(func.count()).select_from(Car)

    # Sold vehicles stay hidden from the public showroom unless asked for.
    if not include_sold:
        statement = statement.where(Car.is_sold.is_(False))
        count_statement = count_statement.where(Car.is_sold.is_(False))

    statement, count_statement = apply_filters(
        statement,
        count_statement,
        make=make,
        min_price=min_price,
        max_price=max_price,
        year=year,
        is_featured=is_featured,
        search=search,
    )

    count = session.exec(count_statement).one()
    statement = statement.order_by(*SORT_COLUMNS[sort]).offset(skip).limit(limit)
    cars = session.exec(statement).all()
    return CarsPublic(data=[to_public(car, base_url) for car in cars], count=count)


@router.get("/{car_id}", response_model=CarPublic)
def read_car(session: SessionDep, request: Request, car_id: uuid.UUID) -> Any:
    """
    View a single vehicle with its full gallery.
    """
    return to_public(get_car_or_404(session, car_id), str(request.base_url))


@router.post("/", response_model=CarPublic)
def create_car(
    *,
    session: SessionDep,
    request: Request,
    current_user: CurrentUser,
    car_in: CarCreate,
) -> Any:
    """
    Add a vehicle to the inventory.
    """
    car = Car.model_validate(car_in, update={"created_by_id": current_user.id})
    session.add(car)
    session.commit()
    return to_public(get_car_or_404(session, car.id), str(request.base_url))


@router.patch("/{car_id}", response_model=CarPublic)
def update_car(
    *,
    session: SessionDep,
    request: Request,
    current_user: CurrentUser,
    car_id: uuid.UUID,
    car_in: CarUpdate,
) -> Any:
    """
    Edit a listing you own.
    """
    car = get_car_or_404(session, car_id)
    ensure_can_manage(car, current_user)
    car.sqlmodel_update(car_in.model_dump(exclude_unset=True))
    session.add(car)
    session.commit()
    return to_public(get_car_or_404(session, car_id), str(request.base_url))


@router.delete("/{car_id}", response_model=Message)
def delete_car(
    session: SessionDep, current_user: CurrentUser, car_id: uuid.UUID
) -> Message:
    """
    Withdraw a listing you own.
    """
    car = get_car_or_404(session, car_id)
    ensure_can_manage(car, current_user)
    session.delete(car)
    session.commit()
    return Message(message="Vehicle deleted successfully")


@router.post("/{car_id}/images", response_model=list[CarImagePublic])
def upload_car_images(
    *,
    session: SessionDep,
    request: Request,
    current_user: CurrentUser,
    car_id: uuid.UUID,
    files: list[UploadFile] = File(...),
) -> Any:
    """
    Attach one or more photos to a vehicle.
    """
    car = get_car_or_404(session, car_id)
    ensure_can_manage(car, current_user)

    base_url = str(request.base_url)
    start_order = max((image.display_order for image in car.images), default=-1) + 1
    has_primary = any(image.is_primary for image in car.images)

    created: list[CarImage] = []
    for offset, file in enumerate(files):
        image = CarImage(
            car_id=car.id,
            image_url=save_upload(file),
            is_primary=not has_primary and offset == 0,
            display_order=start_order + offset,
        )
        session.add(image)
        created.append(image)

    session.commit()
    for image in created:
        session.refresh(image)
    return [public_image(image, base_url) for image in created]


@router.delete("/{car_id}/images/{image_id}", response_model=Message)
def delete_car_image(
    session: SessionDep,
    current_user: CurrentUser,
    car_id: uuid.UUID,
    image_id: uuid.UUID,
) -> Message:
    """
    Remove a single photo from a vehicle.
    """
    car = get_car_or_404(session, car_id)
    ensure_can_manage(car, current_user)

    image = session.get(CarImage, image_id)
    if image is None or image.car_id != car.id:
        raise HTTPException(status_code=404, detail="Image not found")

    was_primary = image.is_primary
    url = image.image_url
    session.delete(image)
    session.commit()
    delete_image_file(url)

    # Never leave a gallery without a primary thumbnail.
    if was_primary and car.images:
        replacement = sort_images(car.images)[0]
        replacement.is_primary = True
        session.add(replacement)
        session.commit()

    return Message(message="Image deleted successfully")


@router.post(
    "/{car_id}/inquiries",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
)
def create_inquiry(
    session: SessionDep, car_id: uuid.UUID, inquiry_in: CarInquiryCreate
) -> Message:
    """
    Register interest in a vehicle from the public showroom.

    The vehicle comes from the path, so clients only post their contact details.
    """
    car = get_car_or_404(session, car_id, eager=False)

    session.add(CarInquiry(car_id=car.id, **inquiry_in.model_dump()))
    session.commit()

    if settings.emails_enabled and inquiry_in.email:
        subject = f"Private viewing request: {car.title}"
        html_content = (
            f"<p>A client requested a private viewing of "
            f"<strong>{car.title}</strong>.</p>"
            f"<p>Name: {inquiry_in.name}</p>"
            f"<p>Email: {inquiry_in.email}</p>"
            f"<p>Phone: {inquiry_in.phone or 'n/a'}</p>"
            f"<p>{inquiry_in.message or ''}</p>"
        )
        send_email(
            email_to=inquiry_in.email,
            subject=subject,
            html_content=html_content,
        )

    return Message(message="Thank you, our concierge will be in touch shortly")
