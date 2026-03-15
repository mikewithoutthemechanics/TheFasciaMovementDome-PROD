# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Health & Status Endpoints

### GET /api/health
Health check endpoint.

### GET /api/settings
Get application settings.

### POST /api/settings
Update application settings.

## Bookings

### GET /api/bookings
List bookings (supports ?userId, ?status, ?date)

### POST /api/bookings
Create a new booking.

### PATCH /api/bookings/:id
Update a booking.

### DELETE /api/bookings/:id
Delete a booking.

## Domes & Slots

### GET /api/domes
List available domes.

### GET /api/slots
Get available time slots (?domeId, ?date)

## Credits

### POST /api/credits/purchase
Purchase credits package.

### POST /api/credits/use
Use credits for booking.

### GET /api/credits/balance
Get user's credit balance.

## Feedback

### POST /api/feedback
Submit feedback for a booking.

## Email

### POST /api/email/send
Send an email.

### POST /api/email/queue
Queue an email for later delivery.

## AI

### POST /api/ai/chat
Chat with AI assistant.

## PayFast

### GET /api/payfast/credit-packages
Get available credit packages.

### POST /api/payfast/notify
PayFast payment notification webhook (handled by Vercel serverless function at `/api/payfast/notify.ts`).
- Requires signature verification
- Includes idempotency check
- Validates payment amount
