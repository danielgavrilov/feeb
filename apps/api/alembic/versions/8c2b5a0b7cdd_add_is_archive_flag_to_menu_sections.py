"""Add archive flag to menu sections"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c2b5a0b7cdd"
down_revision: Union[str, None] = "215364f28133"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MENU_SECTION_TABLE = "menu_section"
ARCHIVE_NAME = "Archive"


def upgrade() -> None:
    op.add_column(
        MENU_SECTION_TABLE,
        sa.Column("is_archive", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        sa.text(
            "UPDATE menu_section SET is_archive = TRUE, name = :archive WHERE lower(name) = lower(:archive)"
        ).bindparams(archive=ARCHIVE_NAME)
    )
    op.execute(
        sa.text(
            "UPDATE menu_section SET name = :archive WHERE is_archive = TRUE AND name <> :archive"
        ).bindparams(archive=ARCHIVE_NAME)
    )
    op.create_index(
        "ix_menu_section_is_archive",
        MENU_SECTION_TABLE,
        ["is_archive"],
    )


def downgrade() -> None:
    op.drop_index("ix_menu_section_is_archive", table_name=MENU_SECTION_TABLE)
    op.drop_column(MENU_SECTION_TABLE, "is_archive")
