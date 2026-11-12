# MyEcoms frontend

The client uses Vite, React, and Vitest.

## Local development

```powershell
npm ci
$env:VITE_API_URL = "http://localhost:5000"
npm run dev
```

Set `VITE_API_URL` to the backend origin when building for another environment.
The Razorpay public key is returned by the authenticated checkout endpoint; do
not put payment secrets in frontend configuration.

## Checks and production build

```powershell
npm test -- --run
npm run build
```

The production bundle is written to `dist/` and served by the unprivileged
Nginx container.
