"""
FastAPI route handlers for ingredient and allergen lookups.
"""

import re
from textwrap import dedent
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .database import get_db
from .models import (
    IngredientWithAllergens,
    ProductWithDetails,
    HealthResponse,
    UserCreate,
    UserResponse,
    RestaurantCreate,
    RestaurantResponse,
    RestaurantUpdate,
    MenuCreate,
    MenuResponse,
    MenuSectionResponse,
    MenuSectionsUpdateRequest,
    RestaurantMenuSectionsResponse,
    RecipeCreate,
    RecipeUpdate,
    RecipeWithIngredients,
    RecipeIngredientRequest,
    MenuUploadCreateResponse,
    MenuUploadResponse,
    MenuUploadSourceType,
    AllergenBadgeResponse,
)
from . import dal
from .services.menu_upload import menu_upload_service
from .services.gemini_client import GeminiClient


CANONICAL_ALLERGEN_MARKERS_PROMPT = """[
  {"id": "cereals_gluten", "label": "Cereals containing gluten"},
  {"id": "crustaceans", "label": "Crustaceans"},
  {"id": "eggs", "label": "Eggs"},
  {"id": "fish", "label": "Fish"},
  {"id": "peanuts", "label": "Peanuts"},
  {"id": "soybeans", "label": "Soybeans"},
  {"id": "milk", "label": "Milk"},
  {"id": "tree_nuts", "label": "Tree nuts"},
  {"id": "celery", "label": "Celery"},
  {"id": "mustard", "label": "Mustard"},
  {"id": "sesame", "label": "Sesame seeds"},
  {"id": "sulphites", "label": "Sulphur dioxide & sulphites"},
  {"id": "lupin", "label": "Lupin"},
  {"id": "molluscs", "label": "Molluscs"},
  {"id": "vegan", "label": "Not plant-based (vegan)"},
  {"id": "vegetarian", "label": "Not plant-based (vegetarian)"}
]"""

router = APIRouter()


@router.get("/ingredients/{name}", response_model=IngredientWithAllergens)
async def get_ingredient(
    name: str,
    exact: bool = Query(default=False, description="Exact match if true, fuzzy if false"),
    session: AsyncSession = Depends(get_db)
):
    """
    Retrieve ingredient by name with associated allergens.
    
    - **name**: Ingredient name to search for
    - **exact**: If true, exact match; if false, case-insensitive partial match
    
    Returns ingredient details and list of allergens.
    """
    result = await dal.get_ingredient_by_name(session, name, exact)
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Ingredient '{name}' not found")
    
    return result


@router.get("/products/{barcode}", response_model=ProductWithDetails)
async def get_product(
    barcode: str,
    session: AsyncSession = Depends(get_db)
):
    """
    Retrieve product by barcode with ingredients and allergens.
    
    - **barcode**: Product barcode (EAN/UPC code)
    
    Returns product details, ingredients list, and allergens.
    """
    result = await dal.get_product_by_barcode(session, barcode)
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Product with barcode '{barcode}' not found")
    
    return result


@router.get("/health", response_model=HealthResponse)
async def health_check(session: AsyncSession = Depends(get_db)):
    """
    Health check endpoint.

    Returns API status and database connectivity.
    """
    db_connected = False

    try:
        # Simple query to test DB connection
        await session.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        pass

    return HealthResponse(
        status="ok" if db_connected else "degraded",
        db_connected=db_connected
    )


@router.get("/allergen-badges", response_model=list[AllergenBadgeResponse])
async def list_allergen_badges(session: AsyncSession = Depends(get_db)):
    """Return curated allergen badges with SVG icons for UI use."""

    return await dal.list_allergen_badges(session)


# ============================================================================
# Recipe System Routes
# ============================================================================

@router.post("/users/sync", response_model=UserResponse)
async def sync_user(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_db)
):
    """
    Sync Supabase user to app_user table.
    
    - **supabase_uid**: Supabase user ID
    - **email**: User email
    - **name**: Optional display name
    
    Returns user ID.
    """
    user_id = await dal.upsert_app_user(
        session,
        supabase_uid=user_data.supabase_uid,
        email=user_data.email,
        name=user_data.name
    )
    await session.commit()
    
    # Fetch the created/updated user
    user = await dal.get_user_by_supabase_uid(session, user_data.supabase_uid)
    
    return UserResponse(
        id=user.id,
        supabase_uid=user.supabase_uid,
        email=user.email,
        name=user.name,
        created_at=user.created_at
    )


