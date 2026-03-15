# The Fascia Dome - Codebase Documentation

## Overview

The Fascia Dome is a booking system for a fitness facility with credit-based booking, PayFast payment integration, and Supabase backend.

### Tech Stack

- **Frontend**: React 19 + Vite 6
- **Backend**: Express 5 (all routes inline in `server.ts`)
- **Database**: Supabase (PostgreSQL)
- **Payments**: PayFast
- **Email**: Resend
- **Deployment**: Vercel

### Architecture

All production API routes are **inline in `server.ts`**. Routes in `api/routes/` directory are NOT used in production.

```
server.ts           # All production API endpoints (334 lines)
├── services/
│   ├── email.ts        # Resend email service
│   ├── payfast.ts      # PayFast payment service  
│   ├── ai.ts           # AI chat service
│   └── email-queue.ts # Email queue service
├── utils/
│   └── error-response.ts # Standardized error responses
└── constants.ts          # Credit packages configuration
```

---

## Security Changes (March 2025)

### Authentication Middleware

Added `requireAuth` middleware in `server.ts` (lines 29-42):

```typescript
async function requireAuth(req: express.Request): Promise<{ 
  id: string; 
  email: string; 
  isAdmin: boolean 
} | null>
```

This middleware:
- Verifies Bearer token in Authorization header
- Validates token with Supabase auth
- Returns user info including `isAdmin` flag

### Protected Endpoints (IMPLEMENTED March 2025)

All these endpoints now require authentication:

| Endpoint | Method | Auth Level | Notes |
|----------|--------|------------|-------|
| `/api/bookings` | GET | User | Returns only user's bookings |
| `/api/settings` | POST | Admin | Admin-only write access |
| `/api/credits/balance` | GET | User | Returns only user's balance |
| `/api/email/send` | GET | User | Authenticated email sending |

### Frontend Integration

Include the Authorization header with authenticated requests:

```typescript
const { data: { session } } = await supabase.auth.getSession();

// For API calls
fetch('/api/bookings', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## API Endpoints

### Public Endpoints (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|--------------|
| `/api/health` | GET | Health check |
| `/api/settings` | GET | Get system settings |
| `/api/domes` | GET | List active domes |
| `/api/slots` | GET | Get available time slots |
| `/api/payfast/credit-packages` | GET | List credit packages |
| `/api/payfast/notify` | POST | PayFast webhook |

### Authenticated Endpoints

| Endpoint | Method | Auth Level | Description |
|----------|--------|------------|-------------|
| `/api/auth/callback` | POST | None | OAuth callback |
| `/api/auth/sync-profile` | POST | None | Sync user profile |
| `/api/bookings` | GET | User | Get user's bookings |
| `/api/bookings` | POST | User | Create booking |
| `/api/bookings/:id` | PATCH | User | Update booking (ownership verified) |
| `/api/bookings/:id` | DELETE | User | Delete booking (ownership verified) |
| `/api/credits/purchase` | POST | User | Purchase credits |
| `/api/credits/use` | POST | User | Use credits |
| `/api/credits/balance` | GET | User | Get credit balance |
| `/api/email/send` | POST | User | Send email |
| `/api/email/queue` | POST | None | Queue email |
| `/api/feedback` | POST | None | Submit feedback |
| `/api/ai/chat` | POST | None | AI chat |

### Admin-Only Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | POST | Update settings |

---

## Security Issues (Fixed)

### High Priority

1. **~~PayFast Webhook Signature Verification~~** ✅ FIXED
   - Removed vulnerable inline endpoint from server.ts
   - Now using secure Vercel serverless function at `/api/payfast/notify.ts`
   - Features signature verification, idempotency check, and amount validation

2. **~~No Ownership Verification~~** (PATCH/DELETE bookings) ✅ FIXED
   - Location: Lines ~138-157 in server.ts
   - Fix: Added requireAuth, fetches booking, verifies ownership, admins can modify any

3. **~~Race Condition in Credit Purchase~~** ✅ FIXED
   - Location: Lines ~208-257 in server.ts
   - Fix: Uses optimistic locking with retry (3 attempts) for both purchase and use
   - Also attempts RPC call for atomic increment (falls back to retry if no DB function)

### Medium Priority

4. **~~Mass Assignment~~** (PATCH bookings) ✅ FIXED
   - Location: Line ~138 in server.ts
   - Fix: Only allows specific fields (date, time, status, notes)

5. **~~No Date Validation~~** ✅ FIXED
   - Location: Lines ~29-75, ~202-207, ~239-254 in server.ts
   - Fix: Added isValidBookingDate() and isValidBookingTime() validation functions that check:
     - Valid YYYY-MM-DD format
     - Date is not in the past
     - Date is within 6 months of today
     - Time is between 06:00 and 20:00
     - Applied to both POST (create) and PATCH (update) booking endpoints

6. **~~Hardcoded Fallback Supabase Key~~** ✅ FIXED
   - Location: Lines ~46-60 in server.ts
   - Fix: Removed hardcoded fallback, now requires env vars in production

---

## Database Schema

### Tables

- **users** - User accounts (managed by Supabase Auth)
- **profiles** - Extended user profile with credits
- **bookings** - User bookings
- **domes** - Available dome/room locations
- **settings** - System settings
- **credit_purchases** - Credit purchase history
- **feedback** - User feedback

### Key Fields

```sql
profiles:
  - id (UUID, PK)
  - email
  - full_name
  - credits (integer)
  - role ('admin' | 'client')
  - created_at
  - updated_at

