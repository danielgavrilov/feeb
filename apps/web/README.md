# Feeb Web App

**Feeb** is an allergen-aware kitchen assistant that helps users identify allergens in ingredients and recipes. Built for busy kitchens.

🌐 **Live App**: [https://feeb-web-6vsb.onrender.com/](https://feeb-web-6vsb.onrender.com/)

## About This App

This is the web frontend for Feeb, built with:

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Shadcn UI** for beautiful, accessible components
- **Supabase** for authentication (Email/Password + Google OAuth)

For complete project documentation, see the [main repository README](../../README.md).

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager

### Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/AlexanderKok/feeb.git
   cd feeb
   ```

2. **Install dependencies** (from repository root):
   ```bash
   pnpm install
   ```

3. **Set up environment variables** (see Authentication Setup below)

4. **Start the development server**:
   ```bash
   # From repository root:
   pnpm dev
   
   # Or from this directory:
   cd apps/web
   pnpm dev
   ```

The app will be available at `http://localhost:8080`.

## Authentication Setup

This app uses Supabase for authentication. To run locally:

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings > API
4. Create a `.env` file in this directory (`apps/web/`) with:
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

## Available Scripts

```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm preview  # Preview production build locally
pnpm lint     # Run ESLint
```

## Project Structure

```
apps/web/
├── src/
│   ├── components/     # React components (including Shadcn UI)
│   ├── contexts/       # React contexts (Auth, Language)
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── lib/            # Utility functions
│   ├── i18n/           # Internationalization
│   └── data/           # Mock/static data
├── public/             # Static assets
└── index.html          # Entry HTML file
```

## Building for Production

```bash
# From repository root:
pnpm build

# Or from this directory:
cd apps/web
pnpm build
```

The production build will be output to the `dist/` directory.

## Backend API

The web app connects to the Feeb API for ingredient and allergen data. See the [API README](../api/README.md) for setup instructions.

## Features

- 🔐 User authentication with Supabase
- 🍽️ Menu management for restaurants
- 📋 Recipe creation and management
- 🥜 Allergen tracking and warnings
- 🌍 Multi-language support
- 📱 Responsive design for mobile and desktop
- 🎨 Beautiful, modern UI with Shadcn components

## Contributing

This project is actively developed. When making changes, consider the impact across the monorepo and test both frontend and backend integration.

## Documentation

- [Main Project README](../../README.md)
- [API Documentation](../api/README.md)
- [Docker Quick Start](../../DOCKER_QUICKSTART.md)

## License

See the [main repository](https://github.com/AlexanderKok/feeb) for license information.