@router.post("/restaurants", response_model=RestaurantResponse)
async def create_restaurant(
    restaurant_data: RestaurantCreate,
    session: AsyncSession = Depends(get_db)
):
    """
    Create a new restaurant.
    
    - **name**: Restaurant name
    - **user_id**: User ID to link as owner
    - **description**: Optional description
    
    Returns restaurant ID.
    """
    
    restaurant_id = await dal.create_restaurant(
        session,
        name=restaurant_data.name,
        user_id=restaurant_data.user_id,
        description=restaurant_data.description
    )
    await session.commit()
    
    # Fetch the created restaurant
    restaurants = await dal.get_user_restaurants(session, restaurant_data.user_id)
    restaurant = next((r for r in restaurants if r.id == restaurant_id), None)
    
    return RestaurantResponse(
        id=restaurant.id,
        name=restaurant.name,
        description=restaurant.description,
        logo_data_url=restaurant.logo_data_url,
        primary_color=restaurant.primary_color,
        accent_color=restaurant.accent_color,
        created_at=restaurant.created_at
    )


@router.get("/restaurants/user/{user_id}", response_model=list[RestaurantResponse])
async def get_user_restaurants(
    user_id: int,
    session: AsyncSession = Depends(get_db)
):
    """
    Get all restaurants for a user.
    
    - **user_id**: User ID
    
    Returns list of restaurants.
    """
    restaurants = await dal.get_user_restaurants(session, user_id)
    
    return [
        RestaurantResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            logo_data_url=r.logo_data_url,
            primary_color=r.primary_color,
            accent_color=r.accent_color,
            created_at=r.created_at
        )
        for r in restaurants
    ]


@router.put("/restaurants/{restaurant_id}", response_model=RestaurantResponse)
async def update_restaurant(
    restaurant_id: int,
    updates: RestaurantUpdate,
    session: AsyncSession = Depends(get_db)
):
    """
    Update restaurant details.
    
    - **restaurant_id**: Restaurant ID
    - **updates**: Fields to update (all optional)
    
    Returns updated restaurant.
    """
    restaurant = await dal.update_restaurant(
        session,
        restaurant_id=restaurant_id,
        name=updates.name,
        description=updates.description,
        logo_data_url=updates.logo_data_url,
        primary_color=updates.primary_color,
        accent_color=updates.accent_color
    )
    
    if not restaurant:
        raise HTTPException(status_code=404, detail=f"Restaurant {restaurant_id} not found")
    
    await session.commit()
    
    return RestaurantResponse(
        id=restaurant.id,
        name=restaurant.name,
        description=restaurant.description,
        logo_data_url=restaurant.logo_data_url,
        primary_color=restaurant.primary_color,
        accent_color=restaurant.accent_color,
        created_at=restaurant.created_at
    )


@router.delete("/restaurants/{restaurant_id}", status_code=status.HTTP_200_OK)
async def delete_restaurant(
    restaurant_id: int,
    session: AsyncSession = Depends(get_db)
):
    """Delete a restaurant and its associated records."""

    deleted = await dal.delete_restaurant(session, restaurant_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Restaurant {restaurant_id} not found",
        )

    await session.commit()

    return {"status": "success", "message": f"Restaurant {restaurant_id} deleted"}


@router.post("/menus", response_model=MenuResponse)
async def create_menu(
    menu_data: MenuCreate,
    session: AsyncSession = Depends(get_db)
):
    """
    Create a new menu.
    
    - **restaurant_id**: Restaurant ID
    - **name**: Menu name
    - **description**: Optional description
    - **menu_active**: Active status
    
    Returns menu ID.
    """
    
    menu_id = await dal.create_menu(
        session,
        restaurant_id=menu_data.restaurant_id,
        name=menu_data.name,
        description=menu_data.description,
        menu_active=menu_data.menu_active
    )
    await session.commit()
    
    # Fetch the created menu
    menus = await dal.get_restaurant_menus(session, menu_data.restaurant_id)
    menu = next((m for m in menus if m.id == menu_id), None)
    
    return MenuResponse(
        id=menu.id,
        restaurant_id=menu.restaurant_id,
        name=menu.name,
        description=menu.description,
        menu_active=menu.menu_active,
        created_at=menu.created_at
    )


