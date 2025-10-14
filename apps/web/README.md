# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/9cfe2436-efa3-4d5d-a853-9ea5864de497

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9cfe2436-efa3-4d5d-a853-9ea5864de497) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Authentication)

## Authentication Setup

This app uses Supabase for authentication. To run locally, you need to:

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings > API
4. Create a `.env` file in this directory with:
   ```env
   VITE_SUPABASE_URL=your-project-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Enable Authentication Providers

In your Supabase project:

1. Go to Authentication > Providers
2. Enable **Email** provider (enabled by default)
3. (Optional) Enable **Google** provider:
   - Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
   - Add the Client ID and Secret to Supabase

### Running the App

```sh
# Install dependencies (from repository root)
pnpm install

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:5173`. You'll be redirected to the login page if not authenticated.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9cfe2436-efa3-4d5d-a853-9ea5864de497) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
