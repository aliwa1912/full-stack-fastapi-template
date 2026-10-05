"""Helpers for storing and serving vehicle photos on the local filesystem."""

import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.models import CarImage, CarImagePublic

# Uploaded photos live next to the app, outside the packaged frontend build.
UPLOADS_DIR = Path(__file__).parent.parent / "static" / "uploads"
UPLOADS_URL_PREFIX = "/uploads"

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


def ensure_uploads_dir() -> Path:
    """Create the uploads directory if it does not exist yet."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOADS_DIR


def save_upload(file: UploadFile) -> str:
    """
    Persist an uploaded image and return the relative URL stored in the database.

    Files are renamed to a UUID plus the extension of the detected content type so
    that user supplied names can never escape the uploads directory.
    """
    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported image type '{file.content_type}'. "
                f"Allowed types: {', '.join(sorted(ALLOWED_IMAGE_TYPES))}."
            ),
        )

    directory = ensure_uploads_dir()
    filename = f"{uuid.uuid4()}{extension}"
    destination = directory / filename

    with destination.open("wb") as target:
        shutil.copyfileobj(file.file, target, length=1024 * 1024)

    if destination.stat().st_size > MAX_UPLOAD_BYTES:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit.",
        )

    return f"{UPLOADS_URL_PREFIX}/{filename}"


def to_absolute_url(base_url: str, url: str) -> str:
    """
    Expand a stored image URL into a full URL the browser can load.

    Absolute URLs are returned untouched, so externally hosted media keeps working.
    """
    if url.startswith(("http://", "https://", "//")):
        return url
    return f"{base_url.rstrip('/')}/{url.lstrip('/')}"


def public_image(image: CarImage, base_url: str) -> CarImagePublic:
    """Build the API representation of a single image with a full URL."""
    return CarImagePublic(
        id=image.id,
        car_id=image.car_id,
        image_url=to_absolute_url(base_url, image.image_url),
        is_primary=image.is_primary,
        display_order=image.display_order,
    )


def delete_image_file(image_url: str) -> None:
    """Remove an image from disk, ignoring anything outside the uploads directory."""
    if image_url.startswith(("http://", "https://", "//")):
        return
    relative = image_url.removeprefix(UPLOADS_URL_PREFIX).lstrip("/")
    if not relative:
        return
    target = (UPLOADS_DIR / relative).resolve()
    # Guard against path traversal coming from the database.
    if target.is_relative_to(UPLOADS_DIR.resolve()) and target.is_file():
        target.unlink()
