import uuid
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import selectinload
from sqlmodel import col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.api.routes.cars import (
    SORT_COLUMNS as CAR_SORT_COLUMNS,
)
from app.api.routes.cars import (
    apply_filters,
    get_car_or_404,
    to_public,
)
from app.core.uploads import delete_image_file, public_image, save_upload
from app.models import (
    AdminStatsPublic,
    Car,
    CarImage,
    CarImagePublic,
    CarImageReorder,
    CarInquiriesPublic,
    CarInquiry,
    CarInquiryCarPublic,
    CarInquiryPublic,
    CarInquiryUpdate,
    CarPublic,
    CarSort,
    CarsPublic,
    CarUpdate,
    Message,
    SiteSettings,
    SiteSettingsPublic,
    SiteSettingsUpdate,
    User,
    get_datetime_utc,
)

SITE_SETTINGS_ID = uuid.UUID(int=0)

router = APIRouter(prefix="/admin", tags=["admin"])

# Every route below is superuser only except the public branding read, which the
# showroom needs to render the hero banner.
SuperuserDep = Depends(get_current_active_superuser)


@router.get("/cars/", response_model=CarsPublic, dependencies=[SuperuserDep])
def read_all_cars(
    session: SessionDep,
    request: Request,
    skip: int = 0,
    limit: int = Query(default=50, ge=1, le=200),
    make: str | None = None,
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    year: int | None = Query(default=None, ge=1886, le=2100),
    is_featured: bool | None = None,
    is_sold: bool | None = None,
    created_by_id: uuid.UUID | None = None,
    search: str | None = None,
    sort: CarSort = "newest",
) -> Any:
    """
    List every listing across all sellers, sold ones included.
    """
    base_url = str(request.base_url)
    statement = select(Car).options(
        selectinload(Car.images), selectinload(Car.created_by)
    )
    count_statement = select(func.count()).select_from(Car)

    statement, count_statement = apply_filters(
        statement,
        count_statement,
        make=make,
        min_price=min_price,
        max_price=max_price,
        year=year,
        is_featured=is_featured,
        is_sold=is_sold,
        created_by_id=created_by_id,
        search=search,
    )

    count = session.exec(count_statement).one()
    statement = statement.order_by(*CAR_SORT_COLUMNS[sort]).offset(skip).limit(limit)
    cars = session.exec(statement).all()
    return CarsPublic(data=[to_public(car, base_url) for car in cars], count=count)


@router.patch("/cars/{car_id}", response_model=CarPublic, dependencies=[SuperuserDep])
def admin_update_car(
    *,
    session: SessionDep,
    request: Request,
    car_id: uuid.UUID,
    car_in: CarUpdate,
) -> Any:
    """
    Edit any listing, whoever uploaded it.
    """
    car = get_car_or_404(session, car_id)
    car.sqlmodel_update(car_in.model_dump(exclude_unset=True))
    session.add(car)
    session.commit()
    return to_public(get_car_or_404(session, car_id), str(request.base_url))


@router.delete("/cars/{car_id}", response_model=Message, dependencies=[SuperuserDep])
def admin_delete_car(session: SessionDep, car_id: uuid.UUID) -> Message:
    """
    Remove any listing.
    """
    car = get_car_or_404(session, car_id)
    urls = [image.image_url for image in car.images]
    session.delete(car)
    session.commit()
    for url in urls:
        delete_image_file(url)
    return Message(message="Vehicle deleted successfully")


@router.post(
    "/cars/{car_id}/images",
    response_model=list[CarImagePublic],
    dependencies=[SuperuserDep],
)
def admin_upload_car_images(
    *,
    session: SessionDep,
    request: Request,
    car_id: uuid.UUID,
    files: list[UploadFile] = File(...),
) -> Any:
    """
    Attach photos to any listing.
    """
    car = get_car_or_404(session, car_id)
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


