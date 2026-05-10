# RBAC — Role-Based Access Control

## Overview

Permissions are defined once in `backend/src/constants/permissions.js` (source of truth). The database holds editable overrides via `Role` / `Permission` / `RolePermission` models, seeded from the same constants. The frontend mirrors the constants in `dashboard/src/utils/rolePermissions.js`.

---

## Permission Constants

**Backend:** `backend/src/constants/permissions.js`

```js
const PERMISSIONS = {
  USERS_READ:         'users:read',
  USERS_WRITE:        'users:write',
  FLEET_READ:         'fleet:read',
  FLEET_WRITE:        'fleet:write',
  DOCUMENTS_READ:    'documents:read',
  DOCUMENTS_REVIEW:  'documents:review',
  SHIFTS_READ:        'shifts:read',
  SHIFTS_APPROVE:     'shifts:approve',
  HR_READ:            'hr:read',
  HR_APPROVE:         'hr:approve',
  FINANCE_READ:       'finance:read',
  FINANCE_APPROVE:    'finance:approve',
  SETTINGS_READ:      'settings:read',
  SETTINGS_WRITE:     'settings:write',
  AUDIT_READ:          'audit:read',
  COMPLIANCE_READ:    'compliance:read',
  COMPLIANCE_WRITE:   'compliance:write',
  INVENTORY_READ:     'inventory:read',
  INVENTORY_WRITE:    'inventory:write',
  ROLE_MANAGEMENT:    'role:management',
};
```

**Roles and their default permissions** are defined in `ROLE_PERMISSIONS` within the same file.

---

## Roles

| Role Key | Arabic Label | English Label | Notes |
|---|---|---|---|
| `SUPER_ADMIN` | مدير عام | Super Admin | All permissions; bypasses all checks |
| `OPERATIONS_ADMIN` | مدير عمليات | Operations Admin | Broad operations access |
| `HR_ADMIN` | مدير موارد بشرية | HR Admin | HR-focused |
| `FLEET_ADMIN` | مدير أسطول | Fleet Admin | Fleet management |
| `FINANCE_ADMIN` | مدير مالي | Finance Admin | Finance-focused |
| `SUPERVISOR` | مشرف | Supervisor | Field supervisor (non-admin) |
| `DRIVER` | سائق | Driver | No admin permissions |

---

## Adding a New Permission

### Step 1 — Backend

Add the key + labels to `backend/src/constants/permissions.js`:

```js
const PERMISSIONS = {
  // ... existing
  NEW_PERMISSION: 'module:action',
};
```

Assign it to roles in `ROLE_PERMISSIONS`:

```js
const ROLE_PERMISSIONS = {
  FLEET_ADMIN: [
    // ... existing
    PERMISSIONS.NEW_PERMISSION,
  ],
};
```

### Step 2 — Frontend

Add the same key to `dashboard/src/utils/rolePermissions.js`:

```js
export const PERMISSIONS = {
  // ... existing
  NEW_PERMISSION: 'module:action',
};
```

### Step 3 — Protect a Route

**Backend:**
```js
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');

router.get('/', ...adminPerm(P.NEW_PERMISSION), handler);
```

**Frontend:** Add `PermissionRoute` wrapper (see below).

### Step 4 — Database (optional)

After adding to the backend constants, re-run the seed to populate the DB:

```bash
cd backend && npm run db:seed
```

Or create the permission manually via Prisma Studio (`npm run db:studio`).

---

## Protecting a Backend Route

Use `adminPerm()` from `backend/src/middlewares/adminGuard.js`. It chains `authenticate → authorizeAdmin → requirePermission`.

```js
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');

// Require ANY of the listed permissions
router.get('/', ...adminPerm(P.USERS_READ), controller.list);

// Require specific permission
router.post('/', ...adminPerm(P.USERS_WRITE), controller.create);
```

`SUPER_ADMIN` bypasses all permission checks automatically. For SUPER_ADMIN-only routes, use `...adminPerm(P.USERS_WRITE)` — the role check is handled by `authorizeAdmin`.

---

## Protecting a Frontend Route

