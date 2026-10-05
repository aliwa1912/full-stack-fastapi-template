"""add car inquiry table

Revision ID: cb3c39df8be5
Revises: 36f593fef00b
Create Date: 2026-10-01 10:51:30.598506

"""

import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

# revision identifiers, used by Alembic.
revision = "cb3c39df8be5"
down_revision = "36f593fef00b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "carinquiry",
        sa.Column(
            "name", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False
        ),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "phone", sqlmodel.sql.sqltypes.AutoString(length=60), nullable=True
        ),
        sa.Column(
            "message", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("car_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["car_id"], ["car.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_carinquiry_car_id"), "carinquiry", ["car_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_carinquiry_car_id"), table_name="carinquiry")
    op.drop_table("carinquiry")