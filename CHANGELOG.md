# Changelog

## [1.1.0] - 2025-10-16

### Removed

- **CLI Tool (create-volo-app)**
  - Removed `feeb/` directory containing the create-volo-app CLI tool
  - Removed from `pnpm-workspace.yaml` workspace configuration
  - Removed `pnpm cli:build` and `pnpm cli:test` scripts from root `package.json`
  - Updated all documentation to reflect simplified monorepo structure
  - Reason: The CLI tool is a separate product not used by the Feeb application

### Changed

- **Documentation**
  - Updated `agents.md` to focus on web and API components only
  - Updated `README.md` to remove CLI tool references
  - Updated `SETUP.md` to clarify frontend-only dependency installation
  - Simplified repository structure diagrams across all documentation

## [1.0.0] - 2025-10-14

### Major Refactor: Monorepo Structure

#### Added

- **Root workspace configuration**
  - Created `package.json` with pnpm workspace support
  - Created `pnpm-workspace.yaml` defining workspace packages
  - Added root-level scripts for managing all projects

- **Supabase Authentication**
  - Added `@supabase/supabase-js` dependency to frontend
  - Created Supabase client (`apps/web/src/lib/supabase.ts`)
  - Implemented `AuthContext` with full authentication state management
  - Created `useAuth` hook for easy access to auth functionality
  - Built `LoginForm` component with email/password and Google OAuth
  - Built `SignupForm` component with validation
  - Created `ProtectedRoute` component for route guarding
  - Updated `App.tsx` to integrate authentication flow

- **Documentation**
  - Comprehensive root `README.md` with monorepo overview
  - `SETUP.md` with step-by-step setup instructions
  - Updated `apps/web/README.md` with authentication setup
  - Updated `apps/api/README.md` with new path references

#### Changed

- **Repository Structure**
  - Moved `/ingredient-api` → `/apps/api`
  - Reorganized as monorepo with workspace support
  - Updated all path references in API documentation

- **Scripts and Tooling**
  - Added `pnpm dev` - Start frontend development server
  - Added `pnpm dev:all` - Run frontend and API concurrently
  - Added `pnpm api:dev` - Start API development server
  - Added `pnpm api:setup` - Initialize API database
  - Added `pnpm api:import` - Import full OpenFoodFacts dataset
  - Added `pnpm api:import:sample` - Import sample dataset (10k products)
  - Added `pnpm api:status` - Check data import status
  - Added `pnpm api:test` - Run API tests
  - Added `pnpm cli:build` - Build create-volo-app CLI (removed in v1.1.0)
  - Added `pnpm cli:test` - Test CLI tool (removed in v1.1.0)

- **Configuration**
  - Updated `.gitignore` with environment files and Python artifacts
  - Frontend now requires `.env` with Supabase credentials

#### Technical Details

**Frontend Authentication Flow:**
1. User visits app → Redirected to `/login` if not authenticated
2. User can sign up or sign in with email/password or Google
3. Supabase manages authentication tokens and sessions
4. `AuthContext` provides auth state to entire app
5. `ProtectedRoute` guards authenticated routes
6. User can sign out, clearing session

**API Integration:**
- Ingredient API remains public (no authentication required)
- Frontend can call API endpoints directly
- API runs independently on port 8000
- Frontend runs on port 5173

**Workspace Structure:**
```
feeb/
├── apps/
│   ├── web/          # React frontend with Supabase auth
│   └── api/          # Python FastAPI (moved from /ingredient-api)
├── package.json      # Root workspace config
└── pnpm-workspace.yaml
```

**Note:** As of v1.1.0, the `feeb/` CLI tool directory has been removed.

### Migration Guide

For existing developers:

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Supabase:**
   - Create account at supabase.com
   - Create new project
   - Copy credentials
   - Create `apps/web/.env`:
     ```env
     VITE_SUPABASE_URL=your-url
     VITE_SUPABASE_ANON_KEY=your-key
     ```

4. **Update scripts:**
   - Old: `cd ingredient-api && uvicorn app.main:app --reload`
   - New: `pnpm api:dev` (from root)

5. **Path changes:**
   - `/ingredient-api` is now `/apps/api`
   - Update any bookmarks or scripts

### Breaking Changes

- ⚠️ **Path change:** All references to `ingredient-api` must be updated to `apps/api`
- ⚠️ **Environment variables:** Frontend now requires Supabase credentials in `.env`
- ⚠️ **Authentication:** All routes except `/login` and `/signup` are now protected

### Dependencies

**Frontend:**
- Added: `@supabase/supabase-js` ^2.39.0

**Root:**
- Added: `concurrently` ^8.2.2 (dev dependency)

### Known Issues

None

### Contributors

- Alexander Kok

---

## Future Roadmap

- [ ] Add password reset functionality
- [ ] Implement email verification flow
- [ ] Add profile management page
- [ ] Connect frontend to ingredient API
- [ ] Add allergen preference storage in Supabase
- [ ] Implement recipe allergen checking
- [ ] Add barcode scanning feature
- [ ] Deploy frontend to production
- [ ] Deploy API to production
- [ ] Set up CI/CD pipeline

