"""
Data Access Layer (DAL) for ingredient and allergen queries.
All functions use SQLAlchemy async sessions and return Pydantic models.
"""


from datetime import datetime
from typing import Optional, Optional as _Optional, Dict, List, Sequence

from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from .models import (
    Ingredient, Allergen, AllergenBadge, IngredientAllergen, Product, ProductIngredient, ProductAllergen,
    ProductNutrition,
    IngredientWithAllergens, IngredientResponse, AllergenResponse, AllergenBadgeResponse,
    ProductWithDetails, ProductResponse, ProductIngredientResponse, ProductAllergenResponse,
    RecipeIngredientSubstitution,
    Menu,
    MenuSection,
    MenuSectionRecipe,
    MenuSectionResponse,
    MenuSectionUpsert,
    Recipe,
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
    last_modified: Optional[datetime] = None,
    # New optional props
    nutriscore_grade: _Optional[str] = None,
    nutriscore_score: _Optional[int] = None,
    quantity_raw: _Optional[str] = None,
    quantity_amount: _Optional[float] = None,
    quantity_unit: _Optional[str] = None,
    categories_text: _Optional[str] = None,
    has_allergens: bool = False,
    has_traces: bool = False,
    has_ingredients: bool = False,
    has_nutrition: bool = False,
    is_complete: bool = False,
    allergen_data_incomplete: bool = False,
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
        product.nutriscore_grade = nutriscore_grade
        product.nutriscore_score = nutriscore_score
        product.quantity_raw = quantity_raw
        product.quantity_amount = quantity_amount
        product.quantity_unit = quantity_unit
        product.categories_text = categories_text
        product.has_allergens = has_allergens
        product.has_traces = has_traces
        product.has_ingredients = has_ingredients
        product.has_nutrition = has_nutrition
        product.is_complete = is_complete
        product.allergen_data_incomplete = allergen_data_incomplete
    else:
        # Insert new
        product = Product(
            barcode=barcode,
            name=name,
            brand=brand,
            lang=lang,
            last_modified_at=last_modified,
            nutriscore_grade=nutriscore_grade,
            nutriscore_score=nutriscore_score,
            quantity_raw=quantity_raw,
            quantity_amount=quantity_amount,
            quantity_unit=quantity_unit,
            categories_text=categories_text,
            has_allergens=has_allergens,
            has_traces=has_traces,
            has_ingredients=has_ingredients,
            has_nutrition=has_nutrition,
            is_complete=is_complete,
            allergen_data_incomplete=allergen_data_incomplete,
        )
        session.add(product)
    
    await session.flush()
    return product.id


async def upsert_product_nutrition(
    session: AsyncSession,
    product_id: int,
    nutrition: Dict[str, _Optional[float]]
) -> None:
    """Upsert product nutrition per 100g/ml."""
    result = await session.execute(
        select(ProductNutrition).where(ProductNutrition.product_id == product_id)
    )
    row = result.scalar_one_or_none()
    if row:
        row.fat_100g = nutrition.get("fat_100g")
        row.saturated_fat_100g = nutrition.get("saturated_fat_100g")
        row.carbohydrates_100g = nutrition.get("carbohydrates_100g")
        row.sugars_100g = nutrition.get("sugars_100g")
        row.fiber_100g = nutrition.get("fiber_100g")
        row.proteins_100g = nutrition.get("proteins_100g")
        row.salt_100g = nutrition.get("salt_100g")
    else:
        row = ProductNutrition(
            product_id=product_id,
            fat_100g=nutrition.get("fat_100g"),
            saturated_fat_100g=nutrition.get("saturated_fat_100g"),
            carbohydrates_100g=nutrition.get("carbohydrates_100g"),
            sugars_100g=nutrition.get("sugars_100g"),
            fiber_100g=nutrition.get("fiber_100g"),
            proteins_100g=nutrition.get("proteins_100g"),
            salt_100g=nutrition.get("salt_100g"),
        )
        session.add(row)
    await session.flush()


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


async def list_allergen_badges(session: AsyncSession) -> List[AllergenBadgeResponse]:
    """Return curated allergen badges with their SVG icons."""

    result = await session.execute(
        select(AllergenBadge).order_by(AllergenBadge.sort_order, AllergenBadge.id)
    )
    badges = result.scalars().all()

    return [
        AllergenBadgeResponse(
            code=badge.code,
            name=badge.name,
            category=badge.category,
            keywords=list(badge.keywords or []),
            icon_svg=badge.icon_svg,
            sort_order=badge.sort_order,
        )
        for badge in badges
    ]


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


# ============================================================================
# Recipe System DAL Functions
# ============================================================================

async def upsert_app_user(
    session: AsyncSession,
    supabase_uid: str,
    email: str,
    name: Optional[str] = None
) -> int:
    """
    Insert or update app user (UPSERT on supabase_uid).
    
    Args:
        session: Database session
        supabase_uid: Supabase user ID
        email: User email
        name: Optional display name
    
    Returns:
        User ID
    """
    from .models import AppUser
    
    result = await session.execute(
        select(AppUser).where(AppUser.supabase_uid == supabase_uid)
    )
    user = result.scalar_one_or_none()
    
    if user:
        # Update existing
        user.email = email
        if name:
            user.name = name
    else:
        # Insert new
        user = AppUser(supabase_uid=supabase_uid, email=email, name=name)
        session.add(user)
    
    await session.flush()
    return user.id


async def get_user_by_supabase_uid(
    session: AsyncSession,
    supabase_uid: str
) -> Optional["AppUser"]:
    """
    Get user by Supabase UID.
    
    Args:
        session: Database session
        supabase_uid: Supabase user ID
    
    Returns:
        AppUser object or None
    """
    from .models import AppUser
    
    result = await session.execute(
        select(AppUser).where(AppUser.supabase_uid == supabase_uid)
    )
    return result.scalar_one_or_none()


async def create_restaurant(
    session: AsyncSession,
    name: str,
    user_id: int,
    description: Optional[str] = None,
    role: str = "owner"
) -> int:
    """
    Create a new restaurant and link to user.
    
    Args:
        session: Database session
        name: Restaurant name
        user_id: User ID to link as owner
        description: Optional description
        role: User's role in restaurant
    
    Returns:
        Restaurant ID
    """
    from .models import Restaurant, UserRestaurant
    
    restaurant = Restaurant(name=name, description=description)
    session.add(restaurant)
    await session.flush()
    
    # Link user to restaurant
    link = UserRestaurant(user_id=user_id, restaurant_id=restaurant.id, role=role)
    session.add(link)
    await session.flush()
    
    return restaurant.id


async def get_user_restaurants(
    session: AsyncSession,
    user_id: int
) -> list:
    """
    Get all restaurants for a user.
    
    Args:
        session: Database session
        user_id: User ID
    
    Returns:
        List of Restaurant objects
    """
    from .models import Restaurant, UserRestaurant
    
    result = await session.execute(
        select(Restaurant)
        .join(UserRestaurant)
        .where(UserRestaurant.user_id == user_id)
    )
    return result.scalars().all()


async def update_restaurant(
    session: AsyncSession,
    restaurant_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    logo_data_url: Optional[str] = None,
    primary_color: Optional[str] = None,
    accent_color: Optional[str] = None
) -> Optional:
    """
    Update restaurant details.
    
    Args:
        session: Database session
        restaurant_id: Restaurant ID
        name: Optional new name
        description: Optional new description
        logo_data_url: Optional logo data URL
        primary_color: Optional primary color (hex)
        accent_color: Optional accent color (hex)
    
    Returns:
        Updated Restaurant object or None if not found
    """
    from .models import Restaurant
    
    result = await session.execute(
        select(Restaurant).where(Restaurant.id == restaurant_id)
    )
    restaurant = result.scalar_one_or_none()
    
    if not restaurant:
        return None
    
    # Update only provided fields
    if name is not None:
        restaurant.name = name
    if description is not None:
        restaurant.description = description
    if logo_data_url is not None:
        restaurant.logo_data_url = logo_data_url
    if primary_color is not None:
        restaurant.primary_color = primary_color
    if accent_color is not None:
        restaurant.accent_color = accent_color
    
    await session.flush()
    return restaurant


async def create_menu(
    session: AsyncSession,
    restaurant_id: int,
    name: str,
    description: Optional[str] = None,
    menu_active: int = 1
) -> int:
    """
    Create a new menu.
    
    Args:
        session: Database session
        restaurant_id: Restaurant ID
        name: Menu name
        description: Optional description
        menu_active: Active status (1 = active, 0 = inactive)
    
    Returns:
        Menu ID
    """
    from .models import Menu
    
    menu = Menu(
        restaurant_id=restaurant_id,
        name=name,
        description=description,
        menu_active=menu_active
    )
    session.add(menu)
    await session.flush()
    return menu.id


async def get_restaurant_menus(
    session: AsyncSession,
    restaurant_id: int
) -> list:
    """
    Get all menus for a restaurant.
    
    Args:
        session: Database session
        restaurant_id: Restaurant ID
    
    Returns:
        List of Menu objects
    """
    from .models import Menu
    
    result = await session.execute(
        select(Menu).where(Menu.restaurant_id == restaurant_id)
    )
    return result.scalars().all()


async def _get_primary_menu(
    session: AsyncSession,
    restaurant_id: int
) -> Menu:
    """Fetch the primary menu for a restaurant, creating one if necessary."""

    result = await session.execute(
        select(Menu)
        .where(Menu.restaurant_id == restaurant_id)
        .order_by(Menu.created_at.asc())
        .limit(1)
    )
    menu = result.scalar_one_or_none()

    if menu:
        return menu

    menu = Menu(
        restaurant_id=restaurant_id,
        name="Main Menu",
        description="",
        menu_active=1,
    )
    session.add(menu)
    await session.flush()
    return menu


async def _ensure_archive_section(
    session: AsyncSession,
    menu: Menu
) -> MenuSection:
    """Ensure the archive section exists for a menu."""

    archive_name = "Archive"
    result = await session.execute(
        select(MenuSection)
        .where(
            MenuSection.menu_id == menu.id,
            func.lower(MenuSection.name) == archive_name.lower(),
        )
        .limit(1)
    )
    archive = result.scalar_one_or_none()

    if archive:
        if archive.position is None:
            archive.position = 9999
        return archive

    archive = MenuSection(
        menu_id=menu.id,
        name=archive_name,
        position=9999,
    )
    session.add(archive)
    await session.flush()
    return archive


async def get_or_create_menu_section_by_name(
    session: AsyncSession,
    restaurant_id: int,
    name: Optional[str],
) -> MenuSection:
    """Get or create a menu section by name for the restaurant's primary menu."""

    menu = await _get_primary_menu(session, restaurant_id)
    cleaned_name = (name or "Uncategorized").strip() or "Uncategorized"

    result = await session.execute(
        select(MenuSection)
        .where(
            MenuSection.menu_id == menu.id,
            func.lower(MenuSection.name) == cleaned_name.lower(),
        )
        .limit(1)
    )
    section = result.scalar_one_or_none()

    if section:
        return section

    result = await session.execute(
        select(MenuSection.position)
        .where(MenuSection.menu_id == menu.id)
    )
    positions = [row[0] for row in result.all() if row[0] is not None]
    next_position = max(positions, default=-1) + 1

    section = MenuSection(
        menu_id=menu.id,
        name=cleaned_name,
        position=next_position,
    )
    session.add(section)
    await session.flush()
    return section


async def get_restaurant_menu_sections(
    session: AsyncSession,
    restaurant_id: int
) -> tuple[Menu, List[MenuSection]]:
    """Return the primary menu and its sections for a restaurant."""

    menu = await _get_primary_menu(session, restaurant_id)
    await _ensure_archive_section(session, menu)

    result = await session.execute(
        select(MenuSection)
        .where(MenuSection.menu_id == menu.id)
        .order_by(MenuSection.position.nullsLast(), MenuSection.created_at.asc())
    )
    sections = result.scalars().all()
    return menu, sections


async def save_restaurant_menu_sections(
    session: AsyncSession,
    restaurant_id: int,
    sections_payload: Sequence[MenuSectionUpsert],
) -> List[MenuSection]:
    """Replace the section ordering for a restaurant's primary menu."""

    menu = await _get_primary_menu(session, restaurant_id)
    archive = await _ensure_archive_section(session, menu)

    result = await session.execute(
        select(MenuSection)
        .where(MenuSection.menu_id == menu.id)
    )
    existing = {section.id: section for section in result.scalars()}

    retained_ids: list[int] = []
    position_counter = 0

    for payload in sections_payload:
        desired_position = payload.position if payload.position is not None else position_counter
        if payload.id:
            section = existing.get(payload.id)
            if not section or section.menu_id != menu.id:
                raise ValueError("Invalid menu section id for restaurant")
            section.name = payload.name
            section.position = desired_position
            retained_ids.append(section.id)
        else:
            section = MenuSection(
                menu_id=menu.id,
                name=payload.name,
                position=desired_position,
            )
            session.add(section)
            await session.flush()
            existing[section.id] = section
            retained_ids.append(section.id)
        position_counter = max(position_counter, desired_position + 1)

    # Ensure archive is always present and ordered last
    archive.position = archive.position if archive.position is not None else position_counter
    if archive.id not in retained_ids:
        retained_ids.append(archive.id)

    for section_id, section in list(existing.items()):
        if section_id in retained_ids:
            continue
        if section_id == archive.id:
            continue
        # Move recipes to archive before deleting the section
        for link in list(section.recipes):
            link.section_id = archive.id
            link.position = None
        await session.delete(section)

    await session.flush()

    result = await session.execute(
        select(MenuSection)
        .where(MenuSection.menu_id == menu.id)
        .order_by(MenuSection.position.nullsLast(), MenuSection.created_at.asc())
    )
    return result.scalars().all()


async def _set_recipe_sections(
    session: AsyncSession,
    recipe: Recipe,
    section_ids: Sequence[int],
) -> None:
    """Assign a recipe to the provided menu sections."""

    unique_ids = list(dict.fromkeys(section_ids))

    if not unique_ids:
        recipe.section_links[:] = []
        await session.flush()
        return

    result = await session.execute(
        select(MenuSection)
        .where(MenuSection.id.in_(unique_ids))
        .options(selectinload(MenuSection.menu))
    )
    sections = result.scalars().all()

    found_ids = {section.id for section in sections}
    missing_ids = set(unique_ids) - found_ids
    if missing_ids:
        raise ValueError("Invalid menu section ids provided")

    for section in sections:
        if section.menu.restaurant_id != recipe.restaurant_id:
            raise ValueError("Menu section does not belong to recipe's restaurant")

    order_map = {section_id: index for index, section_id in enumerate(unique_ids)}
    existing_map = {link.section_id: link for link in recipe.section_links}

    # Remove stale links
    for link in list(recipe.section_links):
        if link.section_id not in order_map:
            recipe.section_links.remove(link)

    for section in sections:
        link = existing_map.get(section.id)
        if not link:
            link = MenuSectionRecipe(section_id=section.id, recipe_id=recipe.id)
            recipe.section_links.append(link)
        link.position = order_map[section.id]

    await session.flush()


async def create_recipe(
    session: AsyncSession,
    restaurant_id: int,
    name: str,
    description: Optional[str] = None,
    instructions: Optional[str] = None,
    serving_size: Optional[str] = None,
    price: Optional[str] = None,
    image: Optional[str] = None,
    options: Optional[str] = None,
    special_notes: Optional[str] = None,
    prominence_score: Optional[float] = None,
    confirmed: bool = False,
    is_on_menu: bool = False,
    menu_section_ids: Optional[Sequence[int]] = None,
) -> int:
    """
    Create a new recipe.
    
    Args:
        session: Database session
        restaurant_id: Restaurant ID
        name: Recipe name
        description: Optional description
        instructions: Optional preparation instructions
        serving_size: Optional serving size
        price: Optional price
        image: Optional image URL
    
    Returns:
        Recipe ID
    """
    from .models import Recipe
    
    recipe = Recipe(
        restaurant_id=restaurant_id,
        name=name,
        description=description,
        instructions=instructions,
        serving_size=serving_size,
        price=price,
        image=image,
        options=options,
        special_notes=special_notes,
        prominence_score=prominence_score,
        confirmed=confirmed,
        is_on_menu=is_on_menu
    )
    session.add(recipe)
    await session.flush()

    if menu_section_ids is not None:
        await _set_recipe_sections(session, recipe, menu_section_ids)

    return recipe.id


async def update_recipe(
    session: AsyncSession,
    recipe_id: int,
    **kwargs
) -> Optional["Recipe"]:
    """
    Update a recipe.
    
    Args:
        session: Database session
        recipe_id: Recipe ID
        **kwargs: Fields to update
    
    Returns:
        Updated Recipe object or None if not found
    """
    from .models import Recipe
    
    result = await session.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    )
    recipe = result.scalar_one_or_none()
    
    if not recipe:
        return None
    
    menu_section_ids = kwargs.pop("menu_section_ids", None)

    for key, value in kwargs.items():
        if hasattr(recipe, key) and value is not None:
            setattr(recipe, key, value)

    if menu_section_ids is not None:
        await _set_recipe_sections(session, recipe, menu_section_ids)

    await session.flush()
    return recipe


