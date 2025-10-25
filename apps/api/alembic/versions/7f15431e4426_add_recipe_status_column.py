"""add_recipe_status_column

Revision ID: 7f15431e4426
Revises: 215364f28133
Create Date: 2025-10-25 19:54:16.390660

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f15431e4426'
down_revision: Union[str, None] = '215364f28133'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status column with default value
    op.add_column('recipe', sa.Column('status', sa.String(length=20), nullable=False, server_default='needs_review'))
    
    # Add CHECK constraint for valid status values
    op.create_check_constraint(
        'ck_recipe_status',
        'recipe',
        "status IN ('needs_review', 'confirmed', 'live')"
    )
    
    # Migrate existing data based on current boolean values
    # Priority: is_on_menu takes precedence (live status)
    op.execute("""
        UPDATE recipe 
        SET status = CASE 
            WHEN is_on_menu = true THEN 'live'
            WHEN is_on_menu = false AND confirmed = true THEN 'confirmed'
            ELSE 'needs_review'
        END
    """)
    
    # Drop old columns
    op.drop_column('recipe', 'is_on_menu')
    op.drop_column('recipe', 'confirmed')


def downgrade() -> None:
    # Re-add old boolean columns
    op.add_column('recipe', sa.Column('confirmed', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('recipe', sa.Column('is_on_menu', sa.Boolean(), nullable=False, server_default='false'))
    
    # Migrate data back from status to boolean columns
    op.execute("""
        UPDATE recipe 
        SET 
            confirmed = CASE WHEN status IN ('confirmed', 'live') THEN true ELSE false END,
            is_on_menu = CASE WHEN status = 'live' THEN true ELSE false END
    """)
    
    # Drop status column and its constraint
    op.drop_constraint('ck_recipe_status', 'recipe', type_='check')
    op.drop_column('recipe', 'status')

