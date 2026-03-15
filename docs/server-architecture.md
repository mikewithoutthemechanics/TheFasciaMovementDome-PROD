# Server Architecture Documentation

## Overview

This document explains how the Pause Fascia application server works, focusing on the unique architecture of server.ts and how to add new routes and services.

## server.ts Architecture

### Why Inline Route Handlers?

The Pause Fascia app uses a unique architecture where all API route handlers are defined **inline** within `server.ts` rather than in separate route files. This was done for Vercel deployment compatibility.

**Key Point**: While there are route files in `api/routes/` (like `users.ts`, `classes.ts`, etc.), these are **NOT used in production**. They exist for potential future local development scenarios but are bypassed in the current Vercel deployment.

### The Build Process

1. Vercel builds the project using the vercel.json configuration
2. The server.ts file contains all production route handlers inline
3. Routes are registered directly on the Express app instance
4. The catch-all route (`app.get("*", ...)`) serves the React SPA for any unmatched routes

### Route Handler Structure

```typescript
app.METHOD("/api/endpoint", async (req, res) => {
  try {
    // Route logic here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json(errorResponse("Error message", ErrorCodes.SERVER_ERROR));
  }
});
```

### Validation Helpers

The server provides several validation functions:
- `isValidUUID(value)` - Validates UUID format
- `isValidEmail(value)` - Validates email format  
- `isValidSafeString(value, maxLength)` - Validates safe string input
- `isValidNumber(value)` - Validates numeric input

### Error Handling

All routes use a standardized error response format:
```typescript
errorResponse(message: string, code: ErrorCodes)
```

Error codes are defined in `utils/error-response.ts`.

## Adding New Routes

### Step 1: Add Route Handler to server.ts

Add your route inside the `createServer()` function, before the catch-all `app.get("*", ...)` route:

```typescript
// My custom route
app.get("/api/my-resource", async (req, res) => {
  try {
    const { data, error } = await supabase.from("my_table").select("*");
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json(errorResponse("Failed to fetch", ErrorCodes.DATABASE_ERROR));
  }
});
```

### Step 2: Test Locally

Run `npm run dev` to test your route locally.

### Step 3: Deploy

Commit and push to trigger Vercel deployment.

## Adding New Services

### Step 1: Create Service File

Create a new file in `services/` directory:

```typescript
// services/my-new-service.ts
export const myNewService = {
  doSomething: async () => {
    // Implementation
  }
};
```

### Step 2: Import in server.ts

Add the import at the top of server.ts:

```typescript
import { myNewService } from "./services/my-new-service";
```

### Step 3: Use in Route Handlers

Use the service in your route handlers:

```typescript
app.post("/api/my-action", async (req, res) => {
  try {
    const result = await myNewService.doSomething();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json(errorResponse("Action failed", ErrorCodes.SERVER_ERROR));
  }
});
```

## Environment Variables

The server uses these Supabase environment variables:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) - preferred |
| `VITE_SUPABASE_ANON_KEY` | Anonymous key (fallback) |

The service role key is required for admin operations that need to bypass Row Level Security (RLS).

## Supabase Client

The server creates a single Supabase client instance:

```typescript
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

This client is used throughout all route handlers for database operations.

## Development vs Production

- **Development** (`npm run dev`): Uses Vite dev server with hot module replacement
- **Production** (Vercel): Uses the Express server defined in server.ts with all routes inline

The `isProduction` flag determines whether to serve static files from `dist/` or use Vite's middleware mode.

## Database Tables

Common tables accessed by the server:
- `users` - User profiles and authentication
- `profiles` - Extended user profiles
- `bookings` - Class/bookings data
- `domes` - Venue/dome information
- `classes` - Class schedules
- `teachers` - Teacher information
- `settings` - App settings
- `feedback` - User feedback
- `credit_purchases` - Credit purchase records

## Security Considerations

1. **Input Validation**: Always validate inputs using the provided helper functions
2. **Authentication**: Use the `verifyUserAuth()` helper for protected routes
3. **Authorization**: Check user roles before allowing admin operations
4. **SQL Injection**: Use Supabase's parameterized queries (they're built-in)
5. **Rate Limiting**: The server applies rate limiting to all `/api/` routes

## Troubleshooting

### Route Not Found (404)
- Ensure the route is added to server.ts, not just to api/routes/
- Check that the route is before the catch-all `app.get("*", ...)` route

### 500 Internal Server Error
- Check Vercel function logs for the actual error message
- Verify environment variables are set in Vercel dashboard
- Ensure Supabase tables exist and RLS policies allow access

### White Screen
- This usually indicates a JavaScript error in the React app
- Check browser console for errors
- Verify all services imported in db-supabase.ts exist