bookings:
  - id (UUID, PK)
  - user_id (UUID, FK)
  - dome_id (string)
  - date (date)
  - time (time)
  - credits (integer)
  - status ('pending' | 'confirmed' | 'cancelled')
  - notes (text)
  - created_at
  - updated_at
```

---

## Error Handling

All endpoints use standardized error responses from `utils/error-response.ts`:

```typescript
import { errorResponse, ErrorCodes } from "./utils/error-response";

// Usage
res.status(400).json(errorResponse("Invalid input", ErrorCodes.VALIDATION_ERROR))
```

### Available Error Codes

- `AUTH_UNAUTHORIZED` - Authentication required
- `VALIDATION_ERROR` - Invalid input
- `DATABASE_ERROR` - Database operation failed
- `PAYMENT_ERROR` - Payment processing failed
- `EMAIL_ERROR` - Email sending failed
- `INSUFFICIENT_CREDITS` - Not enough credits

---

## Environment Variables

Required environment variables:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
RESEND_API_KEY=xxx
PAYFAST_MERCHANT_ID=xxx
PAYFAST_PASSPHRASE=xxx
NODE_ENV=production
PORT=3001
```

---

## Running the Project

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

---

## Code Style Guidelines

1. **Validation**: Use existing validation helpers
   ```typescript
   isValidUUID(value)
   isValidEmail(value)
   isValidSafeString(value, maxLength)
   isValidNumber(value)
   ```

2. **Error Handling**: Use try/catch with standardized errors
   ```typescript
   try {
     // operations
   } catch (error) {
     res.status(500).json(errorResponse("Failed operation", ErrorCodes.DATABASE_ERROR));
   }
   ```

3. **Authentication**: Use `requireAuth` middleware for protected routes
   ```typescript
   const auth = await requireAuth(req);
   if (!auth) return res.status(401).json(errorResponse("Authentication required", ErrorCodes.AUTH_UNAUTHORIZED));
   ```

4. **Admin Checks**: Check `auth.isAdmin` for admin-only operations
   ```typescript
   if (!auth || !auth.isAdmin) return res.status(403).json(errorResponse("Admin access required", ErrorCodes.AUTH_UNAUTHORIZED));
   ```

---

## Testing Checklist

After any changes, verify:

- [ ] Unauthenticated users cannot access protected endpoints
- [x] Users can only access their own data (bookings, credits)
- [x] Booking PATCH/DELETE verifies ownership
- [x] Booking PATCH only allows expected fields
- [x] Credit balance updates are atomic (optimistic locking)
- [x] Booking dates cannot be in the past

---

## Deployment

**Production URL**: https://pause-fascia-movement-delta.vercel.app

### Deploy Command

```bash
npx vercel --prod
```
