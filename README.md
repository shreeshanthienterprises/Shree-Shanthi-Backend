# Shree Shanthi Enterprises Backend API

Node.js/Express backend for the Shree Shanthi Enterprises website. Its main job is the contact form: `POST /api/contact` emails the team through [Resend](https://resend.com) over HTTPS.

> **Why Resend and not SMTP?** Render's free tier blocks outbound SMTP ports (25/465/587), so Gmail SMTP always times out there. Resend uses its HTTPS API (port 443), which works.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | API key from Resend (`re_...`). Use a "Sending access" key. |
| `EMAIL_FROM` | yes | Sender on a Resend-verified domain, e.g. `Shree Shanthi Enterprises <contact@shreeshanthienterprises.com>` |
| `EMAIL_TO` | no | Recipient(s), comma-separated. Default `shreeshanthienterprises@gmail.com` |
| `FRONTEND_URL` | no | Comma-separated allowed CORS origins |
| `NODE_ENV` | no | `production` on Render |
| `PORT` | no | Set automatically by Render |

See `.env.example`. Never commit a real `.env`.

## Render setup

1. New **Web Service** from this GitHub repo. Build command `npm install`, start command `node server.js`.
2. Add the environment variables above in **Environment**.
3. **Settings → Health Check Path:** `/health`.
4. Deploy, then test:
   ```bash
   curl https://<your-service>.onrender.com/health
   ```

## Resend setup

1. Create a Resend account and add the domain `shreeshanthienterprises.com` under **Domains**.
2. Add the DNS records Resend shows (SPF, DKIM, and the optional DMARC record) at your DNS provider, then click **Verify**.
3. Create an API key and put it in `RESEND_API_KEY`.
4. Until the domain is verified, Resend only lets you send from `onboarding@resend.dev` to your own Resend account email.

## API

### `GET /health`
Returns `{"status":"ok"}`. (`/api/health` also works.)

### `POST /api/contact`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 98765 43210",
  "service": "Housekeeping services",
  "message": "I am interested in your services."
}
```
`phone` is optional (7-15 digits; spaces, `+`, `-`, `()` allowed) and appears in the notification email when given. `service` must be one of `Housekeeping services`, `Security services`, `Pest control`.

| Status | Body |
| --- | --- |
| 200 | `{"success":true,"message":"..."}` |
| 400 | `{"success":false,"message":"..."}` validation error |
| 429 | Rate limit: 5 submissions per 15 minutes per IP |
| 502 | Email provider failed after retries / 15s timeout |
| 500 | Server misconfigured (missing `RESEND_API_KEY` / `EMAIL_FROM`) |

The email has the customer's address as `reply_to`, so replying from Gmail goes straight to the customer. The send has one 15-second overall deadline and up to 2 retries (only for network errors, 429 and 5xx), with an idempotency key so a retry cannot deliver a duplicate.

## Logging

Logs contain a request id, method/path/status, service type, and success/failure with the provider's error message. Request bodies, names, emails and IP addresses are never logged.

## Development

```bash
npm install
cp .env.example .env   # fill in values
npm run dev
npm test
```

## Structure

```
src/
├── config/        # CORS
├── controllers/   # Request handlers
├── middleware/    # Logging, rate limiting, validation, errors
├── routes/        # API routes
├── services/      # emailService.js - the only file that knows about Resend
└── utils/         # Input normalisation
```
