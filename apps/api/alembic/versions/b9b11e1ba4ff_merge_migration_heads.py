"""Merge migration heads

Revision ID: b9b11e1ba4ff
Revises: 3a9b2c1addf0, 7c2f7b4f6de0
Create Date: 2025-10-14 16:46:31.211608

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9b11e1ba4ff'
down_revision: Union[str, None] = ('3a9b2c1addf0', '7c2f7b4f6de0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

