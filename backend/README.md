# AAMS Backend — منصة عمليات لوجستية

**English:** Production-oriented Express + Prisma + MySQL API for drivers, supervisors, and super-admin operations (shifts, fleet, documents, HR requests, compliance, analytics).

**العربية:** واجهة برمجية كاملة لإدارة السائقين، الشفتات، المركبات، المستندات، الطلبات، والامتثال.

## Tech stack

- Node.js, Express 5, Prisma 7, MySQL  
- JWT (access + refresh), Zod validation, Multer uploads  
- Swagger UI: `http://localhost:<PORT>/api-docs`

## API URL structure

| Base | Use |
|------|-----|
| `/api/v1/...` | Canonical paths (documented in Swagger) |
| `/api/v1/admin/...` | Same handlers — use for dashboard clients |
| `/api/v1/mobile/...` | Same handlers — use for mobile app (role + middleware enforce access) |

Example: `GET /api/v1/shifts` ≡ `GET /api/v1/admin/shifts` ≡ `GET /api/v1/mobile/shifts`.

## Swagger & docs

- Interactive OpenAPI 3: **`/api-docs`** (same spec for all three bases above). JSDoc blocks live next to handlers in `src/modules/**/routes.js`; global components in `src/config/swagger.js`.
- **Suggested integration order** (high level): authenticate → `GET /auth/me` → optional `POST /auth/push-token` → fleet context (`vehicles`, `platforms`, `platform-accounts`) → `shifts` lifecycle → field logs (`mid-shift-records`, `fuel-logs`, `violations`, `incidents`, `daily-reports`) → HR (`leave-requests`, `salary-advances`, `maintenance-requests`) → compliance (`documents`, `licenses`, `investigations`, `penalties`, `rewards`, `ratings`) → `notifications` / `chat` → admin (`dashboard`, `reports`, `audit-logs`, `settings`, `admin-users`, `users`, `supervisors`).

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`.

2. Install and migrate:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
```

3. Run:

```bash
npm run dev
```

Default admin (from seed): identity `1000000001`, password `admin123` (change in production).

## Project layout

- `src/modules/*` — MVC-style modules (routes, controller, service, validator where applicable)  
- `src/middlewares/` — auth, validation, errors, optional `permissions.js` (role → permission map)  
- `src/routes/v1Modules.js` — single registry for v1 + admin + mobile mounts  
- `prisma/schema.prisma` — full domain model  
- `uploads/` — local file storage (metadata in DB)  
- Optional **S3-compatible storage:** set `STORAGE_DRIVER=s3` and `S3_*` variables (see `.env.example`).  
- **Push:** `push_device_tokens` table + `POST/DELETE /auth/push-token`; configure `EXPO_ACCESS_TOKEN` and/or `FCM_LEGACY_SERVER_KEY` for outbound pushes after notification send/broadcast.

## Role-based permissions (admin API)

After `authenticate` + `authorizeAdmin`, most admin routes use **`adminPerm(...)`** from `src/middlewares/adminGuard.js`, which checks `ROLE_PERMISSIONS` in `src/constants/permissions.js`. `SUPER_ADMIN` bypasses permission checks.

| Role | Typical access |
|------|----------------|
| `OPERATIONS_ADMIN` | Broad operational CRUD, settings read/write, audit read |
| `HR_ADMIN` | Users read, documents read/review, HR approvals, compliance read, settings read |
| `FLEET_ADMIN` | Fleet, shifts approve, platform accounts, maintenance, compliance read |
| `FINANCE_ADMIN` | Bank accounts, salary advance review, finance reads, users read |
| `SUPER_ADMIN` | All |

Adjust `ROLE_PERMISSIONS` as your org requires.

## Mobile / driver list scoping

For authenticated **DRIVER** and **SUPERVISOR** roles, many list endpoints automatically restrict rows:

- **DRIVER** — only records where `userId` is the caller (or shift owner for mid-shift records).
- **SUPERVISOR** — records for drivers assigned to that supervisor (`user.supervisorId`).
- **Admins** — full lists; optional `userId` query filter.

Helpers: `src/utils/listScope.js`, `src/utils/recordAccess.js`.

## Mobile team

See [docs/MOBILE_API.md](./docs/MOBILE_API.md) for auth flow and endpoint grouping.

## Responses

Standard shape: `{ success, message, data?, meta? }`. Pagination in `meta`: `page`, `limit`, `total`, `totalPages`.

## License

Proprietary / internal use.