@router.get("/menus/restaurant/{restaurant_id}", response_model=list[MenuResponse])
async def get_restaurant_menus(
    restaurant_id: int,
    session: AsyncSession = Depends(get_db)
):
    """
    Get all menus for a restaurant.
    
    - **restaurant_id**: Restaurant ID
    
    Returns list of menus.
    """
    menus = await dal.get_restaurant_menus(session, restaurant_id)
    
    return [
        MenuResponse(
            id=m.id,
            restaurant_id=m.restaurant_id,
            name=m.name,
            description=m.description,
            menu_active=m.menu_active,
            created_at=m.created_at
        )
        for m in menus
    ]


@router.get(
    "/restaurants/{restaurant_id}/menu-sections",
    response_model=RestaurantMenuSectionsResponse,
)
async def get_restaurant_menu_sections(
    restaurant_id: int,
    session: AsyncSession = Depends(get_db),
):
    """Fetch the primary menu and its sections for a restaurant."""

    menu, sections = await dal.get_restaurant_menu_sections(session, restaurant_id)
    await session.commit()

    return RestaurantMenuSectionsResponse(
        menu=MenuResponse(
            id=menu.id,
            restaurant_id=menu.restaurant_id,
            name=menu.name,
            description=menu.description,
            menu_active=menu.menu_active,
            created_at=menu.created_at,
        ),
        sections=[MenuSectionResponse.model_validate(section) for section in sections],
    )


@router.put(
    "/restaurants/{restaurant_id}/menu-sections",
    response_model=RestaurantMenuSectionsResponse,
)
async def update_restaurant_menu_sections(
    restaurant_id: int,
    payload: MenuSectionsUpdateRequest,
    session: AsyncSession = Depends(get_db),
):
    """Replace the menu sections for a restaurant's primary menu."""

    try:
        await dal.save_restaurant_menu_sections(
            session,
            restaurant_id=restaurant_id,
            sections_payload=payload.sections,
        )
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    menu, sections = await dal.get_restaurant_menu_sections(session, restaurant_id)
    await session.commit()

    return RestaurantMenuSectionsResponse(
        menu=MenuResponse(
            id=menu.id,
            restaurant_id=menu.restaurant_id,
            name=menu.name,
            description=menu.description,
            menu_active=menu.menu_active,
            created_at=menu.created_at,
        ),
        sections=[MenuSectionResponse.model_validate(section) for section in sections],
    )


@router.post("/recipes", response_model=RecipeWithIngredients)
async def create_recipe(
    recipe_data: RecipeCreate,
    session: AsyncSession = Depends(get_db)
):
    """
    Create a new recipe with ingredients.
    
    - **restaurant_id**: Restaurant ID
    - **name**: Recipe name
    - **description**: Optional description
    - **instructions**: Optional preparation instructions
    - **menu_section_ids**: Optional list of section IDs
    - **serving_size**: Optional serving size
    - **price**: Optional price
    - **image**: Optional image URL
    - **ingredients**: Optional list of ingredients

    Returns recipe with full details.
    """

    # Create the recipe
    try:
        recipe_id = await dal.create_recipe(
            session,
            restaurant_id=recipe_data.restaurant_id,
            name=recipe_data.name,
            description=recipe_data.description,
            instructions=recipe_data.instructions,
            serving_size=recipe_data.serving_size,
            price=recipe_data.price,
            image=recipe_data.image,
            options=recipe_data.options,
            special_notes=recipe_data.special_notes,
            prominence_score=recipe_data.prominence_score,
            confirmed=recipe_data.confirmed or False,
            is_on_menu=recipe_data.is_on_menu or False,
            menu_section_ids=recipe_data.menu_section_ids,
        )
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Add ingredients if provided
    if recipe_data.ingredients:
        for ing in recipe_data.ingredients:
            substitution_provided = "substitution" in ing.model_fields_set
            if substitution_provided:
                substitution_payload = (
                    ing.substitution.model_dump(exclude_none=True)
                    if ing.substitution
                    else {}
                )
            else:
                substitution_payload = None
            await dal.add_recipe_ingredient(
                session,
                recipe_id=recipe_id,
                ingredient_id=ing.ingredient_id,
                quantity=ing.quantity,
                unit=ing.unit,
                notes=ing.notes,
                confirmed=ing.confirmed or False,
                substitution=substitution_payload,
                substitution_provided=substitution_provided,
            )
            if ing.ingredient_name:
                await dal.update_ingredient_name(
                    session,
                    ingredient_id=ing.ingredient_id,
                    name=ing.ingredient_name,
                )

    await session.commit()
    
    # Fetch the created recipe with details
    recipe_dict = await dal.get_recipe_with_details(session, recipe_id)
    
    return RecipeWithIngredients(**recipe_dict)


