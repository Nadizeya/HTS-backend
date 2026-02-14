# HTS Backend

Node.js backend application with Supabase integration.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env` and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   Update the following variables in `.env`:
   - `SUPABASE_URL`: Your Supabase project URL (found in Project Settings > API)
   - `SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (optional, for admin operations)

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   Or for production:

   ```bash
   npm start
   ```

## Project Structure

```
hts-backend/
├── src/
│   ├── config/
│   │   └── supabase.js      # Supabase client configuration
│   ├── routes/
│   │   └── example.routes.js # Example API routes
│   └── index.js              # Main server file
├── .env                      # Environment variables (not in git)
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Available Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - API status
- `GET /api/test-db` - Test Supabase connection

## Environment Variables

| Variable                  | Description                          | Required |
| ------------------------- | ------------------------------------ | -------- |
| PORT                      | Server port (default: 3000)          | No       |
| NODE_ENV                  | Environment (development/production) | No       |
| SUPABASE_URL              | Your Supabase project URL            | Yes      |
| SUPABASE_ANON_KEY         | Supabase anonymous key               | Yes      |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key            | No       |

## Getting Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Project Settings** > **API**
4. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (use with caution)

## Development

Run the server in development mode with auto-restart:

```bash
npm run dev
```

## Production

Run the server in production mode:

```bash
npm start
```

## Adding New Routes

1. Create a new route file in `src/routes/`
2. Import and use it in `src/index.js`:
   ```javascript
   const exampleRoutes = require("./routes/example.routes");
   app.use("/api/example", exampleRoutes);
   ```

## Learn More

- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
