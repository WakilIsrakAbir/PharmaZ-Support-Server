# Tulip Tech Support Tool — API

Express 5 + MongoDB (Mongoose) API for the support tool. The contract is in
`openapi.yaml`; the Postman collection in `postman/` tests it.

## Run it

```bash
npm install
cp .env.example .env   # then fill in MONGODB_URI and JWT_SECRET
npm run dev            # http://localhost:5000/api
```

## First-time setup

There's no sign-up, so the first account (the super admin) is set up once, by script:

```bash
npm run migrate:products -- --super-admin=you@example.com --dry-run   # see what would change
npm run migrate:products -- --super-admin=you@example.com --name="Your Name"
```

If the account doesn't exist yet it's created, and a temporary password is printed once;
choose your own at the first login. The script also creates PharmaZ247 with its problem
areas and moves older users and calls into it. It's safe to run again.

## Modules

```
src/modules/
  auth/       login, logout, password reset, the current account, temporary-password check
  admin/      the super admin's console: products, their admins, all accounts, open a product
  products/   the current product's setup: problem areas and issues, statuses, priorities, fields
  calls/      logging, listing and updating calls, checked against the product's setup
  users/      the product's people (admins add agents; accounts with temporary passwords)
  dashboard/  totals and breakdowns for the current product
```

Every request under `/dashboard`, `/product`, `/calls` and `/users` works inside one
product (`resolveProduct`), so products never see each other's data.

## Tests

Start an API on a throwaway database with `AUTH_RATE_LIMIT=1000` (a run logs in many
times), make `admin_email` from `postman/environments/local.yaml` the super admin with
the migration above, then:

```bash
npm run test:api
```