@router.patch(
    "/cars/{car_id}/images/{image_id}",
    response_model=CarImagePublic,
    dependencies=[SuperuserDep],
)
def admin_update_car_image(
    *,
    session: SessionDep,
    request: Request,
    car_id: uuid.UUID,
    image_id: uuid.UUID,
    is_primary: bool | None = None,
    display_order: int | None = Query(default=None, ge=0),
) -> Any:
    """
    Promote a thumbnail or nudge a photo to a new position.
    """
    car = get_car_or_404(session, car_id)
    image = session.get(CarImage, image_id)
    if image is None or image.car_id != car.id:
        raise HTTPException(status_code=404, detail="Image not found")

    if is_primary:
        for other in car.images:
            other.is_primary = other.id == image.id
        session.add(image)
    if display_order is not None:
        image.display_order = display_order

    session.add(image)
    session.commit()
    session.refresh(image)
    return public_image(image, str(request.base_url))


@router.put(
    "/cars/{car_id}/images/reorder",
    response_model=list[CarImagePublic],
    dependencies=[SuperuserDep],
)
def admin_reorder_car_images(
    *,
    session: SessionDep,
    request: Request,
    car_id: uuid.UUID,
    reorder_in: CarImageReorder,
) -> Any:
    """
    Rewrite the gallery order, the first id becomes the primary thumbnail.
    """
    car = get_car_or_404(session, car_id)
    by_id = {image.id: image for image in car.images}
    unknown = [image_id for image_id in reorder_in.image_ids if image_id not in by_id]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Gallery order references unknown images",
        )

    for position, image_id in enumerate(reorder_in.image_ids):
        image = by_id[image_id]
        image.display_order = position
        image.is_primary = position == 0
        session.add(image)

    session.commit()
    # Return the new order, otherwise clients cannot confirm the result.
    ordered = sorted(car.images, key=lambda image: image.display_order)
    return [public_image(image, str(request.base_url)) for image in ordered]


@router.delete(
    "/cars/{car_id}/images/{image_id}",
    response_model=Message,
    dependencies=[SuperuserDep],
)
def admin_delete_car_image(
    session: SessionDep, car_id: uuid.UUID, image_id: uuid.UUID
) -> Message:
    """
    Remove any photo from any listing.
    """
    car = get_car_or_404(session, car_id)
    image = session.get(CarImage, image_id)
    if image is None or image.car_id != car.id:
        raise HTTPException(status_code=404, detail="Image not found")

    was_primary = image.is_primary
    url = image.image_url
    session.delete(image)
    session.commit()
    delete_image_file(url)

    if was_primary and car.images:
        replacement = sorted(
            car.images, key=lambda item: (item.display_order, str(item.id))
        )[0]
        replacement.is_primary = True
        session.add(replacement)
        session.commit()

    return Message(message="Image deleted successfully")


def get_site_settings(session: SessionDep) -> SiteSettings:
    site_settings = session.get(SiteSettings, SITE_SETTINGS_ID)
    if site_settings is None:
        site_settings = SiteSettings(id=SITE_SETTINGS_ID)
        session.add(site_settings)
        session.commit()
        session.refresh(site_settings)
    return site_settings


@router.get("/site-settings", response_model=SiteSettingsPublic)
def read_site_settings(session: SessionDep) -> Any:
    """
    Read the global showroom branding.
    """
    return get_site_settings(session)


@router.put(
    "/site-settings", response_model=SiteSettingsPublic, dependencies=[SuperuserDep]
)
def update_site_settings(
    *, session: SessionDep, settings_in: SiteSettingsUpdate
) -> Any:
    """
    Update the global showroom branding.
    """
    site_settings = get_site_settings(session)
    site_settings.sqlmodel_update(
        settings_in.model_dump(exclude_unset=True), update={"id": site_settings.id}
    )
    site_settings.updated_at = get_datetime_utc()
    session.add(site_settings)
    session.commit()
    session.refresh(site_settings)
    return site_settings


def get_inquiry_or_404(session: SessionDep, inquiry_id: uuid.UUID) -> CarInquiry:
    statement = (
        select(CarInquiry)
        .where(CarInquiry.id == inquiry_id)
        .options(selectinload(CarInquiry.car))
    )
    inquiry = session.exec(statement).one_or_none()
    if inquiry is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return inquiry


