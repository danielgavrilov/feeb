"""add last_modified_at to product

Revision ID: 7c2f7b4f6de0
Revises: 2e56f4bddd34
Create Date: 2025-02-15 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c2f7b4f6de0"
down_revision: Union[str, None] = "2e56f4bddd34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("product", sa.Column("last_modified_at", sa.TIMESTAMP(), nullable=True))


def downgrade() -> None:
    op.drop_column("product", "last_modified_at")
