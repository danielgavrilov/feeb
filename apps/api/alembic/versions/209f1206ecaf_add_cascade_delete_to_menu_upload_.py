"""add_cascade_delete_to_menu_upload_restaurant_fk

Revision ID: 209f1206ecaf
Revises: 1ae9fa3556a6
Create Date: 2025-10-22 16:05:16.723846

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '209f1206ecaf'
down_revision: Union[str, None] = '1ae9fa3556a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing foreign key constraint and recreate with CASCADE
    with op.batch_alter_table('menu_upload', schema=None) as batch_op:
        batch_op.drop_constraint('menu_upload_restaurant_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'menu_upload_restaurant_id_fkey',
            'restaurant',
            ['restaurant_id'],
            ['id'],
            ondelete='CASCADE'
        )


def downgrade() -> None:
    # Restore original foreign key without CASCADE
    with op.batch_alter_table('menu_upload', schema=None) as batch_op:
        batch_op.drop_constraint('menu_upload_restaurant_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'menu_upload_restaurant_id_fkey',
            'restaurant',
            ['restaurant_id'],
            ['id']
        )

