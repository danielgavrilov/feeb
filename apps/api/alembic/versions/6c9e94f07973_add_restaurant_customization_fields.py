"""add restaurant customization fields

Revision ID: 6c9e94f07973
Revises: c089882d544c
Create Date: 2025-10-22 10:51:51.246689

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c9e94f07973'
down_revision: Union[str, None] = 'c089882d544c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add customization columns to restaurant table
    op.add_column('restaurant', sa.Column('logo_data_url', sa.Text(), nullable=True))
    op.add_column('restaurant', sa.Column('primary_color', sa.String(7), nullable=True))
    op.add_column('restaurant', sa.Column('accent_color', sa.String(7), nullable=True))


def downgrade() -> None:
    # Remove customization columns from restaurant table
    op.drop_column('restaurant', 'accent_color')
    op.drop_column('restaurant', 'primary_color')
    op.drop_column('restaurant', 'logo_data_url')