@router.get("/recipes/{recipe_id}", response_model=RecipeWithIngredients)
async def get_recipe(
    recipe_id: int,
    session: AsyncSession = Depends(get_db)
):
    """
    Get recipe with full ingredient details and allergens.
    
    - **recipe_id**: Recipe ID
    
    Returns recipe with ingredients and allergens.
    """
    recipe_dict = await dal.get_recipe_with_details(session, recipe_id)
    
    if not recipe_dict:
        raise HTTPException(status_code=404, detail=f"Recipe with ID {recipe_id} not found")
    
    return RecipeWithIngredients(**recipe_dict)


@router.get("/recipes/restaurant/{restaurant_id}", response_model=list[RecipeWithIngredients])
async def get_restaurant_recipes(
    restaurant_id: int,
    session: AsyncSession = Depends(get_db)
):
    """
    Get all recipes for a restaurant with full details.
    
    - **restaurant_id**: Restaurant ID
    
    Returns list of recipes with ingredients.
    """
    recipes = await dal.get_restaurant_recipes(session, restaurant_id)
    
    # Fetch details for each recipe
    result = []
    for recipe in recipes:
        recipe_dict = await dal.get_recipe_with_details(session, recipe.id)
        if recipe_dict:
            result.append(RecipeWithIngredients(**recipe_dict))
    
    return result


@router.put("/recipes/{recipe_id}", response_model=RecipeWithIngredients)
async def update_recipe(
    recipe_id: int,
    recipe_data: RecipeUpdate,
    session: AsyncSession = Depends(get_db)
):
    """
    Update a recipe.
    
    - **recipe_id**: Recipe ID
    - **name**: Optional recipe name
    - **description**: Optional description
    - **instructions**: Optional preparation instructions
    - **menu_section_ids**: Optional list of section IDs
    - **serving_size**: Optional serving size
    - **price**: Optional price
    - **image**: Optional image URL

    Returns updated recipe with full details.
    """

    # Update the recipe
    try:
        updated_recipe = await dal.update_recipe(
            session,
            recipe_id=recipe_id,
            **recipe_data.model_dump(exclude_unset=True)
        )
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated_recipe:
        raise HTTPException(status_code=404, detail=f"Recipe with ID {recipe_id} not found")
    
    await session.commit()
    
    # Fetch the updated recipe with details
    recipe_dict = await dal.get_recipe_with_details(session, recipe_id)
    
    return RecipeWithIngredients(**recipe_dict)