def to_inquiry_public(inquiry: CarInquiry) -> CarInquiryPublic:
    return CarInquiryPublic(
        id=inquiry.id,
        car_id=inquiry.car_id,
        name=inquiry.name,
        email=inquiry.email,
        phone=inquiry.phone,
        message=inquiry.message,
        is_read=inquiry.is_read,
        notes=inquiry.notes,
        created_at=inquiry.created_at,
        car=CarInquiryCarPublic(
            id=inquiry.car.id,
            title=inquiry.car.title,
            make=inquiry.car.make,
            model=inquiry.car.model,
            year=inquiry.car.year,
        )
        if inquiry.car is not None
        else None,
    )


@router.get(
    "/inquiries/", response_model=CarInquiriesPublic, dependencies=[SuperuserDep]
)
def read_inquiries(
    session: SessionDep,
    skip: int = 0,
    limit: int = Query(default=50, ge=1, le=200),
    is_read: bool | None = None,
    car_id: uuid.UUID | None = None,
    search: str | None = None,
) -> Any:
    """
    List every lead captured by the public showroom, newest first.
    """
    statement = select(CarInquiry).options(selectinload(CarInquiry.car))
    count_statement = select(func.count()).select_from(CarInquiry)
    new_statement = (
        select(func.count())
        .select_from(CarInquiry)
        .where(CarInquiry.is_read.is_(False))
    )

    for value, column in (
        (is_read, CarInquiry.is_read),
        (car_id, CarInquiry.car_id),
    ):
        if value is not None:
            statement = statement.where(column == value)
            count_statement = count_statement.where(column == value)
            new_statement = new_statement.where(column == value)

    if search:
        pattern = f"%{search}%"
        condition = (
            col(CarInquiry.name).ilike(pattern)
            | col(CarInquiry.email).ilike(pattern)
            | col(CarInquiry.message).ilike(pattern)
        )
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
        new_statement = new_statement.where(condition)

    count = session.exec(count_statement).one()
    new_count = session.exec(new_statement).one()
    statement = (
        statement.order_by(col(CarInquiry.created_at).desc()).offset(skip).limit(limit)
    )
    inquiries = session.exec(statement).all()
    return CarInquiriesPublic(
        data=[to_inquiry_public(inquiry) for inquiry in inquiries],
        count=count,
        new_count=new_count,
    )


@router.patch(
    "/inquiries/{inquiry_id}",
    response_model=CarInquiryPublic,
    dependencies=[SuperuserDep],
)
def admin_update_inquiry(
    *, session: SessionDep, inquiry_id: uuid.UUID, inquiry_in: CarInquiryUpdate
) -> Any:
    """
    Mark a lead as handled and keep the concierge notes.
    """
    inquiry = get_inquiry_or_404(session, inquiry_id)
    inquiry.sqlmodel_update(inquiry_in.model_dump(exclude_unset=True))
    session.add(inquiry)
    session.commit()
    return to_inquiry_public(get_inquiry_or_404(session, inquiry_id))


@router.delete(
    "/inquiries/{inquiry_id}", response_model=Message, dependencies=[SuperuserDep]
)
def admin_delete_inquiry(session: SessionDep, inquiry_id: uuid.UUID) -> Message:
    """
    Discard a lead.
    """
    inquiry = get_inquiry_or_404(session, inquiry_id)
    session.delete(inquiry)
    session.commit()
    return Message(message="Inquiry deleted successfully")


@router.get("/stats/", response_model=AdminStatsPublic, dependencies=[SuperuserDep])
def read_admin_stats(session: SessionDep) -> Any:
    """
    Site-wide counters for the admin overview.
    """

    def count_where(model: Any, *conditions: Any) -> int:
        statement = select(func.count()).select_from(model)
        for condition in conditions:
            statement = statement.where(condition)
        return session.exec(statement).one()

    return AdminStatsPublic(
        total_cars=count_where(Car),
        available_cars=count_where(Car, Car.is_sold.is_(False)),
        sold_cars=count_where(Car, Car.is_sold.is_(True)),
        featured_cars=count_where(Car, Car.is_featured.is_(True)),
        total_users=count_where(User),
        total_inquiries=count_where(CarInquiry),
        new_inquiries=count_where(CarInquiry, CarInquiry.is_read.is_(False)),
    )
