# Using SQLite for Development

If you want to test the API quickly without setting up PostgreSQL, you can use SQLite.

## Quick Setup

1. **Update requirements.txt** to add SQLite support:
```bash
echo "aiosqlite==0.19.0" >> requirements.txt
pip install aiosqlite
```

2. **Update your .env file:**
```env
# Change from:
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/feeb_db

# To:
DATABASE_URL=sqlite+aiosqlite:///./ingredient_api.db
```

3. **Run migrations and start:**
```bash
alembic upgrade head
uvicorn app.main:app --reload
```

## Limitations

⚠️ **SQLite is for development/testing only:**
- Not suitable for production
- Slower with large datasets
- No concurrent writes
- Limited full-text search capabilities

For production, use PostgreSQL (Neon, Supabase, or hosted).

## Benefits for Testing

✅ No signup required
✅ No network connection needed
✅ Fast setup
✅ Perfect for learning/testing the API
✅ File-based (easy to delete and start over)

## Switching to PostgreSQL Later

When ready for production:
1. Get PostgreSQL connection string (Neon/Supabase)
2. Update DATABASE_URL in .env
3. Run: `alembic upgrade head`
4. Re-import data: `python -m data_pipeline.import_off`

That's it!

