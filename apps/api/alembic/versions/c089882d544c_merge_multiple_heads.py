"""merge multiple heads

Revision ID: c089882d544c
Revises: 1a2b3c4d5e67, d4f6f1f5e9ac, 5d6f3a2c1b90
Create Date: 2025-10-21 21:56:18.367603

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c089882d544c'
down_revision: Union[str, None] = ('1a2b3c4d5e67', 'd4f6f1f5e9ac', '5d6f3a2c1b90')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