@router.delete("/recipes/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    session: AsyncSession = Depends(get_db)
):
    """
    Delete a recipe.
    
    - **recipe_id**: Recipe ID
    
    Returns success status.
    """
    deleted = await dal.delete_recipe(session, recipe_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Recipe with ID {recipe_id} not found")
    
    await session.commit()
    
    return {"status": "success", "message": f"Recipe {recipe_id} deleted"}


# ============================================================================
# Menu upload pipeline routes
# ============================================================================


@router.post(
    "/menu-uploads",
    response_model=MenuUploadCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_menu_upload(
    restaurant_id: int = Form(...),
    source_type: MenuUploadSourceType = Form(...),
    user_id: Optional[int] = Form(None),
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_db),
):
    """Create a menu upload and trigger LLM processing."""

    try:
        upload = await menu_upload_service.create_upload(
            session,
            restaurant_id=restaurant_id,
            user_id=user_id,
            source_type=source_type,
            file=file,
            url=url,
        )
        response = await menu_upload_service.process_upload(session, upload)
        await session.commit()
        return response
    except HTTPException:
        await session.rollback()
        raise
    except Exception as exc:  # pylint: disable=broad-except
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/menu-uploads/{upload_id}", response_model=MenuUploadResponse)
async def get_menu_upload(
    upload_id: int,
    session: AsyncSession = Depends(get_db),
):
    """Fetch a menu upload with stage details."""

    upload = await menu_upload_service.fetch_upload(session, upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Menu upload not found")
    return menu_upload_service.build_summary(upload)


@router.get(
    "/menu-uploads/restaurant/{restaurant_id}",
    response_model=list[MenuUploadResponse],
)
async def list_menu_uploads(
    restaurant_id: int,
    session: AsyncSession = Depends(get_db),
):
    """List uploads for a restaurant ordered by most recent."""

    return await menu_upload_service.list_uploads_for_restaurant(session, restaurant_id)


# ============================================================================
# LLM Extraction endpoint (Stage 1)
# ============================================================================


@router.post("/llm/extract-menu")
async def extract_menu_items(
    request: dict,
):
    """Call Gemini to extract dishes and return normalized JSON structure.

    Contract expected by menu_upload_service:
    - Request may contain url OR filename + content_base64 for image/pdf.
    - Response: { "recipes": [ { name, description?, category?, section_header?, options?, special_notes?, allergen_notes?, persons?, prominence?, price?, currency? } ] }
    """

    source_type = request.get("source_type")
    url = request.get("url")
    filename = request.get("filename")
    content_base64 = request.get("content_base64")

    # Build prompt (compressed from the latest menu extraction specification)
    prompt = (
        "You are an expert menu analyst. Extract real menu offerings from the provided content and return them as JSON.\n"
        "STRICT REQUIREMENTS:\n"
        "- Only include dishes, drinks, or items a guest can order.\n"
        "- Ignore ingredient, allergen, or spice lists that are not actual menu items.\n"
        "- Do not output duplicate items; keep the most complete variant.\n"
        "- Record the menu section header for each item when available.\n"
        "- Capture allergen warnings or notes exactly as written.\n"
        "- Capture how many persons the item serves when the menu states it.\n\n"
        "Output MUST be a JSON object with this schema:\n"
        "{\n"
        "  \"recipes\": [\n"
        "    {\n"
        "      \"title\": \"Dish Name\",\n"
        "      \"description\": \"...\",\n"
        "      \"category\": \"Appetizers\",\n"
        "      \"section_header\": \"Starters\",\n"
        "      \"price\": 12.5,\n"
        "      \"currency\": \"EUR\",\n"
        "      \"options\": [\"Add avocado\"],\n"
        "      \"special_notes\": \"Chef signature dish\",\n"
        "      \"allergen_notes\": \"Contains nuts\",\n"
        "      \"persons\": 2,\n"
        "      \"prominence\": 0.8\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Formatting rules:\n"
        "- Always return an object with the key \"recipes\" (use an empty array if nothing is found).\n"
        "- Use null for unknown scalar values and [] for missing arrays.\n"
        "- Represent numeric data such as price, persons, and prominence as numbers when available.\n"
        "- Output only strict JSON (double quotes, no comments, no markdown or prose before/after)."
    )

    client = GeminiClient()

    # Map to inline or url usage. We don't prefetch URLs; Gemini handles them if provided as text.
    if source_type == "url" and url:
        items = await client.extract_from_payload(prompt=prompt, url=url)
    elif source_type in {"image", "pdf"} and content_base64 and filename:
        # Best-effort MIME
        mime = "application/pdf" if source_type == "pdf" else "image/*"
        items = await client.extract_from_payload(
            prompt=prompt,
            inline_mime_type=mime,
            inline_base64=content_base64,
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid payload for extraction")

    # Normalize to pipeline fields expected by menu_upload_service
    normalized = []

    def _stringify(value: Optional[object]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, list):
            parts = [str(part).strip() for part in value if str(part).strip()]
            return ", ".join(parts) if parts else None
        text = str(value).strip()
        return text or None

    def _parse_persons(value: Optional[object]) -> Optional[int]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(value) if value > 0 else None
        text = str(value).strip()
        if not text:
            return None
        try:
            number = float(text)
            return int(number) if number > 0 else None
        except ValueError:
            match = re.search(r"\d+", text)
            return int(match.group()) if match else None

    raw_items = items or []
    if isinstance(raw_items, dict):
        raw_items = raw_items.get("recipes") or raw_items.get("items") or []
    if not isinstance(raw_items, list):
        raw_items = []

    for item in raw_items:
        if not isinstance(item, dict):
            continue
        title = item.get("title") or item.get("name")
        if not title:
            continue
        name = _stringify(title)
        if not name:
            continue

        options_value = item.get("options")
        if options_value is None:
            options_value = item.get("extras")
        if isinstance(options_value, list):
            options = options_value
        elif options_value is None:
            options = None
        else:
            options = [options_value]

        prominence_value = item.get("prominence") or item.get("score")
        try:
            prominence = float(prominence_value) if prominence_value is not None else None
        except (TypeError, ValueError):
            prominence = None

        allergen_notes = _stringify(
            item.get("allergen_notes")
            or item.get("allergen_warning")
            or item.get("allergen_warnings")
            or item.get("allergen_note")
            or item.get("allergens")
        )

        section_header = _stringify(
            item.get("section_header")
            or item.get("section")
            or item.get("menu_section")
            or item.get("heading")
        )

        normalized.append(
            {
                "name": name,
                "description": _stringify(item.get("description")),
                "category": _stringify(item.get("category")),
                "section_header": section_header,
                "options": options,
                "special_notes": _stringify(item.get("notes") or item.get("special_notes")),
                "prominence": prominence,
                "price": item.get("price"),
                "currency": _stringify(item.get("currency")),
                "allergen_notes": allergen_notes,
                "persons": _parse_persons(
                    item.get("persons")
                    or item.get("serves")
                    or item.get("servings")
                    or item.get("serves_persons")
                ),
            }
        )

    return {"recipes": normalized}


# ============================================================================
# LLM Ingredient Deduction endpoint (Stage 2)
# ============================================================================


@router.post("/llm/deduce-ingredients")
async def deduce_recipe_ingredients(request: dict):
    """Call Gemini to infer ingredients for each recipe.
    
    Request: { "recipes": [{"name": "Pizza Margherita", "recipe_id": 123, "description": "Fresh egg pasta...", "price": "€14"}, ...] }
    Response: { "recipes": [{"name": "Pizza Margherita", "ingredients": [...]}, ...] }
    """
    
    recipes = request.get("recipes", [])
    if not recipes:
        raise HTTPException(status_code=400, detail="No recipes provided")

    def _clean_text(value: Optional[object]) -> Optional[str]:
        if value is None:
            return None
        text = str(value)
        text = re.sub(r"\s+", " ", text)
        text = text.strip()
        return text or None

    recipe_entries: list[str] = []
    for recipe in recipes:
        if not isinstance(recipe, dict):
            continue
        name = _clean_text(recipe.get("name"))
        if not name:
            continue
        recipe_id = recipe.get("recipe_id")
        description = _clean_text(recipe.get("description"))
        price = _clean_text(recipe.get("price"))
        entry_lines = [f"- Name: {name}"]
        if recipe_id is not None:
            entry_lines.append(f"  Recipe ID: {recipe_id}")
        if description:
            entry_lines.append(f"  Description: {description}")
        if price:
            entry_lines.append(f"  Price: {price}")
        recipe_entries.append("\n".join(entry_lines))

    if not recipe_entries:
        raise HTTPException(status_code=400, detail="No valid recipe names found")

    # Build the prompt for Stage 2
    prompt = dedent(
        f"""
        For each recipe entry provided, infer the ingredients needed to make it for 1 person.
        Each entry includes the dish name and may include descriptions or other context—use those details when determining the ingredient list.
        Use these canonical allergen and animal markers exactly as provided:
        {CANONICAL_ALLERGEN_MARKERS_PROMPT}

        Return a JSON object with this structure:

        {{
          "recipes": [
            {{
              "recipe_id": 123,
              "name": "Recipe Name",
              "ingredients": [
                {{
                  "name": "ingredient name",
                  "quantity": 0.0,
                  "unit": "g/ml/piece/etc",
                  "allergens": [
                    {{"allergen": "marker_id", "certainty": "certain|probable"}}
                  ]
                }}
              ]
            }}
          ]
        }}

        Rules:
        - CRITICAL: Preserve the exact recipe_id from the input for each recipe in your response
        - CRITICAL: Return the recipe name EXACTLY as provided in the input (do not modify spelling or wording)
        - Quantities must be metric (grams, milliliters, pieces)
        - Base quantities on 1 person serving
        - Use ONLY singular, specific ingredient names (NOT "pancetta or bacon" - choose ONE)
        - Choose the most common/traditional ingredient variant
        - Each ingredient's "allergens" must be a JSON array of objects shaped exactly like {{"allergen": "<marker>", "certainty": "<certain|probable>"}}
        - Allowed markers are ONLY the canonical ids listed above
        - Use "certain" when the allergen or marker is definitely present in the ingredient; use "probable" when it is likely but not guaranteed (e.g., shared fryers or garnish risk)
        - Include the "vegan" marker whenever an ingredient uses any animal-derived product (dairy, eggs, honey, meat, seafood, gelatin, etc.)
        - Include the "vegetarian" marker only when an ingredient contains meat, seafood, or gelatin that makes it unsuitable for vegetarians
        - Don't infer anything else and return only valid JSON with no prose

        Recipe entries:
        """
    ) + "\n".join(recipe_entries)
    
    client = GeminiClient()
    
    # Call Gemini API
    result = await client.extract_from_payload(prompt=prompt, text="")
    
    # The client returns a list, but we need to check if it's wrapped in a recipes key
    if isinstance(result, list) and result:
        # If result is a list of recipe objects, wrap it
        return {"recipes": result}
    elif isinstance(result, dict) and "recipes" in result:
        return result
    else:
        # Return the recipes with empty ingredients as fallback
        return {
            "recipes": [
                {"name": recipe.get("name"), "ingredients": []}
                for recipe in recipes
            ]
        }


@router.post("/recipes/{recipe_id}/ingredients")
async def add_recipe_ingredient(
    recipe_id: int,
    ingredient_data: RecipeIngredientRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Add or update an ingredient in a recipe.
    
    - **recipe_id**: Recipe ID
    - **ingredient_id**: Ingredient ID
    - **quantity**: Optional quantity
    - **unit**: Optional unit
    - **notes**: Optional notes
    
    Returns success status.
    """
    # Verify recipe exists
    recipe = await dal.get_recipe_by_id(session, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail=f"Recipe with ID {recipe_id} not found")
    
    substitution_provided = "substitution" in ingredient_data.model_fields_set
    substitution_payload = (
        ingredient_data.substitution.model_dump(exclude_none=True)
        if ingredient_data.substitution
        else {}
    ) if substitution_provided else None

    await dal.add_recipe_ingredient(
        session,
        recipe_id=recipe_id,
        ingredient_id=ingredient_data.ingredient_id,
        quantity=ingredient_data.quantity,
        unit=ingredient_data.unit,
        notes=ingredient_data.notes,
        confirmed=ingredient_data.confirmed or False,
        substitution=substitution_payload,
        substitution_provided=substitution_provided,
    )

    if ingredient_data.ingredient_name:
        updated = await dal.update_ingredient_name(
            session,
            ingredient_id=ingredient_data.ingredient_id,
            name=ingredient_data.ingredient_name,
        )
        if not updated:
            raise HTTPException(
                status_code=404,
                detail=f"Ingredient with ID {ingredient_data.ingredient_id} not found",
            )

    await session.commit()

    return {"status": "success", "message": "Ingredient added to recipe"}


@router.put("/recipes/{recipe_id}/ingredients/{ingredient_id}")
async def update_recipe_ingredient(
    recipe_id: int,
    ingredient_id: int,
    ingredient_data: RecipeIngredientRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Update an ingredient in a recipe.
    
    - **recipe_id**: Recipe ID
    - **ingredient_id**: Ingredient ID
    - **quantity**: Optional quantity
    - **unit**: Optional unit
    - **notes**: Optional notes
    - **confirmed**: Optional confirmation status
    
    Returns success status.
    """
    # Verify recipe exists
    recipe = await dal.get_recipe_by_id(session, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail=f"Recipe with ID {recipe_id} not found")
    
    # Update via add_recipe_ingredient (which does upsert)
    substitution_provided = "substitution" in ingredient_data.model_fields_set
    substitution_payload = (
        ingredient_data.substitution.model_dump(exclude_none=True)
        if ingredient_data.substitution
        else {}
    ) if substitution_provided else None

    await dal.add_recipe_ingredient(
        session,
        recipe_id=recipe_id,
        ingredient_id=ingredient_id,
        quantity=ingredient_data.quantity,
        unit=ingredient_data.unit,
        notes=ingredient_data.notes,
        confirmed=ingredient_data.confirmed if ingredient_data.confirmed is not None else False,
        substitution=substitution_payload,
        substitution_provided=substitution_provided,
    )

    target_ingredient_id = ingredient_data.ingredient_id or ingredient_id
    if ingredient_data.ingredient_name:
        updated = await dal.update_ingredient_name(
            session,
            ingredient_id=target_ingredient_id,
            name=ingredient_data.ingredient_name,
        )
        if not updated:
            raise HTTPException(
                status_code=404,
                detail=f"Ingredient with ID {target_ingredient_id} not found",
            )

    await session.commit()

    return {"status": "success", "message": "Ingredient updated"}

