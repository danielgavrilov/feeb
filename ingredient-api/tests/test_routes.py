"""
Tests for FastAPI routes.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.main import app
from app.database import Base, get_db
from app import dal


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def test_session():
    """Create a test database session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    TestSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with TestSessionLocal() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def client(test_session):
    """Create test client with dependency override."""
    
    async def override_get_db():
        yield test_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] in ["ok", "degraded"]
    assert "db_connected" in data


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test root endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert "name" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_get_ingredient_not_found(client):
    """Test ingredient lookup when not found."""
    response = await client.get("/ingredients/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_ingredient_success(client, test_session):
    """Test successful ingredient lookup."""
    # Create allergen and ingredient
    allergen_id = await dal.insert_allergen(
        test_session,
        code="en:gluten",
        name="Gluten"
    )
    
    ingredient_id = await dal.insert_ingredient(
        test_session,
        code="en:wheat-flour",
        name="Wheat flour"
    )
    
    await dal.link_ingredient_allergen(
        test_session,
        ingredient_id=ingredient_id,
        allergen_id=allergen_id,
        certainty="direct"
    )
    
    await test_session.commit()
    
    # Test exact match
    response = await client.get("/ingredients/Wheat flour?exact=true")
    assert response.status_code == 200
    
    data = response.json()
    assert data["ingredient"]["code"] == "en:wheat-flour"
    assert data["ingredient"]["name"] == "Wheat flour"
    assert len(data["allergens"]) == 1
    assert data["allergens"][0]["code"] == "en:gluten"


@pytest.mark.asyncio
async def test_get_product_not_found(client):
    """Test product lookup when not found."""
    response = await client.get("/products/0000000000000")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_product_success(client, test_session):
    """Test successful product lookup."""
    # Create product with ingredients and allergens
    allergen_id = await dal.insert_allergen(
        test_session,
        code="en:milk",
        name="Milk"
    )
    
    ingredient_id = await dal.insert_ingredient(
        test_session,
        code="en:sugar",
        name="Sugar"
    )
    
    product_id = await dal.insert_product(
        test_session,
        barcode="123456789",
        name="Test Product",
        brand="Test Brand"
    )
    
    await dal.link_product_ingredient(
        test_session,
        product_id=product_id,
        ingredient_id=ingredient_id,
        rank=1
    )
    
    await dal.link_product_allergen(
        test_session,
        product_id=product_id,
        allergen_id=allergen_id,
        relation_type="contains"
    )
    
    await test_session.commit()
    
    # Test lookup
    response = await client.get("/products/123456789")
    assert response.status_code == 200
    
    data = response.json()
    assert data["product"]["barcode"] == "123456789"
    assert data["product"]["name"] == "Test Product"
    assert len(data["ingredients"]) == 1
    assert data["ingredients"][0]["name"] == "Sugar"
    assert len(data["allergens"]) == 1
    assert data["allergens"][0]["name"] == "Milk"

