"""
Data Access Layer (DAL) for ingredient and allergen queries.
All functions use SQLAlchemy async sessions and return Pydantic models.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from .models import (
    Ingredient, Allergen, IngredientAllergen, Product, ProductIngredient, ProductAllergen,
    IngredientWithAllergens, IngredientResponse, AllergenResponse,
    ProductWithDetails, ProductResponse, ProductIngredientResponse, ProductAllergenResponse
)


async def get_ingredient_by_name(
    session: AsyncSession, 
    name: str, 
    exact: bool = False
) -> Optional[IngredientWithAllergens]:
    """
    Retrieve ingredient by name with associated allergens.
    
    Args:
        session: Database session
        name: Ingredient name to search for
        exact: If True, exact match; if False, case-insensitive partial match
    
    Returns:
        IngredientWithAllergens object or None if not found
    """
    # Build query
    if exact:
        query = select(Ingredient).where(Ingredient.name == name)
    else:
        query = select(Ingredient).where(Ingredient.name.ilike(f"%{name}%"))
    
    # Eager load allergen relationships
    query = query.options(
        selectinload(Ingredient.allergens).selectinload(IngredientAllergen.allergen)
    )
    
    # For fuzzy search, limit to first result
    if not exact:
        query = query.limit(1)
    
    result = await session.execute(query)
    ingredient = result.scalars().first() if not exact else result.scalar_one_or_none()
    
    if not ingredient:
        return None
    
    # Build response
    allergens = [
        AllergenResponse(
            code=ia.allergen.code,
            name=ia.allergen.name,
            certainty=ia.certainty
        )
        for ia in ingredient.allergens
    ]
    
    return IngredientWithAllergens(
        ingredient=IngredientResponse(
            code=ingredient.code,
            name=ingredient.name,
            source=ingredient.source,
            last_updated=ingredient.last_updated
        ),
        allergens=allergens
    )


async def get_product_by_barcode(
    session: AsyncSession, 
    barcode: str
) -> Optional[ProductWithDetails]:
    """
    Retrieve product by barcode with ingredients and allergens.
    
    Args:
        session: Database session
        barcode: Product barcode (EAN/UPC)
    
    Returns:
        ProductWithDetails object or None if not found
    """
    # Build query with eager loading
    query = select(Product).where(Product.barcode == barcode)
    query = query.options(
        selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient),
        selectinload(Product.allergens).selectinload(ProductAllergen.allergen)
    )
    
    result = await session.execute(query)
    product = result.scalar_one_or_none()
    
    if not product:
        return None
    
    # Build ingredients list, sorted by rank
    ingredients = [
        ProductIngredientResponse(
            name=pi.ingredient.name,
            rank=pi.rank
        )
        for pi in sorted(product.ingredients, key=lambda x: x.rank or 999)
    ]
    
    # Build allergens list
    allergens = [
        ProductAllergenResponse(
            name=pa.allergen.name,
            relation_type=pa.relation_type
        )
        for pa in product.allergens
    ]
    
    return ProductWithDetails(
        product=ProductResponse(
            barcode=product.barcode,
            name=product.name,
            brand=product.brand
        ),
        ingredients=ingredients,
        allergens=allergens
    )


async def insert_allergen(
    session: AsyncSession,
    code: str,
    name: str,
    category: Optional[str] = None
) -> int:
    """
    Insert or update allergen (UPSERT on code).
    
    Args:
        session: Database session
        code: Allergen code (e.g., "en:gluten")
        name: Display name
        category: Optional category classification
    
    Returns:
        Allergen ID
    """
    # Check if exists
    result = await session.execute(
        select(Allergen).where(Allergen.code == code)
    )
    allergen = result.scalar_one_or_none()
    
    if allergen:
        # Update existing
        allergen.name = name
        if category:
            allergen.category = category
    else:
        # Insert new
        allergen = Allergen(code=code, name=name, category=category)
        session.add(allergen)
    
    await session.flush()
    return allergen.id


async def insert_ingredient(
    session: AsyncSession,
    code: str,
    name: str,
    parent_code: Optional[str] = None,
    allergen_code: Optional[str] = None,
    source: str = "off"
) -> int:
    """
    Insert or update ingredient (UPSERT on code).
    
    Args:
        session: Database session
        code: Ingredient code (e.g., "en:wheat-flour")
        name: Display name
        parent_code: Optional parent ingredient code
        allergen_code: Optional direct allergen link
        source: Data source (default: "off")
    
    Returns:
        Ingredient ID
    """
    # Check if exists
    result = await session.execute(
        select(Ingredient).where(Ingredient.code == code)
    )
    ingredient = result.scalar_one_or_none()
    
    if ingredient:
        # Update existing
        ingredient.name = name
        ingredient.parent_code = parent_code
        ingredient.allergen_code = allergen_code
        ingredient.source = source
    else:
        # Insert new
        ingredient = Ingredient(
            code=code,
            name=name,
            parent_code=parent_code,
            allergen_code=allergen_code,
            source=source
        )
        session.add(ingredient)
    
    await session.flush()
    return ingredient.id


async def link_ingredient_allergen(
    session: AsyncSession,
    ingredient_id: int,
    allergen_id: int,
    certainty: str = "direct",
    source: str = "off"
) -> None:
    """
    Create ingredient-allergen link (UPSERT).
    
    Args:
        session: Database session
        ingredient_id: Ingredient ID
        allergen_id: Allergen ID
        certainty: Certainty level ("direct", "inferred", "possible")
        source: Data source (default: "off")
    """
    # Check if exists
    result = await session.execute(
        select(IngredientAllergen).where(
            IngredientAllergen.ingredient_id == ingredient_id,
            IngredientAllergen.allergen_id == allergen_id,
            IngredientAllergen.source == source
        )
    )
    link = result.scalar_one_or_none()
    
    if link:
        # Update certainty
        link.certainty = certainty
    else:
        # Insert new
        link = IngredientAllergen(
            ingredient_id=ingredient_id,
            allergen_id=allergen_id,
            certainty=certainty,
            source=source
        )
        session.add(link)
    
    await session.flush()


async def insert_product(
    session: AsyncSession,
    barcode: str,
    name: str,
    brand: Optional[str] = None,
    lang: str = "en",
    last_modified: Optional[datetime] = None
) -> int:
    """
    Insert or update product (UPSERT on barcode).
    
    Args:
        session: Database session
        barcode: Product barcode
        name: Product name
        brand: Optional brand name
        lang: Language code
        last_modified: OFF last modified timestamp (UTC)
    
    Returns:
        Product ID
    """
    # Check if exists
    result = await session.execute(
        select(Product).where(Product.barcode == barcode)
    )
    product = result.scalar_one_or_none()
    
    if product:
        # Update existing
        product.name = name
        product.brand = brand
        product.lang = lang
        if last_modified:
            product.last_modified_at = last_modified
    else:
        # Insert new
        product = Product(
            barcode=barcode,
            name=name,
            brand=brand,
            lang=lang,
            last_modified_at=last_modified
        )
        session.add(product)
    
    await session.flush()
    return product.id


async def link_product_ingredient(
    session: AsyncSession,
    product_id: int,
    ingredient_id: int,
    rank: Optional[int] = None,
    percent_estimate: Optional[float] = None
) -> None:
    """
    Create product-ingredient link (UPSERT).
    
    Args:
        session: Database session
        product_id: Product ID
        ingredient_id: Ingredient ID
        rank: Position in ingredient list
        percent_estimate: Estimated percentage in product
    """
    # Check if exists
    result = await session.execute(
        select(ProductIngredient).where(
            ProductIngredient.product_id == product_id,
            ProductIngredient.ingredient_id == ingredient_id
        )
    )
    link = result.scalar_one_or_none()
    
    if link:
        # Update
        link.rank = rank
        link.percent_estimate = percent_estimate
    else:
        # Insert new
        link = ProductIngredient(
            product_id=product_id,
            ingredient_id=ingredient_id,
            rank=rank,
            percent_estimate=percent_estimate
        )
        session.add(link)
    
    await session.flush()


async def link_product_allergen(
    session: AsyncSession,
    product_id: int,
    allergen_id: int,
    relation_type: str = "contains",
    source: str = "off"
) -> None:
    """
    Create product-allergen link (UPSERT).
    
    Args:
        session: Database session
        product_id: Product ID
        allergen_id: Allergen ID
        relation_type: Relation type ("contains", "may_contain", "traces")
        source: Data source
    """
    # Check if exists
    result = await session.execute(
        select(ProductAllergen).where(
            ProductAllergen.product_id == product_id,
            ProductAllergen.allergen_id == allergen_id,
            ProductAllergen.relation_type == relation_type
        )
    )
    link = result.scalar_one_or_none()
    
    if link:
        # Update source
        link.source = source
    else:
        # Insert new
        link = ProductAllergen(
            product_id=product_id,
            allergen_id=allergen_id,
            relation_type=relation_type,
            source=source
        )
        session.add(link)
    
    await session.flush()


async def get_allergen_by_code(session: AsyncSession, code: str) -> Optional[Allergen]:
    """
    Get allergen by code.
    
    Args:
        session: Database session
        code: Allergen code
    
    Returns:
        Allergen object or None
    """
    result = await session.execute(
        select(Allergen).where(Allergen.code == code)
    )
    return result.scalar_one_or_none()


async def get_ingredient_by_code(session: AsyncSession, code: str) -> Optional[Ingredient]:
    """
    Get ingredient by code.
    
    Args:
        session: Database session
        code: Ingredient code
    
    Returns:
        Ingredient object or None
    """
    result = await session.execute(
        select(Ingredient).where(Ingredient.code == code)
    )
    return result.scalar_one_or_none()