async def delete_recipe(
    session: AsyncSession,
    recipe_id: int
) -> bool:
    """
    Delete a recipe.
    
    Args:
        session: Database session
        recipe_id: Recipe ID
    
    Returns:
        True if deleted, False if not found
    """
    from .models import Recipe
    
    result = await session.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    )
    recipe = result.scalar_one_or_none()
    
    if not recipe:
        return False
    
    await session.delete(recipe)
    await session.flush()
    return True


async def get_recipe_by_id(
    session: AsyncSession,
    recipe_id: int
) -> Optional["Recipe"]:
    """
    Get recipe by ID.
    
    Args:
        session: Database session
        recipe_id: Recipe ID
    
    Returns:
        Recipe object or None
    """
    from .models import Recipe
    
    result = await session.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    )
    return result.scalar_one_or_none()


async def get_restaurant_recipes(
    session: AsyncSession,
    restaurant_id: int
) -> list:
    """
    Get all recipes for a restaurant.
    
    Args:
        session: Database session
        restaurant_id: Restaurant ID
    
    Returns:
        List of Recipe objects
    """
    from .models import Recipe
    
    result = await session.execute(
        select(Recipe).where(Recipe.restaurant_id == restaurant_id)
    )
    return result.scalars().all()


async def add_recipe_ingredient(
    session: AsyncSession,
    recipe_id: int,
    ingredient_id: int,
    quantity: Optional[float] = None,
    unit: Optional[str] = None,
    notes: Optional[str] = None,
    allergens: Optional[str] = None,
    confirmed: bool = False,
    substitution: Optional[dict] = None,
    substitution_provided: bool = False,
) -> None:
    """
    Add or update an ingredient in a recipe.
    
    Args:
        session: Database session
        recipe_id: Recipe ID
        ingredient_id: Ingredient ID
        quantity: Optional quantity
        unit: Optional unit
        notes: Optional notes
    """
    from .models import RecipeIngredient
    
    # Check if exists
    result = await session.execute(
        select(RecipeIngredient).where(
            RecipeIngredient.recipe_id == recipe_id,
            RecipeIngredient.ingredient_id == ingredient_id
        )
    )
    link = result.scalar_one_or_none()
    
    if link:
        # Update existing
        link.quantity = quantity
        link.unit = unit
        link.notes = notes
        link.allergens = allergens
        link.confirmed = confirmed
    else:
        # Insert new
        link = RecipeIngredient(
            recipe_id=recipe_id,
            ingredient_id=ingredient_id,
            quantity=quantity,
            unit=unit,
            notes=notes,
            allergens=allergens,
            confirmed=confirmed
        )
        session.add(link)

    # Manage substitution link when explicitly provided
    if substitution_provided:
        substitution_data = substitution or {}
        alternative = substitution_data.get("alternative") if substitution_data else None
        surcharge = substitution_data.get("surcharge") if substitution_data else None

        if alternative:
            if link.substitution:
                link.substitution.alternative = alternative
                link.substitution.surcharge = surcharge
            else:
                link.substitution = RecipeIngredientSubstitution(
                    alternative=alternative,
                    surcharge=surcharge,
                )
        else:
            if link.substitution:
                link.substitution = None

    await session.flush()


