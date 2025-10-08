"""Extend product with nutrition, quantity, categories and flags; add product_nutrition

Revision ID: 3a9b2c1addf0
Revises: 2e56f4bddd34
Create Date: 2025-10-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a9b2c1addf0'
down_revision: Union[str, None] = '2e56f4bddd34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Helper to add a column if it does not exist
    def add_col_if_missing(table: str, column: sa.Column) -> None:
        cols = [c['name'] for c in inspector.get_columns(table)]
        if column.name not in cols:
            op.add_column(table, column)

    # Product new columns (idempotent)
    add_col_if_missing('product', sa.Column('nutriscore_grade', sa.String(length=10), nullable=True))
    add_col_if_missing('product', sa.Column('nutriscore_score', sa.Integer(), nullable=True))
    add_col_if_missing('product', sa.Column('quantity_raw', sa.String(length=100), nullable=True))
    add_col_if_missing('product', sa.Column('quantity_amount', sa.DECIMAL(precision=10, scale=3), nullable=True))
    add_col_if_missing('product', sa.Column('quantity_unit', sa.String(length=20), nullable=True))
    add_col_if_missing('product', sa.Column('categories_text', sa.Text(), nullable=True))
    add_col_if_missing('product', sa.Column('has_allergens', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    add_col_if_missing('product', sa.Column('has_traces', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    add_col_if_missing('product', sa.Column('has_ingredients', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    add_col_if_missing('product', sa.Column('has_nutrition', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    add_col_if_missing('product', sa.Column('is_complete', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    add_col_if_missing('product', sa.Column('allergen_data_incomplete', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # New product_nutrition table (idempotent)
    if 'product_nutrition' not in inspector.get_table_names():
        op.create_table(
            'product_nutrition',
            sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=False),
            sa.Column('fat_100g', sa.DECIMAL(precision=10, scale=3), nullable=True),
            sa.Column('saturated_fat_100g', sa.DECIMAL(precision=10, scale=3), nullable=True),
            sa.Column('carbohydrates_100g', sa.DECIMAL(precision=10, scale=3), nullable=True),
            sa.Column('sugars_100g', sa.DECIMAL(precision=10, scale=3), nullable=True),
            sa.Column('fiber_100g', sa.DECIMAL(precision=10, scale=3), nullable=True),
            sa.Column('proteins_100g', sa.DECIMAL(precision=10, scale=3), nullable=True),
            sa.Column('salt_100g', sa.DECIMAL(precision=10, scale=3), nullable=True),
            sa.ForeignKeyConstraint(['product_id'], ['product.id']),
            sa.UniqueConstraint('product_id')
        )


def downgrade() -> None:
    op.drop_table('product_nutrition')
    op.drop_column('product', 'allergen_data_incomplete')
    op.drop_column('product', 'is_complete')
    op.drop_column('product', 'has_nutrition')
    op.drop_column('product', 'has_ingredients')
    op.drop_column('product', 'has_traces')
    op.drop_column('product', 'has_allergens')
    op.drop_column('product', 'categories_text')
    op.drop_column('product', 'quantity_unit')
    op.drop_column('product', 'quantity_amount')
    op.drop_column('product', 'quantity_raw')
    op.drop_column('product', 'nutriscore_score')
    op.drop_column('product', 'nutriscore_grade')


