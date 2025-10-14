# Environment Setup for Frontend

## Required Environment Variables

The frontend requires Supabase credentials to enable authentication.

## Step-by-Step Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or sign in
3. Click "New Project"
4. Fill in the project details:
   - **Name:** feeb (or your choice)
   - **Database Password:** Choose a strong password
   - **Region:** Select closest to your location
5. Click "Create new project"
6. Wait for provisioning (~2 minutes)

### 2. Get Your Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear) in the left sidebar
2. Click on **API** under "Project Settings"
3. You'll see two important values:
   - **Project URL** (under "Project URL") - looks like: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** key (under "Project API keys") - a long string starting with `eyJ...`

### 3. Create the .env File

In the `apps/web` directory, create a file named `.env`:

```bash
cd apps/web
```

Then create the file with this content (replace with your actual values):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

**Important:**
- The file must be named exactly `.env` (with the dot at the start)
- Replace the example values with your actual Supabase credentials
- Do NOT commit this file to git (it's already in .gitignore)

### 4. Enable Authentication Providers

In your Supabase project:

1. Go to **Authentication** in the left sidebar
2. Click on **Providers**
3. Verify **Email** is enabled (it should be by default)
4. (Optional) To enable Google sign-in:
   - Click on **Google**
   - Toggle "Enable Sign in with Google"
   - Enter your Google OAuth credentials:
     - Get these from [Google Cloud Console](https://console.cloud.google.com)
     - Create OAuth 2.0 credentials
     - Add authorized redirect URIs from Supabase
   - Save

### 5. Verify Setup

After creating the `.env` file:

1. Restart your development server if it's running
2. Navigate back to the repository root:
   ```bash
   cd ../..
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
4. Visit `http://localhost:5173`
5. You should see the login page (not an error about missing credentials)

## Example .env File

```env
# Copy this and replace with your actual values
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5ODc1MjQwMCwiZXhwIjoyMDE0MzI4NDAwfQ.example-signature-here
```

## Troubleshooting

### "Supabase URL or Anon Key is missing"

This warning appears when:
- The `.env` file doesn't exist
- The environment variables are named incorrectly
- The values are empty

**Solution:**
1. Make sure the file is in `apps/web/.env`
2. Check the variable names are exactly:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Restart the dev server after creating/editing the file

### Login/Signup Not Working

**Check these:**
1. Supabase project is fully provisioned (not still setting up)
2. Email provider is enabled in Supabase Authentication > Providers
3. Check browser console for specific error messages
4. Verify the anon key is correct (very long string starting with `eyJ`)

### Email Confirmation Required

By default, Supabase requires email confirmation:
1. After signing up, check your email
2. Click the confirmation link
3. Then you can sign in

To disable email confirmation (development only):
1. Go to Supabase Dashboard
2. Authentication > Providers > Email
3. Toggle off "Confirm email"

## Security Notes

- ✅ The anon key is safe to use in client-side code
- ✅ The `.env` file is gitignored and won't be committed
- ❌ Never share your service role key (we don't use it in the frontend)
- ❌ Never commit the `.env` file to version control

## Next Steps

Once you have the `.env` file set up:
1. Start the dev server: `pnpm dev`
2. Visit the app: `http://localhost:5173`
3. Create an account using the signup form
4. Check your email and confirm
5. Sign in and start using the app!

---

For more help, see the [main setup guide](../../SETUP.md) or the [root README](../../README.md).