async def get_recipe_with_details(
    session: AsyncSession,
    recipe_id: int
) -> Optional[Dict]:
    """
    Get recipe with full ingredient details and allergens.
    
    Args:
        session: Database session
        recipe_id: Recipe ID
    
    Returns:
        Dict with recipe data and ingredients with allergens, or None
    """
    from .models import Recipe, RecipeIngredient, Ingredient, IngredientAllergen
    
    # Get recipe with eager loading
    result = await session.execute(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(
            selectinload(Recipe.ingredients).options(
                selectinload(RecipeIngredient.ingredient)
                .selectinload(Ingredient.allergens)
                .selectinload(IngredientAllergen.allergen),
                selectinload(RecipeIngredient.substitution),
            ),
            selectinload(Recipe.section_links)
            .selectinload(MenuSectionRecipe.section)
            .selectinload(MenuSection.menu),
        )
    )
    recipe = result.scalar_one_or_none()
    
    if not recipe:
        return None
    
    # Build ingredient list with allergens
    ingredients = []
    import json

    for ri in recipe.ingredients:
        allergens = [
            {
                "code": ia.allergen.code,
                "name": ia.allergen.name,
                "certainty": ia.certainty
            }
            for ia in ri.ingredient.allergens
        ]

        if ri.allergens:
            try:
                predicted = json.loads(ri.allergens)
                if isinstance(predicted, list):
                    for entry in predicted:
                        if isinstance(entry, dict):
                            allergens.append({
                                "code": entry.get("code") or entry.get("name", "predicted"),
                                "name": entry.get("name", ""),
                                "certainty": entry.get("certainty", "predicted")
                            })
                        elif isinstance(entry, str):
                            allergens.append({
                                "code": entry,
                                "name": entry,
                                "certainty": "predicted"
                            })
            except json.JSONDecodeError:
                allergens.append({
                    "code": "predicted",
                    "name": ri.allergens,
                    "certainty": "predicted"
                })

        substitution_data = None
        if ri.substitution:
            substitution_data = {
                "alternative": ri.substitution.alternative,
                "surcharge": ri.substitution.surcharge,
            }

        ingredients.append({
            "ingredient_id": ri.ingredient_id,
            "ingredient_name": ri.ingredient.name,
            "quantity": float(ri.quantity) if ri.quantity else None,
            "unit": ri.unit,
            "notes": ri.notes,
            "allergens": allergens,
            "confirmed": ri.confirmed,
            "substitution": substitution_data,
        })
    
    section_links = sorted(
        recipe.section_links,
        key=lambda link: (
            link.section.position if link.section and link.section.position is not None else 9999,
            link.position if link.position is not None else 9999,
        ),
    )
    sections = []
    for link in section_links:
        section = link.section
        if not section:
            continue
        menu = section.menu
        sections.append(
            {
                "menu_id": section.menu_id,
                "menu_name": menu.name if menu else "",
                "section_id": section.id,
                "section_name": section.name,
                "section_position": section.position,
                "recipe_position": link.position,
            }
        )

    return {
        "id": recipe.id,
        "restaurant_id": recipe.restaurant_id,
        "name": recipe.name,
        "description": recipe.description,
        "instructions": recipe.instructions,
        "serving_size": recipe.serving_size,
        "price": recipe.price,
        "image": recipe.image,
        "created_at": recipe.created_at,
        "options": recipe.options,
        "special_notes": recipe.special_notes,
        "prominence_score": recipe.prominence_score,
        "confirmed": recipe.confirmed,
        "is_on_menu": recipe.is_on_menu,
        "sections": sections,
        "ingredients": ingredients
    }

