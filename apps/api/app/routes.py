"""
FastAPI route handlers for ingredient and allergen lookups.
"""

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
    MenuCreate,
    MenuResponse,
    RecipeCreate,
    RecipeUpdate,
    RecipeWithIngredients,
    RecipeIngredientRequest,
    MenuUploadCreateResponse,
    MenuUploadResponse,
    MenuUploadSourceType,
)
from . import dal
from .services.menu_upload import menu_upload_service
from .services.gemini_client import GeminiClient

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
            created_at=r.created_at
        )
        for r in restaurants
    ]


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
    - **menu_category**: Optional menu category
    - **serving_size**: Optional serving size
    - **price**: Optional price
    - **image**: Optional image URL
    - **ingredients**: Optional list of ingredients
    
    Returns recipe with full details.
    """
    
    # Create the recipe
    recipe_id = await dal.create_recipe(
        session,
        restaurant_id=recipe_data.restaurant_id,
        name=recipe_data.name,
        description=recipe_data.description,
        instructions=recipe_data.instructions,
        menu_category=recipe_data.menu_category,
        serving_size=recipe_data.serving_size,
        price=recipe_data.price,
        image=recipe_data.image,
        options=recipe_data.options,
        special_notes=recipe_data.special_notes,
        prominence_score=recipe_data.prominence_score,
        confirmed=recipe_data.confirmed or False
    )

    # Add ingredients if provided
    if recipe_data.ingredients:
        for ing in recipe_data.ingredients:
            await dal.add_recipe_ingredient(
                session,
                recipe_id=recipe_id,
                ingredient_id=ing.ingredient_id,
                quantity=ing.quantity,
                unit=ing.unit,
                notes=ing.notes,
                confirmed=ing.confirmed or False
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
    - **menu_category**: Optional menu category
    - **serving_size**: Optional serving size
    - **price**: Optional price
    - **image**: Optional image URL
    
    Returns updated recipe with full details.
    """
    
    # Update the recipe
    updated_recipe = await dal.update_recipe(
        session,
        recipe_id=recipe_id,
        **recipe_data.model_dump(exclude_unset=True)
    )
    
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
    - Response: { "recipes": [ { name, description?, category?, options?, special_notes?, prominence? } ] }
    """

    source_type = request.get("source_type")
    url = request.get("url")
    filename = request.get("filename")
    content_base64 = request.get("content_base64")

    # Build prompt from stage.plan.md (compressed to single instruction)
    prompt = (
        "Extract all menu items from the attached PDF or provided URL and output them as a JSON array. "
        "Each item must include: title, price (float if present), currency (if available otherwise €), description, "
        "category, options (list), notes (list). Do not infer missing info. Return only a valid JSON array with no prose."
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
    for item in items or []:
        if not isinstance(item, dict):
            continue
        title = item.get("title") or item.get("name")
        if not title:
            continue
        normalized.append(
            {
                "name": str(title).strip(),
                "description": (item.get("description") or None),
                "category": (item.get("category") or None),
                "options": (item.get("options") or None),
                "special_notes": (item.get("notes") or item.get("special_notes") or None),
                "prominence": item.get("prominence") or item.get("score"),
                "price": item.get("price"),
                "currency": item.get("currency"),
            }
        )

    return {"recipes": normalized}


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
    
    await dal.add_recipe_ingredient(
        session,
        recipe_id=recipe_id,
        ingredient_id=ingredient_data.ingredient_id,
        quantity=ingredient_data.quantity,
        unit=ingredient_data.unit,
        notes=ingredient_data.notes,
        confirmed=ingredient_data.confirmed or False
    )
    
    await session.commit()
    
    return {"status": "success", "message": "Ingredient added to recipe"}

