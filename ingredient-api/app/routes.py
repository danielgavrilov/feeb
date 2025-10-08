"""
FastAPI route handlers for ingredient and allergen lookups.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .database import get_db
from .models import IngredientWithAllergens, ProductWithDetails, HealthResponse
from . import dal

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

