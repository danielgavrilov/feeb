"""add menu upload pipeline"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d6f3a2c1b90'
down_revision: Union[str, None] = '28c54b56fa4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('recipe', sa.Column('options', sa.Text(), nullable=True))
    op.add_column('recipe', sa.Column('special_notes', sa.Text(), nullable=True))
    op.add_column('recipe', sa.Column('prominence_score', sa.Float(), nullable=True))
    op.add_column('recipe', sa.Column('confirmed', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    op.add_column('recipe_ingredient', sa.Column('allergens', sa.Text(), nullable=True))
    op.add_column('recipe_ingredient', sa.Column('confirmed', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    op.create_table(
        'menu_upload',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('restaurant_id', sa.Integer(), sa.ForeignKey('restaurant.id'), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('app_user.id'), nullable=True),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_value', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('stage0_completed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('stage1_completed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('stage2_completed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=True),
    )

    op.create_table(
        'menu_upload_stage',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('menu_upload_id', sa.Integer(), sa.ForeignKey('menu_upload.id'), nullable=False),
        sa.Column('stage', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('completed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.UniqueConstraint('menu_upload_id', 'stage', name='uq_menu_upload_stage'),
    )

    op.create_table(
        'menu_upload_recipe',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('menu_upload_id', sa.Integer(), sa.ForeignKey('menu_upload.id'), nullable=False),
        sa.Column('recipe_id', sa.Integer(), sa.ForeignKey('recipe.id'), nullable=False),
        sa.Column('stage', sa.String(length=50), nullable=False, server_default='stage_1'),
        sa.UniqueConstraint('menu_upload_id', 'recipe_id', name='uq_menu_upload_recipe'),
    )


def downgrade() -> None:
    op.drop_table('menu_upload_recipe')
    op.drop_table('menu_upload_stage')
    op.drop_table('menu_upload')

    op.drop_column('recipe_ingredient', 'confirmed')
    op.drop_column('recipe_ingredient', 'allergens')

    op.drop_column('recipe', 'confirmed')
    op.drop_column('recipe', 'prominence_score')
    op.drop_column('recipe', 'special_notes')
    op.drop_column('recipe', 'options')
