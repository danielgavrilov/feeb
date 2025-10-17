#!/usr/bin/env python3
"""
Quick viewer for menu extraction tables.
Usage: python view_menu_data.py
"""

import asyncio
import pandas as pd
from sqlalchemy import text
from app.database import AsyncSessionLocal


async def view_table(table_name: str, limit: int = 10):
    """View the first N rows of a table in a pandas-like format."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(text(f"SELECT * FROM {table_name} LIMIT {limit}"))
        rows = result.fetchall()
        columns = result.keys()
        
        if not rows:
            print(f"\n📊 {table_name.upper()} (0 rows)")
            print("  Table is empty")
            return
        
        df = pd.DataFrame(rows, columns=columns)
        print(f"\n📊 {table_name.upper()} ({len(rows)} rows shown)")
        print("=" * 100)
        print(df.to_string(index=False))
        print()


async def main():
    """View all menu extraction related tables."""
    
    print("\n" + "="*100)
    print("MENU EXTRACTION DATA VIEWER")
    print("="*100)
    
    # Menu Upload tables
    await view_table("menu_upload")
    await view_table("menu_upload_stage")
    await view_table("menu_upload_recipe")
    
    # Recipe tables
    await view_table("recipe", limit=10)
    await view_table("recipe_ingredient", limit=10)
    
    # Context tables
    await view_table("restaurant")
    await view_table("menu")
    
    print("\n" + "="*100)
    print("TIP: To see more rows, edit the limit parameter in the script")
    print("="*100 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

