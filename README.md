# FoodSpark Admin

Next.js admin dashboard for FoodSpark operations.

## Production API

The admin app talks to the backend through:

```bash
NEXT_PUBLIC_API_BASE_URL=https://apifoodspark.techsparks-co-th.com
```

If the env is missing or malformed, the app falls back to the production API above instead of the old Railway host.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required Checks

Run before deploying admin changes:

```bash
npm run verify
```

This runs:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Production builds now fail on TypeScript errors. Do not re-enable `ignoreBuildErrors`.

## Admin Smoke Test

Set a real admin account in your shell or `.env.local`:

```bash
ADMIN_SMOKE_EMAIL=admin@example.com
ADMIN_SMOKE_PASSWORD=...
ADMIN_SMOKE_API_BASE_URL=https://apifoodspark.techsparks-co-th.com
```

Run:

```bash
npm run smoke:admin
```

The smoke test logs in and checks read-only critical admin procedures:

- dashboard overview
- RBAC access
- approvals
- orders/users/restaurants/riders
- finance settlement
- payout overview/list
- rider topup review list
- incidents/disputes/audit/settings

For CI environments without credentials, explicitly opt into skip mode:

```bash
ADMIN_SMOKE_ALLOW_SKIP=1 npm run smoke:admin
```

## Session Hardening

Admin sessions are stored client-side for the current app architecture, but are now capped to 12 hours and validated on every dashboard load/query token read. Expired, non-admin, or malformed sessions are cleared and redirected to `/login`.

## Production Security Headers

`next.config.ts` sets baseline hardening headers for every route:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `poweredByHeader: false`