Use `PermissionRoute` from `dashboard/src/routes/PermissionRoute.jsx`.

```jsx
import PermissionRoute from '../routes/PermissionRoute';
import { PERMISSIONS as P } from '../utils/rolePermissions';

// Require any of the listed permissions
<Route path="/drivers" element={
  <PermissionRoute anyOf={[P.USERS_READ]}>
    <DriversPage />
  </PermissionRoute>
} />

// Require a specific role
<Route path="/audit-logs" element={
  <PermissionRoute requiredRole="SUPER_ADMIN">
    <AuditLogsPage />
  </PermissionRoute>
} />
```

**No `PermissionRoute`** = only authentication required (user must be logged in).
**With `anyOf`** = also checks permission array.
**With `requiredRole`** = only that specific role allowed.

---

## Protecting UI Elements (Buttons, Actions)

Use `PermissionGate` component for action-level guards.

```jsx
import PermissionGate from '../components/auth/PermissionGate';
import { PERMISSIONS as P } from '../utils/rolePermissions';

<PermissionGate anyOf={[P.USERS_WRITE]}>
  <button onClick={handleDelete}>حذف</button>
</PermissionGate>
```

Children are only rendered if the user has at least one of the required permissions. Use `fallback` prop to render an alternative:

```jsx
<PermissionGate anyOf={[P.USERS_WRITE]} fallback={<span>غير مصرح</span>}>
  <DeleteButton />
</PermissionGate>
```

---

## Managing Roles & Permissions via UI

Navigate to **الأدوار والصلاحيات** (`/roles-permissions`). This page is accessible only to users with `ROLE_MANAGEMENT` permission (SUPER_ADMIN by default).

**Usage:**
1. Click a role card on the left
2. Toggle checkboxes in the permission checklist
3. Click **حفظ التغييرات**
4. Changes are persisted to the database immediately

> Note: `SUPER_ADMIN` permissions are read-only (displayed as reference). All other roles are fully editable.

---

## Admin User Management (`/admins`)

CRUD for admin accounts. Accessible to users with `USERS_WRITE` permission.

- **Create:** Form requires identity number, password, name, and role
- **Edit:** Role changes allowed; password unchanged unless explicitly set
- **Reset Password:** Sets a new password for the admin user
- **Delete:** Soft-deletes (archives the account)

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/permissions` | authenticated | List all permissions grouped by category |
| GET | `/permissions/matrix` | authenticated | Full role×permission matrix from DB |
| PUT | `/permissions/matrix/:roleKey` | `ROLE_MANAGEMENT` | Update role permissions |
| GET | `/roles` | authenticated | List all roles with permission details |
| GET | `/roles/:key` | authenticated | Single role with permissions |

### 403 Response Format

When a user lacks permissions, the API returns:

```json
{
  "success": false,
  "message": "ليس لديك صلاحية لتنفيذ هذا الإجراء",
  "requiredPermissions": ["audit:read"]
}
```

---

## Auth Middleware — `req.user.permissions`

After JWT verification, the `authenticate` middleware attaches `req.user.permissions`:

```js
// req.user now includes:
{
  id: 1,
  role: 'FLEET_ADMIN',
  // ... other user fields
  permissions: ['users:read', 'fleet:read', 'fleet:write', ...]
}
```

This array is derived from `ROLE_PERMISSIONS` in `permissions.js` and can be used in custom middleware.

---

## Syncing Frontend Constants

Run the generator utility to produce a matching `rolePermissions.js`:

```bash
cd backend && node src/utils/generateFrontendPermissions.js
```

Outputs the complete `PERMISSIONS`, `ROLE_PERMISSIONS`, and helper functions. Copy into `dashboard/src/utils/rolePermissions.js`.

---

## Database Models

```
Permission     — permission key + labels + category
Role           — role key + labels + isSystem flag
RolePermission — join table (roleId + permissionId)
```

`isSystem: true` marks roles seeded from `permissions.js`. System roles cannot be deleted via API.

Run migrations after schema changes:

```bash
cd backend && npm run db:migrate
npm run db:seed   # re-seed permissions
```
