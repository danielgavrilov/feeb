"""add recipe menu status

Revision ID: c3a9090d5a1b
Revises: b9b11e1ba4ff
Create Date: 2024-05-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3a9090d5a1b"
down_revision = "b9b11e1ba4ff"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "recipe",
        sa.Column("is_on_menu", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("recipe", "is_on_menu", server_default=None)


def downgrade() -> None:
    op.drop_column("recipe", "is_on_menu")
