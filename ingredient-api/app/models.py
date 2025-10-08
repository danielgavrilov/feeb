"""
SQLAlchemy ORM models for ingredients, allergens, and products.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, Integer, String, TIMESTAMP, ForeignKey, 
    DECIMAL, UniqueConstraint, Index, func
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from pydantic import BaseModel, ConfigDict
from .database import Base


# ============================================================================
# SQLAlchemy ORM Models
# ============================================================================

class Ingredient(Base):
    """OFF taxonomy ingredient with hierarchical structure."""
    __tablename__ = "ingredient"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    code = mapped_column(String(255), unique=True, nullable=False, index=True)
    name = mapped_column(String(500), nullable=False, index=True)
    parent_code = mapped_column(String(255), nullable=True)
    allergen_code = mapped_column(String(255), nullable=True)
    source = mapped_column(String(50), nullable=False, default="off", index=True)
    last_updated = mapped_column(TIMESTAMP, default=func.now(), onupdate=func.now())
    
    # Relationships
    allergens: Mapped[List["IngredientAllergen"]] = relationship(
        "IngredientAllergen", back_populates="ingredient", cascade="all, delete-orphan"
    )
    product_links: Mapped[List["ProductIngredient"]] = relationship(
        "ProductIngredient", back_populates="ingredient", cascade="all, delete-orphan"
    )


class Allergen(Base):
    """Allergen taxonomy from OpenFoodFacts."""
    __tablename__ = "allergen"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    code = mapped_column(String(255), unique=True, nullable=False, index=True)
    name = mapped_column(String(500), nullable=False, index=True)
    category = mapped_column(String(100), nullable=True)
    severity_level = mapped_column(String(50), nullable=True)
    
    # Relationships
    ingredients: Mapped[List["IngredientAllergen"]] = relationship(
        "IngredientAllergen", back_populates="allergen", cascade="all, delete-orphan"
    )
    product_links: Mapped[List["ProductAllergen"]] = relationship(
        "ProductAllergen", back_populates="allergen", cascade="all, delete-orphan"
    )


class IngredientAllergen(Base):
    """Many-to-many link between ingredients and allergens."""
    __tablename__ = "ingredient_allergen"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    ingredient_id = mapped_column(Integer, ForeignKey("ingredient.id"), nullable=False)
    allergen_id = mapped_column(Integer, ForeignKey("allergen.id"), nullable=False)
    certainty = mapped_column(String(50), default="direct")  # direct, inferred, possible
    source = mapped_column(String(50), nullable=False, default="off")
    
    # Relationships
    ingredient: Mapped["Ingredient"] = relationship("Ingredient", back_populates="allergens")
    allergen: Mapped["Allergen"] = relationship("Allergen", back_populates="ingredients")
    
    __table_args__ = (
        UniqueConstraint("ingredient_id", "allergen_id", "source", name="uq_ingredient_allergen_source"),
    )


class Product(Base):
    """Product information from OpenFoodFacts."""
    __tablename__ = "product"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    barcode = mapped_column(String(50), unique=True, nullable=False, index=True)
    name = mapped_column(String(500), nullable=False)
    brand = mapped_column(String(255), nullable=True)
    lang = mapped_column(String(10), default="en")
    created_at = mapped_column(TIMESTAMP, default=func.now())
    last_modified_at = mapped_column(TIMESTAMP, nullable=True)
    
    # Relationships
    ingredients: Mapped[List["ProductIngredient"]] = relationship(
        "ProductIngredient", back_populates="product", cascade="all, delete-orphan"
    )
    allergens: Mapped[List["ProductAllergen"]] = relationship(
        "ProductAllergen", back_populates="product", cascade="all, delete-orphan"
    )


class ProductIngredient(Base):
    """Many-to-many link between products and ingredients."""
    __tablename__ = "product_ingredient"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    ingredient_id = mapped_column(Integer, ForeignKey("ingredient.id"), nullable=False)
    percent_estimate = mapped_column(DECIMAL(5, 2), nullable=True)
    rank = mapped_column(Integer, nullable=True)
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship("Ingredient", back_populates="product_links")
    
    __table_args__ = (
        UniqueConstraint("product_id", "ingredient_id", name="uq_product_ingredient"),
    )


class ProductAllergen(Base):
    """Denormalized product-allergen link for fast lookups."""
    __tablename__ = "product_allergen"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    allergen_id = mapped_column(Integer, ForeignKey("allergen.id"), nullable=False)
    relation_type = mapped_column(String(50), nullable=False)  # contains, may_contain, traces
    source = mapped_column(String(50), nullable=False, default="off")
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="allergens")
    allergen: Mapped["Allergen"] = relationship("Allergen", back_populates="product_links")
    
    __table_args__ = (
        UniqueConstraint("product_id", "allergen_id", "relation_type", name="uq_product_allergen_relation"),
    )


# ============================================================================
# Pydantic Response Models
# ============================================================================

class AllergenResponse(BaseModel):
    """Allergen information in API responses."""
    code: str
    name: str
    certainty: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class IngredientResponse(BaseModel):
    """Ingredient information in API responses."""
    code: str
    name: str
    source: str
    last_updated: datetime
    
    model_config = ConfigDict(from_attributes=True)


class IngredientWithAllergens(BaseModel):
    """Ingredient with associated allergens."""
    ingredient: IngredientResponse
    allergens: List[AllergenResponse]


class ProductIngredientResponse(BaseModel):
    """Product ingredient with rank."""
    name: str
    rank: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProductAllergenResponse(BaseModel):
    """Product allergen with relation type."""
    name: str
    relation_type: str
    
    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    """Product basic information."""
    barcode: str
    name: str
    brand: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProductWithDetails(BaseModel):
    """Product with ingredients and allergens."""
    product: ProductResponse
    ingredients: List[ProductIngredientResponse]
    allergens: List[ProductAllergenResponse]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    db_connected: bool

