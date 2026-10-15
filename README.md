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

Products made before statuses could close a call need them marked once (Completed and
Resolved, same as a new product; admins can change it under Settings):

```bash
npm run migrate:closed-statuses -- --dry-run   # see what would change
npm run migrate:closed-statuses
```

Then move each product's data into its own database (see "Where the data lives"):

```bash
npm run migrate:split-products -- --dry-run    # see what would be copied
npm run migrate:split-products                 # copy; the shared collections stay as they are
npm run migrate:split-products -- --drop-old   # after checking the app: back up to backups/, then remove them
```

## Where the data lives

Each product has its own database, so it shows up as its own folder in Atlas or Compass:

```
<main database from MONGODB_URI>   users, products (shared: one login per person, and the
                                   super admin works across every product)
tulip_<product slug>               that product's calls and problemareas
```

A product's database is made on its first write and dropped when the product is deleted.
Code reaches it through `productModels(product)` in `src/config/product-db.js`; nothing
joins across databases, so names of people are looked up with the `User` model.

## Modules

```
src/modules/
  auth/       login, logout, password reset, the current account, temporary-password check
  admin/      the super admin's console: products, their admins, all accounts, open a product
  products/   the current product's setup: problem areas and issues, statuses, priorities, fields
  calls/      logging, listing and updating calls, checked against the product's setup
  users/      the product's people (admins add agents; accounts with temporary passwords)
  dashboard/  totals and breakdowns for the current product
  performance/ per-agent calls, resolved rate, call length and reasons over a period
```

Every request under `/dashboard`, `/performance`, `/product`, `/calls` and `/users` works inside one
product (`resolveProduct`), reading and writing that product's own database, so products
never see each other's data.

## Tests

Start an API on a throwaway database with `AUTH_RATE_LIMIT=1000` (a run logs in many
times), make `admin_email` from `postman/environments/local.yaml` the super admin with
the migration above, then:

```bash
npm run test:api
```
