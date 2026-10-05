"""add inquiry handling fields

Revision ID: f3a91c47de02
Revises: cb3c39df8be5
Create Date: 2026-10-04 12:00:00.000000

"""

import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

# revision identifiers, used by Alembic.
revision = "f3a91c47de02"
down_revision = "cb3c39df8be5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # A server default is required because existing rows are not nullable.
    op.add_column(
        "carinquiry",
        sa.Column(
            "is_read", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.add_column(
        "carinquiry",
        sa.Column(
            "notes", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True
        ),
    )


def downgrade() -> None:
    op.drop_column("carinquiry", "notes")
    op.drop_column("carinquiry", "is_read")