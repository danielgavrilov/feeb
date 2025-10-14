# Frontend Integration with Docker Backend

This guide explains how to connect the React/Vite frontend to the dockerized FastAPI backend.

## Environment Setup

### Create `.env` file

Create a `.env` file in the `apps/web/` directory:

```bash
# apps/web/.env
VITE_API_URL=http://localhost:8000
```

### Why this works

The frontend API client (`src/lib/api.ts`) automatically reads this environment variable:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

## Development Workflow

### 1. Start Backend Services (in `apps/api/`)

```bash
cd apps/api
docker-compose up
```

This starts:
- PostgreSQL on port 5432
- FastAPI on port 8000

### 2. Start Frontend Dev Server (in `apps/web/`)

```bash
cd apps/web
npm run dev
```

This starts the Vite development server on port 5173 (default).

### 3. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Your Browser                                           │
│  http://localhost:5173                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Requests to http://localhost:8000
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Docker Compose Network                                 │
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │  FastAPI         │◄─────┤  PostgreSQL      │       │
│  │  Port: 8000      │      │  Port: 5432      │       │
│  └──────────────────┘      └──────────────────┘       │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Host Machine                                           │
│                                                          │
│  ┌──────────────────┐                                  │
│  │  Vite Dev Server │                                  │
│  │  Port: 5173      │                                  │
│  └──────────────────┘                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors, verify that the API has CORS properly configured.

Check `apps/api/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Connection Refused

If the frontend can't connect to the API:

1. **Verify the API is running:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check the API container logs:**
   ```bash
   docker-compose logs api
   ```

3. **Verify the `.env` file exists and has the correct URL:**
   ```bash
   cat apps/web/.env
   ```

### Port Conflicts

If port 8000 is already in use, you can change the API port:

1. Edit `apps/api/docker-compose.yml`:
   ```yaml
   api:
     ports:
       - "8001:8000"  # Map container port 8000 to host port 8001
   ```

2. Update `apps/web/.env`:
   ```env
   VITE_API_URL=http://localhost:8001
   ```

## Production Deployment

For production, update the environment variables:

```env
# apps/web/.env.production
VITE_API_URL=https://api.yourdomain.com
```

Build the frontend:

```bash
npm run build
```

The built files in `dist/` can be served by any static file server (Nginx, Vercel, Netlify, etc.).

## Next Steps

- See [Backend Docker README](../api/DOCKER_README.md) for detailed API documentation
- Run migrations: `cd apps/api && ./scripts/docker_migrate.sh`
- Import data: `cd apps/api && ./scripts/docker_import.sh`

