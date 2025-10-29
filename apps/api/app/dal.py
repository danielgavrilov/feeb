"""
Data Access Layer (DAL) for ingredient and allergen queries.
All functions use SQLAlchemy async sessions and return Pydantic models.
"""


from datetime import datetime
from typing import Optional, Optional as _Optional, Dict, List, Sequence, Any, Union

from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from .allergen_canonical import (
    canonical_allergen_from_label,
    canonicalize_allergen,
    certainty_to_ui,
)

# Default brand colours kept in sync with the frontend theme (apps/web/src/index.css)
DEFAULT_RESTAURANT_PRIMARY_COLOR = "#23001E"
DEFAULT_RESTAURANT_ACCENT_COLOR = "#FE7F2D"
from .models import (
    Ingredient, Allergen, AllergenBadge, IngredientAllergen,
    IngredientWithAllergens, IngredientResponse, AllergenResponse, AllergenBadgeResponse,
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
            certainty=certainty_to_ui(ia.certainty),
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


async def update_ingredient_name(
    session: AsyncSession,
    ingredient_id: int,
    name: str,
) -> bool:
    """Update the name of an ingredient if it exists."""

    result = await session.execute(
        select(Ingredient).where(Ingredient.id == ingredient_id)
    )
    ingredient = result.scalar_one_or_none()

    if not ingredient:
        return False

    ingredient.name = name
    await session.flush()
    return True


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
    
    restaurant = Restaurant(
        name=name,
        description=description,
        primary_color=DEFAULT_RESTAURANT_PRIMARY_COLOR,
        accent_color=DEFAULT_RESTAURANT_ACCENT_COLOR,
    )
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


async def delete_restaurant(
    session: AsyncSession,
    restaurant_id: int,
) -> bool:
    """Delete a restaurant and its related data."""

    from .models import Restaurant

    restaurant = await session.get(Restaurant, restaurant_id)
    if not restaurant:
        return False

    await session.delete(restaurant)
    await session.flush()
    return True


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
    await _ensure_archive_section(session, menu)
    return menu


async def _ensure_archive_section(
    session: AsyncSession,
    menu: Menu
) -> MenuSection:
    """Ensure the archive section exists for a menu."""

    archive_name = "Archive"

    # Find archive section by name
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

    if cleaned_name.lower() == "archive".lower():
        return await _ensure_archive_section(session, menu)

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
        .order_by(MenuSection.position.nulls_last(), MenuSection.created_at.asc())
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

    reserved_name = "Archive"

    for payload in sections_payload:
        desired_position = payload.position if payload.position is not None else position_counter
        raw_name = (payload.name or "")
        normalized_name = raw_name.strip()
        effective_name = normalized_name or raw_name
        if payload.id:
            section = existing.get(payload.id)
            if not section or section.menu_id != menu.id:
                raise ValueError("Invalid menu section id for restaurant")

            # Skip archive sections (identified by name)
            if section.name.strip().lower() == reserved_name.lower():
                section.position = desired_position
                retained_ids.append(section.id)
                position_counter = max(position_counter, desired_position + 1)
                continue

            if effective_name and effective_name.lower() == reserved_name.lower():
                raise ValueError("Archive section name is reserved")

            section.name = effective_name
            section.position = desired_position
            retained_ids.append(section.id)
        else:
            if effective_name and effective_name.lower() == reserved_name.lower():
                raise ValueError("Archive section name is reserved")

            section = MenuSection(
                menu_id=menu.id,
                name=effective_name,
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
        .order_by(MenuSection.position.nulls_last(), MenuSection.created_at.asc())
    )
    return result.scalars().all()


async def _set_recipe_sections(
    session: AsyncSession,
    recipe: Recipe,
    section_ids: Sequence[int],
) -> None:
    """Assign a recipe to the provided menu sections."""

    # Eagerly load section_links to avoid lazy loading in async context
    await session.refresh(recipe, ["section_links"])

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
    status: str = "needs_review",
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
        status: Recipe status (needs_review, confirmed, live)
    
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
        status=status
    )
    session.add(recipe)
    await session.flush()

    if menu_section_ids is not None:
        # Reload recipe with eager-loaded section_links to avoid lazy loading
        result = await session.execute(
            select(Recipe)
            .where(Recipe.id == recipe.id)
            .options(selectinload(Recipe.section_links))
        )
        recipe = result.scalar_one()
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
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(selectinload(Recipe.section_links))
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
    allergens: Optional[List[Union[Dict[str, Any], Any]]] = None,
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
    from .models import RecipeIngredient, RecipeIngredientSubstitution
    
    # Check if exists (eagerly load substitution to avoid lazy-load in async context)
    result = await session.execute(
        select(RecipeIngredient)
        .where(
            RecipeIngredient.recipe_id == recipe_id,
            RecipeIngredient.ingredient_id == ingredient_id
        )
        .options(selectinload(RecipeIngredient.substitution))
    )
    link = result.scalar_one_or_none()
    
    # Serialize allergens to JSON string, preserving explicit empty lists
    allergens_json = None
    if allergens is not None:
        import json

        if isinstance(allergens, str):
            allergens_json = allergens
        else:
            allergens_dicts = []
            for allergen in allergens:
                if hasattr(allergen, 'model_dump'):
                    allergens_dicts.append(allergen.model_dump(exclude_none=False))
                elif isinstance(allergen, dict):
                    allergens_dicts.append(allergen)
                else:
                    raise ValueError(f"Unexpected allergen type: {type(allergen)}")
            allergens_json = json.dumps(allergens_dicts)

    if link:
        # Update existing
        link.quantity = quantity
        link.unit = unit
        link.notes = notes
        link.allergens = allergens_json
        link.confirmed = confirmed
    else:
        # Insert new
        link = RecipeIngredient(
            recipe_id=recipe_id,
            ingredient_id=ingredient_id,
            quantity=quantity,
            unit=unit,
            notes=notes,
            allergens=allergens_json,
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


async def delete_recipe_ingredient(
    session: AsyncSession,
    recipe_id: int,
    ingredient_id: int,
) -> bool:
    """Delete a recipe ingredient link.

    Args:
        session: Database session
        recipe_id: Recipe ID
        ingredient_id: Ingredient ID

    Returns:
        True if a row was deleted, False if nothing matched
    """

    from .models import RecipeIngredient

    result = await session.execute(
        select(RecipeIngredient).where(
            RecipeIngredient.recipe_id == recipe_id,
            RecipeIngredient.ingredient_id == ingredient_id,
        )
    )
    link = result.scalar_one_or_none()

    if not link:
        return False

    await session.delete(link)
    await session.flush()
    return True


async def get_or_create_allergen(
    session: AsyncSession,
    code: str,
    name: str,
) -> int:
    """
    Get existing allergen or create new one.
    
    Args:
        session: Database session
        code: Allergen code
        name: Allergen name
    
    Returns:
        Allergen ID
    """
    from .models import Allergen
    
    # Try to find existing allergen
    result = await session.execute(
        select(Allergen).where(Allergen.code == code)
    )
    allergen = result.scalar_one_or_none()
    
    if allergen:
        return allergen.id
    
    # Create new allergen
    allergen = Allergen(
        code=code,
        name=name,
        category="diet" if code.startswith("llm:") else "allergen",
    )
    session.add(allergen)
    await session.flush()
    return allergen.id


async def add_ingredient_allergen(
    session: AsyncSession,
    ingredient_id: int,
    allergen_id: int,
    certainty: str = "possible",
    source: str = "llm",
) -> None:
    """
    Add ingredient-allergen association.
    
    Args:
        session: Database session
        ingredient_id: Ingredient ID
        allergen_id: Allergen ID
        certainty: Certainty level
        source: Data source
    """
    from .models import IngredientAllergen
    
    # Check if association already exists
    result = await session.execute(
        select(IngredientAllergen).where(
            IngredientAllergen.ingredient_id == ingredient_id,
            IngredientAllergen.allergen_id == allergen_id,
            IngredientAllergen.source == source,
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update existing association
        existing.certainty = certainty
    else:
        # Create new association
        association = IngredientAllergen(
            ingredient_id=ingredient_id,
            allergen_id=allergen_id,
            certainty=certainty,
            source=source,
        )
        session.add(association)
    
    await session.flush()


def _process_ingredient_allergens(
    ingredient_allergens_list: List[Any],
    allergens_payload: Optional[str]
) -> List[Dict[str, Any]]:
    """
    Process allergens for an ingredient, handling both database allergens and overrides.
    
    Args:
        ingredient_allergens_list: List of IngredientAllergen objects from database
        allergens_payload: JSON string or None containing allergen overrides
    
    Returns:
        List of allergen dictionaries with canonical codes and names
    """
    import json
    
    # Build base allergens from ingredient allergens
    ingredient_allergens: List[Dict[str, Any]] = []
    ingredient_codes = set()
    
    for ia in ingredient_allergens_list:
        allergen = ia.allergen
        canonical = None
        if allergen:
            canonical = (
                canonicalize_allergen(getattr(allergen, "code", None))
                or canonical_allergen_from_label(getattr(allergen, "name", None))
                or canonicalize_allergen(getattr(allergen, "name", None))
            )
        
        certainty_value = certainty_to_ui(getattr(ia, "certainty", None))
        
        if canonical:
            code = canonical.slug
            name = canonical.label
        else:
            code = getattr(allergen, "code", None)
            name = getattr(allergen, "name", None)
        
        if not code:
            continue
        
        code_key = code.lower()
        if code_key in ingredient_codes:
            continue
        
        ingredient_codes.add(code_key)
        ingredient_allergens.append(
            {
                "code": code,
                "name": name,
                "certainty": certainty_value,
                "canonical_code": canonical.slug if canonical else None,
                "canonical_name": canonical.label if canonical else None,
                "family_code": canonical.family_slug if canonical and hasattr(canonical, 'family_slug') else None,
                "family_name": canonical.family_label if canonical and hasattr(canonical, 'family_label') else None,
                "marker_type": None,
            }
        )
    
    # Process allergen overrides if provided
    override_allergens: Optional[List[Dict[str, Any]]] = None
    
    if allergens_payload is not None:
        override_allergens = []
        override_codes = set()
        
        parsed_payload: Any = allergens_payload
        if isinstance(allergens_payload, str):
            raw_text = allergens_payload.strip()
            if not raw_text:
                parsed_payload = []
            else:
                try:
                    parsed_payload = json.loads(raw_text)
                except json.JSONDecodeError:
                    parsed_payload = raw_text
        
        def add_override_entry(label: Any, certainty: Any) -> None:
            canonical = canonical_allergen_from_label(label) or canonicalize_allergen(label)
            if not canonical:
                return
            code = canonical.slug
            code_key = code.lower()
            if code_key in override_codes:
                return
            override_codes.add(code_key)
            override_allergens.append(
                {
                    "code": code,
                    "name": canonical.label,
                    "certainty": certainty_to_ui(certainty),
                    "canonical_code": canonical.slug if canonical else None,
                    "canonical_name": canonical.label if canonical else None,
                    "family_code": canonical.family_slug if canonical and hasattr(canonical, 'family_slug') else None,
                    "family_name": canonical.family_label if canonical and hasattr(canonical, 'family_label') else None,
                    "marker_type": None,
                }
            )
        
        if isinstance(parsed_payload, list):
            for entry in parsed_payload:
                if isinstance(entry, dict):
                    raw_label = entry.get("code") or entry.get("allergen") or entry.get("name")
                    certainty_value = entry.get("certainty")
                else:
                    raw_label = entry
                    certainty_value = None
                add_override_entry(raw_label, certainty_value)
        elif isinstance(parsed_payload, dict):
            raw_label = (
                parsed_payload.get("code")
                or parsed_payload.get("allergen")
                or parsed_payload.get("name")
            )
            add_override_entry(raw_label, parsed_payload.get("certainty"))
        elif isinstance(parsed_payload, str):
            add_override_entry(parsed_payload, None)
        elif parsed_payload is None:
            # Explicit null payload -> treat as cleared list
            pass
    
    # Return overrides if present, otherwise return ingredient allergens
    return override_allergens if override_allergens is not None else ingredient_allergens


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
    from .models import Recipe, RecipeIngredient, Ingredient, IngredientAllergen, BasePrep, BasePrepIngredient, RecipeBasePrep
    
    # Get recipe with eager loading (including base preps)
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
            selectinload(Recipe.recipe_base_preps).options(
                selectinload(RecipeBasePrep.base_prep).options(
                    selectinload(BasePrep.ingredients).options(
                        selectinload(BasePrepIngredient.ingredient)
                        .selectinload(Ingredient.allergens)
                        .selectinload(IngredientAllergen.allergen)
                    )
                )
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

    # Process direct ingredients
    for ri in recipe.ingredients:
        allergens = _process_ingredient_allergens(ri.ingredient.allergens, ri.allergens)
        
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
    
    # Process base prep ingredients (expand them into the ingredients list)
    for rbp in recipe.recipe_base_preps:
        base_prep = rbp.base_prep
        if not base_prep:
            continue
        
        # Each base prep ingredient is added to the recipe's ingredient list
        for bpi in base_prep.ingredients:
            allergens = _process_ingredient_allergens(bpi.ingredient.allergens, bpi.allergens)
            
            # Build notes that indicate this comes from a base prep
            base_prep_note = f"From base prep: {base_prep.name}"
            combined_notes = f"{bpi.notes}. {base_prep_note}" if bpi.notes else base_prep_note
            if rbp.notes:
                combined_notes = f"{combined_notes}. {rbp.notes}"
            
            ingredients.append({
                "ingredient_id": bpi.ingredient_id,
                "ingredient_name": bpi.ingredient.name,
                "quantity": float(bpi.quantity) if bpi.quantity else None,
                "unit": bpi.unit,
                "notes": combined_notes,
                "allergens": allergens,
                "confirmed": bpi.confirmed,
                "substitution": None,  # Base prep ingredients don't have substitutions in recipes
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
        "status": recipe.status,
        "sections": sections,
        "ingredients": ingredients
    }


# ============================================================================
# Base Prep System DAL Functions
# ============================================================================

async def create_base_prep(
    session: AsyncSession,
    restaurant_id: int,
    name: str,
    description: Optional[str] = None,
    instructions: Optional[str] = None,
    yield_quantity: Optional[float] = None,
    yield_unit: Optional[str] = None,
) -> int:
    """
    Create a new base prep.
    
    Args:
        session: Database session
        restaurant_id: Restaurant ID
        name: Base prep name
        description: Optional description
        instructions: Optional preparation instructions
        yield_quantity: Optional yield quantity
        yield_unit: Optional yield unit
    
    Returns:
        Base prep ID
    """
    from .models import BasePrep
    
    base_prep = BasePrep(
        restaurant_id=restaurant_id,
        name=name,
        description=description,
        instructions=instructions,
        yield_quantity=yield_quantity,
        yield_unit=yield_unit,
    )
    session.add(base_prep)
    await session.flush()
    return base_prep.id


async def update_base_prep(
    session: AsyncSession,
    base_prep_id: int,
    **kwargs
) -> Optional["BasePrep"]:
    """
    Update a base prep.
    
    Args:
        session: Database session
        base_prep_id: Base prep ID
        **kwargs: Fields to update
    
    Returns:
        Updated BasePrep object or None if not found
    """
    from .models import BasePrep
    
    result = await session.execute(
        select(BasePrep).where(BasePrep.id == base_prep_id)
    )
    base_prep = result.scalar_one_or_none()
    
    if not base_prep:
        return None
    
    for key, value in kwargs.items():
        if hasattr(base_prep, key) and value is not None:
            setattr(base_prep, key, value)
    
    await session.flush()
    return base_prep


async def delete_base_prep(
    session: AsyncSession,
    base_prep_id: int
) -> bool:
    """
    Delete a base prep.
    
    Args:
        session: Database session
        base_prep_id: Base prep ID
    
    Returns:
        True if deleted, False if not found
    """
    from .models import BasePrep
    
    result = await session.execute(
        select(BasePrep).where(BasePrep.id == base_prep_id)
    )
    base_prep = result.scalar_one_or_none()
    
    if not base_prep:
        return False
    
    await session.delete(base_prep)
    await session.flush()
    return True


async def get_base_prep_by_id(
    session: AsyncSession,
    base_prep_id: int
) -> Optional["BasePrep"]:
    """
    Get base prep by ID.
    
    Args:
        session: Database session
        base_prep_id: Base prep ID
    
    Returns:
        BasePrep object or None
    """
    from .models import BasePrep
    
    result = await session.execute(
        select(BasePrep).where(BasePrep.id == base_prep_id)
    )
    return result.scalar_one_or_none()


async def get_restaurant_base_preps(
    session: AsyncSession,
    restaurant_id: int
) -> list:
    """
    Get all base preps for a restaurant.
    
    Args:
        session: Database session
        restaurant_id: Restaurant ID
    
    Returns:
        List of BasePrep objects
    """
    from .models import BasePrep
    
    result = await session.execute(
        select(BasePrep).where(BasePrep.restaurant_id == restaurant_id)
    )
    return result.scalars().all()


async def add_base_prep_ingredient(
    session: AsyncSession,
    base_prep_id: int,
    ingredient_id: int,
    quantity: Optional[float] = None,
    unit: Optional[str] = None,
    notes: Optional[str] = None,
    allergens: Optional[List[Union[Dict[str, Any], Any]]] = None,
    confirmed: bool = False,
) -> None:
    """
    Add or update an ingredient in a base prep.
    
    Args:
        session: Database session
        base_prep_id: Base prep ID
        ingredient_id: Ingredient ID
        quantity: Optional quantity
        unit: Optional unit
        notes: Optional notes
        allergens: Optional allergens list
        confirmed: Whether ingredient is confirmed
    """
    from .models import BasePrepIngredient
    
    # Check if exists
    result = await session.execute(
        select(BasePrepIngredient).where(
            BasePrepIngredient.base_prep_id == base_prep_id,
            BasePrepIngredient.ingredient_id == ingredient_id
        )
    )
    link = result.scalar_one_or_none()
    
    # Serialize allergens to JSON string
    allergens_json = None
    if allergens is not None:
        import json
        
        if isinstance(allergens, str):
            allergens_json = allergens
        else:
            allergens_dicts = []
            for allergen in allergens:
                if hasattr(allergen, 'model_dump'):
                    allergens_dicts.append(allergen.model_dump(exclude_none=False))
                elif isinstance(allergen, dict):
                    allergens_dicts.append(allergen)
                else:
                    raise ValueError(f"Unexpected allergen type: {type(allergen)}")
            allergens_json = json.dumps(allergens_dicts)
    
    if link:
        # Update existing
        link.quantity = quantity
        link.unit = unit
        link.notes = notes
        link.allergens = allergens_json
        link.confirmed = confirmed
    else:
        # Insert new
        link = BasePrepIngredient(
            base_prep_id=base_prep_id,
            ingredient_id=ingredient_id,
            quantity=quantity,
            unit=unit,
            notes=notes,
            allergens=allergens_json,
            confirmed=confirmed
        )
        session.add(link)
    
    await session.flush()


async def remove_base_prep_ingredient(
    session: AsyncSession,
    base_prep_id: int,
    ingredient_id: int,
) -> bool:
    """
    Remove an ingredient from a base prep.
    
    Args:
        session: Database session
        base_prep_id: Base prep ID
        ingredient_id: Ingredient ID
    
    Returns:
        True if removed, False if not found
    """
    from .models import BasePrepIngredient
    
    result = await session.execute(
        select(BasePrepIngredient).where(
            BasePrepIngredient.base_prep_id == base_prep_id,
            BasePrepIngredient.ingredient_id == ingredient_id,
        )
    )
    link = result.scalar_one_or_none()
    
    if not link:
        return False
    
    await session.delete(link)
    await session.flush()
    return True


async def link_recipe_to_base_prep(
    session: AsyncSession,
    recipe_id: int,
    base_prep_id: int,
    quantity: Optional[float] = None,
    unit: Optional[str] = None,
    notes: Optional[str] = None,
) -> None:
    """
    Link a base prep to a recipe.
    
    Args:
        session: Database session
        recipe_id: Recipe ID
        base_prep_id: Base prep ID
        quantity: Optional quantity
        unit: Optional unit
        notes: Optional notes
    """
    from .models import RecipeBasePrep
    
    # Check if exists
    result = await session.execute(
        select(RecipeBasePrep).where(
            RecipeBasePrep.recipe_id == recipe_id,
            RecipeBasePrep.base_prep_id == base_prep_id
        )
    )
    link = result.scalar_one_or_none()
    
    if link:
        # Update existing
        link.quantity = quantity
        link.unit = unit
        link.notes = notes
    else:
        # Insert new
        link = RecipeBasePrep(
            recipe_id=recipe_id,
            base_prep_id=base_prep_id,
            quantity=quantity,
            unit=unit,
            notes=notes,
        )
        session.add(link)
    
    await session.flush()


async def unlink_recipe_from_base_prep(
    session: AsyncSession,
    recipe_id: int,
    base_prep_id: int,
) -> bool:
    """
    Remove a base prep from a recipe.
    
    Args:
        session: Database session
        recipe_id: Recipe ID
        base_prep_id: Base prep ID
    
    Returns:
        True if removed, False if not found
    """
    from .models import RecipeBasePrep
    
    result = await session.execute(
        select(RecipeBasePrep).where(
            RecipeBasePrep.recipe_id == recipe_id,
            RecipeBasePrep.base_prep_id == base_prep_id,
        )
    )
    link = result.scalar_one_or_none()
    
    if not link:
        return False
    
    await session.delete(link)
    await session.flush()
    return True


async def get_base_prep_with_details(
    session: AsyncSession,
    base_prep_id: int
) -> Optional[Dict]:
    """
    Get base prep with full ingredient details and allergens.
    
    Args:
        session: Database session
        base_prep_id: Base prep ID
    
    Returns:
        Dict with base prep data and ingredients with allergens, or None
    """
    from .models import BasePrep, BasePrepIngredient, Ingredient, IngredientAllergen
    
    # Get base prep with eager loading
    result = await session.execute(
        select(BasePrep)
        .where(BasePrep.id == base_prep_id)
        .options(
            selectinload(BasePrep.ingredients).options(
                selectinload(BasePrepIngredient.ingredient)
                .selectinload(Ingredient.allergens)
                .selectinload(IngredientAllergen.allergen)
            )
        )
    )
    base_prep = result.scalar_one_or_none()
    
    if not base_prep:
        return None
    
    # Build ingredient list with allergens
    ingredients = []
    
    for bpi in base_prep.ingredients:
        allergens = _process_ingredient_allergens(bpi.ingredient.allergens, bpi.allergens)
        
        ingredients.append({
            "ingredient_id": bpi.ingredient_id,
            "ingredient_name": bpi.ingredient.name,
            "quantity": float(bpi.quantity) if bpi.quantity else None,
            "unit": bpi.unit,
            "notes": bpi.notes,
            "allergens": allergens,
            "confirmed": bpi.confirmed,
        })
    
    return {
        "id": base_prep.id,
        "restaurant_id": base_prep.restaurant_id,
        "name": base_prep.name,
        "description": base_prep.description,
        "instructions": base_prep.instructions,
        "yield_quantity": float(base_prep.yield_quantity) if base_prep.yield_quantity else None,
        "yield_unit": base_prep.yield_unit,
        "created_at": base_prep.created_at,
        "ingredients": ingredients
    }


async def migrate_recipe_to_base_prep(
    session: AsyncSession,
    recipe_id: int
) -> int:
    """
    Migrate a recipe to a base prep.
    Copies all data from recipe to base_prep table and deletes the recipe.
    
    Args:
        session: Database session
        recipe_id: Recipe ID to migrate
    
    Returns:
        New base prep ID
    """
    from .models import Recipe, RecipeIngredient, BasePrep, BasePrepIngredient
    
    # Get recipe with ingredients
    result = await session.execute(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(selectinload(Recipe.ingredients))
    )
    recipe = result.scalar_one_or_none()
    
    if not recipe:
        raise ValueError(f"Recipe {recipe_id} not found")
    
    # Create base prep with recipe data
    base_prep = BasePrep(
        restaurant_id=recipe.restaurant_id,
        name=recipe.name,
        description=recipe.description,
        instructions=recipe.instructions,
        yield_quantity=None,  # Can be set later by user
        yield_unit=None,
    )
    session.add(base_prep)
    await session.flush()
    
    # Copy ingredients
    for ri in recipe.ingredients:
        bpi = BasePrepIngredient(
            base_prep_id=base_prep.id,
            ingredient_id=ri.ingredient_id,
            quantity=ri.quantity,
            unit=ri.unit,
            notes=ri.notes,
            allergens=ri.allergens,
            confirmed=ri.confirmed,
        )
        session.add(bpi)
    
    # Delete the recipe (cascading will handle recipe_ingredient)
    await session.delete(recipe)
    await session.flush()
    
    return base_prep.id


async def migrate_base_prep_to_recipe(
    session: AsyncSession,
    base_prep_id: int,
    menu_section_id: int
) -> int:
    """
    Migrate a base prep to a recipe.
    Copies all data from base_prep to recipe table and deletes the base prep.
    
    Args:
        session: Database session
        base_prep_id: Base prep ID to migrate
        menu_section_id: Menu section to place the new recipe in
    
    Returns:
        New recipe ID
    """
    from .models import BasePrep, BasePrepIngredient, Recipe, RecipeIngredient, MenuSectionRecipe
    
    # Get base prep with ingredients
    result = await session.execute(
        select(BasePrep)
        .where(BasePrep.id == base_prep_id)
        .options(selectinload(BasePrep.ingredients))
    )
    base_prep = result.scalar_one_or_none()
    
    if not base_prep:
        raise ValueError(f"Base prep {base_prep_id} not found")
    
    # Create recipe with base prep data
    recipe = Recipe(
        restaurant_id=base_prep.restaurant_id,
        name=base_prep.name,
        description=base_prep.description,
        instructions=base_prep.instructions,
        serving_size=None,
        price=None,
        image=None,
        options=None,
        special_notes=None,
        prominence_score=None,
        status="needs_review",  # Default status for converted recipe
    )
    session.add(recipe)
    await session.flush()
    
    # Copy ingredients
    for bpi in base_prep.ingredients:
        ri = RecipeIngredient(
            recipe_id=recipe.id,
            ingredient_id=bpi.ingredient_id,
            quantity=bpi.quantity,
            unit=bpi.unit,
            notes=bpi.notes,
            allergens=bpi.allergens,
            confirmed=bpi.confirmed,
        )
        session.add(ri)
    
    # Link to menu section
    menu_link = MenuSectionRecipe(
        section_id=menu_section_id,
        recipe_id=recipe.id,
        position=None,
    )
    session.add(menu_link)
    
    # Delete the base prep (cascading will handle base_prep_ingredient)
    await session.delete(base_prep)
    await session.flush()
    
    return recipe.id

