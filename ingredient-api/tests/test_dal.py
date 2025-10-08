"""
Tests for data access layer (DAL).
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.database import Base
from app import dal
from app.models import Ingredient, Allergen


# Test database URL (use in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def test_session():
    """Create a test database session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    TestSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with TestSessionLocal() as session:
        yield session
    
    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.mark.asyncio
async def test_insert_allergen(test_session):
    """Test inserting an allergen."""
    allergen_id = await dal.insert_allergen(
        test_session,
        code="en:gluten",
        name="Gluten",
        category="grain"
    )
    
    assert allergen_id is not None
    assert allergen_id > 0
    
    # Verify insertion
    allergen = await dal.get_allergen_by_code(test_session, "en:gluten")
    assert allergen is not None
    assert allergen.name == "Gluten"
    assert allergen.category == "grain"


@pytest.mark.asyncio
async def test_insert_ingredient(test_session):
    """Test inserting an ingredient."""
    ingredient_id = await dal.insert_ingredient(
        test_session,
        code="en:wheat-flour",
        name="Wheat flour",
        parent_code="en:wheat",
        allergen_code="en:gluten"
    )
    
    assert ingredient_id is not None
    assert ingredient_id > 0
    
    # Verify insertion
    ingredient = await dal.get_ingredient_by_code(test_session, "en:wheat-flour")
    assert ingredient is not None
    assert ingredient.name == "Wheat flour"
    assert ingredient.parent_code == "en:wheat"


@pytest.mark.asyncio
async def test_link_ingredient_allergen(test_session):
    """Test linking ingredient to allergen."""
    # Create allergen
    allergen_id = await dal.insert_allergen(
        test_session,
        code="en:gluten",
        name="Gluten"
    )
    
    # Create ingredient
    ingredient_id = await dal.insert_ingredient(
        test_session,
        code="en:wheat-flour",
        name="Wheat flour"
    )
    
    # Link them
    await dal.link_ingredient_allergen(
        test_session,
        ingredient_id=ingredient_id,
        allergen_id=allergen_id,
        certainty="direct"
    )
    
    await test_session.commit()
    
    # Verify link via get_ingredient_by_name
    result = await dal.get_ingredient_by_name(test_session, "Wheat flour", exact=True)
    
    assert result is not None
    assert len(result.allergens) == 1
    assert result.allergens[0].code == "en:gluten"
    assert result.allergens[0].certainty == "direct"


@pytest.mark.asyncio
async def test_get_ingredient_by_name_exact(test_session):
    """Test exact ingredient lookup."""
    # Create ingredient
    await dal.insert_ingredient(
        test_session,
        code="en:wheat-flour",
        name="Wheat flour"
    )
    await test_session.commit()
    
    # Exact match should work
    result = await dal.get_ingredient_by_name(test_session, "Wheat flour", exact=True)
    assert result is not None
    
    # Case-sensitive exact match should fail
    result = await dal.get_ingredient_by_name(test_session, "wheat flour", exact=True)
    assert result is None


@pytest.mark.asyncio
async def test_get_ingredient_by_name_fuzzy(test_session):
    """Test fuzzy ingredient lookup."""
    # Create ingredient
    await dal.insert_ingredient(
        test_session,
        code="en:wheat-flour",
        name="Wheat flour"
    )
    await test_session.commit()
    
    # Partial match should work
    result = await dal.get_ingredient_by_name(test_session, "wheat", exact=False)
    assert result is not None
    
    # Case-insensitive should work
    result = await dal.get_ingredient_by_name(test_session, "WHEAT", exact=False)
    assert result is not None

