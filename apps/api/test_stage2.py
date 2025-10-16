"""
Test script for Stage 2 implementation - Ingredient Deduction

This script tests the full menu upload pipeline including:
1. Stage 1: Menu extraction from URL
2. Stage 2: Ingredient deduction for each recipe

Usage:
    python test_stage2.py
"""

import asyncio
import httpx


async def test_stage2():
    """Test the full menu upload pipeline with Stage 2 enabled."""
    
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient(timeout=180.0) as client:
        print("=" * 60)
        print("Testing Menu Upload Pipeline (Stage 1 + Stage 2)")
        print("=" * 60)
        
        # Upload menu
        print("\n1. Uploading menu from URL...")
        response = await client.post(
            f"{base_url}/menu-uploads",
            data={
                "restaurant_id": 1,
                "source_type": "url",
                "url": "https://www.humm.love/menu"
            }
        )
        
        if response.status_code != 201:
            print(f"❌ Upload failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        result = response.json()
        upload_id = result["id"]
        
        print(f"✅ Upload created: ID={upload_id}")
        print(f"   Status: {result['status']}")
        print(f"   Recipes created: {len(result.get('created_recipe_ids', []))}")
        
        # Check stage details
        print("\n2. Stage completion status:")
        for stage in result.get("stages", []):
            status = stage["status"]
            stage_name = stage["stage"]
            icon = "✅" if status == "completed" else "⏳" if status == "running" else "⚠️"
            print(f"   {icon} {stage_name}: {status}")
            if stage.get("details"):
                print(f"      Details: {stage['details']}")
            if stage.get("error_message"):
                print(f"      Error: {stage['error_message']}")
        
        # Check if ingredients were added
        print("\n3. Checking recipe ingredients:")
        recipe_ids = result.get('created_recipe_ids', [])
        
        if not recipe_ids:
            print("   ⚠️  No recipes were created")
            return
        
        total_ingredients = 0
        for recipe_id in recipe_ids[:5]:  # Check first 5 recipes
            try:
                recipe_response = await client.get(f"{base_url}/recipes/{recipe_id}")
                if recipe_response.status_code == 200:
                    recipe = recipe_response.json()
                    ingredient_count = len(recipe.get('ingredients', []))
                    total_ingredients += ingredient_count
                    
                    print(f"   Recipe {recipe_id}: {recipe['name']}")
                    print(f"      └─ {ingredient_count} ingredients")
                    
                    # Show first 3 ingredients
                    for ing in recipe.get('ingredients', [])[:3]:
                        qty = ing.get('quantity', 'N/A')
                        unit = ing.get('unit', '')
                        allergens = ing.get('allergens', [])
                        print(f"         • {ing['name']} ({qty} {unit})")
                        if allergens:
                            print(f"           Allergens: {allergens}")
                else:
                    print(f"   ⚠️  Failed to fetch recipe {recipe_id}")
            except Exception as e:
                print(f"   ❌ Error fetching recipe {recipe_id}: {e}")
        
        print("\n" + "=" * 60)
        print("Summary:")
        print(f"  Total recipes: {len(recipe_ids)}")
        print(f"  Total ingredients (first 5 recipes): {total_ingredients}")
        print(f"  Stage 2 status: {result.get('stage2_completed_at') and 'Completed' or 'Not completed'}")
        print("=" * 60)


async def test_deduction_endpoint():
    """Test the ingredient deduction endpoint directly."""
    
    base_url = "http://localhost:8000"
    
    print("\n" + "=" * 60)
    print("Testing Ingredient Deduction Endpoint Directly")
    print("=" * 60)
    
    test_recipes = [
        {"name": "Margherita Pizza", "recipe_id": 1},
        {"name": "Caesar Salad", "recipe_id": 2},
        {"name": "Spaghetti Carbonara", "recipe_id": 3},
    ]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        print(f"\nSending {len(test_recipes)} recipes for ingredient deduction...")
        
        response = await client.post(
            f"{base_url}/llm/deduce-ingredients",
            json={"recipes": test_recipes}
        )
        
        if response.status_code != 200:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        result = response.json()
        print("✅ Response received\n")
        
        for recipe in result.get("recipes", []):
            print(f"Recipe: {recipe['name']}")
            ingredients = recipe.get("ingredients", [])
            print(f"  Ingredients ({len(ingredients)}):")
            for ing in ingredients[:5]:  # Show first 5
                qty = ing.get('quantity', 'N/A')
                unit = ing.get('unit', '')
                allergens = ing.get('allergens', [])
                print(f"    • {ing['name']} - {qty} {unit}")
                if allergens:
                    print(f"      Allergens: {', '.join(allergens)}")
            if len(ingredients) > 5:
                print(f"    ... and {len(ingredients) - 5} more")
            print()


async def main():
    """Run all tests."""
    
    print("\n🧪 Stage 2 Implementation Test Suite\n")
    
    try:
        # Test 1: Direct endpoint test
        await test_deduction_endpoint()
        
        # Test 2: Full pipeline test
        await test_stage2()
        
    except httpx.ConnectError:
        print("\n❌ Error: Could not connect to API server")
        print("   Make sure the API is running on http://localhost:8000")
        print("   Run: cd apps/api && uvicorn app.main:app --reload")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

