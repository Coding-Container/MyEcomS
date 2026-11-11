# MyEcoms backend

## Configuration

Copy `backend/.env.example` to `backend/.env` for direct local work. For Compose,
copy the repository-root `.env.example` to `.env` and set `VITE_API_URL` to the
public API origin. Replace every placeholder before starting the services.
Production secrets belong in the deployment secret manager. Required backend
configuration includes MongoDB, JWT, Razorpay, Gemini, and SMTP credentials.
Set `ALLOWED_ORIGINS` to the exact browser origins and `TRUST_PROXY_HOPS` to
the number of trusted ingress proxies for the environment. The default of zero
does not trust client-supplied forwarding headers.

Checkout and address updates use MongoDB transactions. The database must be a
replica set or sharded cluster; a standalone MongoDB server is not supported.

## Database rollout

Before deploying the new backend, take a database backup and run:

```powershell
npm ci
npm run migrate:indexes
```

The migration normalizes email identities and consolidates duplicate pending
signup/cart rows, and enforces unique ownership/default-address and payment
indexes. It stops before modifying normalized identities if email or username
collisions need manual resolution. Review the migration output and validate the
result before deploying multiple application replicas. The server refuses to
start until this migration has completed successfully.

To create the initial administrator, set `ADMIN_USERNAME`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, and `ADMIN_MOBILE` in the deployment environment, then run
`npm run seed:admin` as a one-off operation. The seeder is idempotent and will
not promote an existing customer account.

## Validation and startup

```powershell
npm test
npm audit --omit=dev
npm start
```

The service validates configuration and MongoDB transaction support before
listening. `/health/live` is a liveness check; `/health/ready` reports database
readiness. Terminate with `SIGTERM` for graceful shutdown.

The static frontend sends CSP and browser security headers. Configure HSTS and
TLS at the public ingress/load balancer, not on the internal HTTP container.
