# Mobile API guide — AAMS

**English** below; **العربية** مختصرة في نهاية القسم.

## Base URL

Use either:

- `https://<host>/api/v1/mobile` **or**
- `https://<host>/api/v1`

Paths are identical (e.g. `/auth/login`, `/shifts`). The `/mobile` prefix is only for clarity in client code.

## Authentication

1. **Password (drivers with identity on file)**  
   `POST /auth/login`  
   Body: `{ "identityNumber": "...", "password": "..." }`  
   Returns `accessToken`, `refreshToken`, `user`.

2. **OTP**  
   - `POST /auth/send-otp` — `{ "mobileNumber": "05xxxxxxxx" }`  
   - `POST /auth/login-mobile` — `{ "mobileNumber": "...", "otp": "123456" }`

3. **Refresh**  
   `POST /auth/refresh-token` — `{ "refreshToken": "..." }`

4. **Profile**  
   `GET /auth/me` — `Authorization: Bearer <accessToken>`

5. **Push tokens (Expo / FCM legacy)**  
   - `POST /auth/push-token` — body `{ "token": "...", "provider": "EXPO" }` (provider optional, default `EXPO`)  
   - `DELETE /auth/push-token` — body `{ "token": "..." }`  
   Server sends push when admins use notification **send** / **broadcast** (if `EXPO_ACCESS_TOKEN` or `FCM_LEGACY_SERVER_KEY` is configured).

6. **Admin dashboard login (not for driver app)**  
   `POST /auth/admin/login`

## Authorization

- Send `Authorization: Bearer <accessToken>` on all protected routes.  
- **Driver** accounts: `role === DRIVER`. List endpoints may be scoped server-side (e.g. shifts list returns only the caller’s shifts).  
- Admin-only actions return `403` if the JWT role is not an admin role.

## Core mobile flows (suggested order)

| Area | Methods | Notes |
|------|---------|--------|
| Shifts | `POST /shifts/request-start`, `POST /shifts/:id/start`, `POST /shifts/:id/end`, `GET /shifts` | Requires approved vehicle + active platform account; business rules block suspended/restricted/archived drivers |
| Mid-shift | `POST /mid-shift-records` (multipart if files) | Check route module for exact body |
| Fuel | `POST /fuel-logs` (multipart for receipt) | |
| Violations / incidents / daily reports | `POST` + `GET` on respective resources | |
| Notifications | `GET /notifications`, `PATCH` read state | |
| Chat | `GET /chat/...`, `POST /chat/...` | See `chat` routes |
| Documents / licenses | `GET`, `POST` with upload | |
| HR requests | `leave-requests`, `salary-advances`, `maintenance-requests` | Status workflows |

Full list: open **Swagger** at `/api-docs` on the server.

## API segments (v1)

All segments exist under `/api/v1/<segment>`, `/api/v1/admin/<segment>`, and `/api/v1/mobile/<segment>` with the same handlers.

| Segment | Role / notes |
|---------|----------------|
| `auth` | Public login/OTP/refresh; `me`, `logout`, `push-token` need Bearer |
| `users` | Admin driver CRUD |
| `supervisors` | Admin supervisor roster & assign drivers |
| `vehicles` | Fleet CRUD, assign/release driver |
| `documents`, `licenses` | Uploads + admin review |
| `bank-accounts` | Driver submit; finance verify |
| `platforms`, `platform-accounts` | Reference + per-driver accounts |
| `shifts` | `request-start`, approve/reject (admin), start/end/cancel (driver) |
| `mid-shift-records`, `fuel-logs` | During/after shift logging |
| `violations`, `incidents`, `daily-reports` | Compliance reporting |
| `notifications` | Inbox, read state, admin send/broadcast/templates |
| `chat` | `conversations`, `messages/:partnerId`, `send` |
| `investigations`, `penalties`, `rewards`, `ratings` | HR / discipline |
| `leave-requests`, `salary-advances`, `maintenance-requests` | HR & fleet requests |
| `settings` | System settings, master data, cities |
| `audit-logs` | Admin audit trail |
| `dashboard`, `reports` | KPIs and exports/analytics |
| `admin-users` | SUPER_ADMIN only |

## Pagination

Query: `page`, `limit`, optional `search`, filters per resource. Response lists include `meta`.

## Uploads

Use `multipart/form-data` where routes use Multer.  
- **Local (default):** stored under `UPLOAD_DIR`; API may return paths like `uploads/...` resolved against the API host.  
- **S3 / MinIO:** set `STORAGE_DRIVER=s3` and related `S3_*` env vars; stored value is usually a full `https://...` URL.

---

## العربية (ملخص)

- استخدم `/api/v1/mobile` أو `/api/v1` بنفس المسارات.  
- تسجيل الدخول: `/auth/login` أو OTP عبر `/auth/send-otp` ثم `/auth/login-mobile`.  
- أرسل التوكن في الهيدر `Authorization: Bearer ...`.  
- السائق يرى شفتاته فقط في القوائم؛ الإجراءات الإدارية تعيد 403 للسائق.  
- تسجيل الإشعارات الفورية: `POST /auth/push-token` و`DELETE /auth/push-token`.  
- التفاصيل الكاملة لكل method وbody في **Swagger** (`/api-docs`) وجداول المسارات أعلاه.
