import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list[Item] = Relationship(back_populates="owner", cascade_delete=True)
    cars: list[Car] = Relationship(back_populates="created_by", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Shared properties
class CarBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    make: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    year: int = Field(ge=1886, le=2100)
    # Prices are stored as whole currency units to avoid float rounding.
    price: int = Field(ge=0)
    mileage: int = Field(default=0, ge=0)
    engine: str | None = Field(default=None, max_length=120)
    transmission: str | None = Field(default=None, max_length=60)
    exterior_color: str | None = Field(default=None, max_length=60)
    interior_color: str | None = Field(default=None, max_length=60)
    vin: str | None = Field(default=None, max_length=17)
    description: str | None = Field(default=None)
    is_featured: bool = False
    is_sold: bool = False


# Properties to receive via API on creation
class CarCreate(CarBase):
    pass


# Properties to receive via API on update, all are optional
class CarUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    make: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    year: int | None = Field(default=None, ge=1886, le=2100)
    price: int | None = Field(default=None, ge=0)
    mileage: int | None = Field(default=None, ge=0)
    engine: str | None = Field(default=None, max_length=120)
    transmission: str | None = Field(default=None, max_length=60)
    exterior_color: str | None = Field(default=None, max_length=60)
    interior_color: str | None = Field(default=None, max_length=60)
    vin: str | None = Field(default=None, max_length=17)
    description: str | None = Field(default=None)
    is_featured: bool | None = None
    is_sold: bool | None = None


# Database model, database table inferred from class name
class Car(CarBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    created_by_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_by: User | None = Relationship(back_populates="cars")
    images: list[CarImage] = Relationship(back_populates="car", cascade_delete=True)
    inquiries: list[CarInquiry] = Relationship(
        back_populates="car", cascade_delete=True
    )


# Properties to return via API, id is always required
class CarPublic(CarBase):
    id: uuid.UUID
    created_at: datetime | None = None
    created_by_id: uuid.UUID
    created_by: UserPublic | None = None
    images: list[CarImagePublic] = Field(default_factory=list)


class CarsPublic(SQLModel):
    data: list[CarPublic]
    count: int


# Shared properties
class CarImageBase(SQLModel):
    image_url: str = Field(min_length=1, max_length=1024)
    is_primary: bool = False
    display_order: int = Field(default=0, ge=0)


class CarImageCreate(CarImageBase):
    pass


class CarImageUpdate(SQLModel):
    image_url: str | None = Field(default=None, min_length=1, max_length=1024)
    is_primary: bool | None = None
    display_order: int | None = Field(default=None, ge=0)


# Database model, database table inferred from class name
class CarImage(CarImageBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    car_id: uuid.UUID = Field(
        foreign_key="car.id", nullable=False, ondelete="CASCADE", index=True
    )
    car: Car | None = Relationship(back_populates="images")


class CarImagePublic(CarImageBase):
    id: uuid.UUID
    car_id: uuid.UUID


# Reorder request: the image ids in their intended display order.
class CarImageReorder(SQLModel):
    image_ids: list[uuid.UUID]


# Shared properties
class SiteSettingsBase(SQLModel):
    dealership_name: str | None = Field(default=None, max_length=120)
    hero_headline: str | None = Field(default=None, max_length=255)
    hero_subheadline: str | None = Field(default=None, max_length=255)
    hero_image_url: str | None = Field(default=None, max_length=1024)
    hero_video_url: str | None = Field(default=None, max_length=1024)
    contact_email: EmailStr | None = Field(default=None)
    contact_phone: str | None = Field(default=None, max_length=60)
    address: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class SiteSettingsUpdate(SiteSettingsBase):
    pass


class SiteSettings(SiteSettingsBase, table=True):
    # Singleton row, the id never changes.
    id: uuid.UUID = Field(default_factory=lambda: uuid.UUID(int=0), primary_key=True)
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class SiteSettingsPublic(SiteSettingsBase):
    id: uuid.UUID
    updated_at: datetime | None = None


# Inquiry sent from the public car detail page.
class CarInquiryBase(SQLModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=60)
    message: str | None = Field(default=None, max_length=2000)


class CarInquiryCreate(CarInquiryBase):
    pass


# Properties to receive via API on update, all are optional
class CarInquiryUpdate(SQLModel):
    is_read: bool | None = None
    notes: str | None = Field(default=None, max_length=2000)


class CarInquiry(CarInquiryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    car_id: uuid.UUID = Field(foreign_key="car.id", ondelete="CASCADE", index=True)
    # Concierge handling state, driven from the admin dashboard.
    is_read: bool = False
    notes: str | None = Field(default=None, max_length=2000)
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    car: Car | None = Relationship(back_populates="inquiries")


# Just enough of the listing to identify it next to a lead.
class CarInquiryCarPublic(SQLModel):
    id: uuid.UUID
    title: str
    make: str
    model: str
    year: int


# Properties to return via API, id is always required
class CarInquiryPublic(CarInquiryBase):
    id: uuid.UUID
    car_id: uuid.UUID
    is_read: bool
    notes: str | None = None
    created_at: datetime
    car: CarInquiryCarPublic | None = None


class CarInquiriesPublic(SQLModel):
    data: list[CarInquiryPublic]
    count: int
    # Unread leads matching the filters, used for the sidebar badge.
    new_count: int


# Site-wide counters for the admin overview.
class AdminStatsPublic(SQLModel):
    total_cars: int
    available_cars: int
    sold_cars: int
    featured_cars: int
    total_users: int
    total_inquiries: int
    new_inquiries: int


# Sorting options accepted by the public inventory listing
CarSort = Literal[
    "newest",
    "oldest",
    "price_asc",
    "price_desc",
    "year_desc",
    "year_asc",
    "mileage_asc",
]


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
