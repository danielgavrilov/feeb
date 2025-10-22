"""merge_migration_heads_for_cascade_delete

Revision ID: 1ae9fa3556a6
Revises: 74c3b2166d1b, e8d42f25c6a4
Create Date: 2025-10-22 16:05:13.069835

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ae9fa3556a6'
down_revision: Union[str, None] = ('74c3b2166d1b', 'e8d42f25c6a4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

