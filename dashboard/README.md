# AAMS Super Admin Dashboard

**English:** React (Vite) operations dashboard — Arabic-first, RTL default, Almarai font, Redux Toolkit auth, modular pages aligned with backend modules.

**العربية:** لوحة تحكم للإدارة — واجهة عربية، اتجاه RTL، خط Almarai، وربط مع واجهة AAMS الخلفية.

## Requirements

- Node.js 18+  
- Running AAMS backend (see `../backend/README.md`)

## Setup

```bash
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev
```

Open `http://localhost:5173`. Login with seeded super admin (see backend seed): identity `1000000001` / `admin123` (change in production).

## Structure

- `src/pages/*` — feature pages (drivers, shifts, fleet, HR, compliance, settings, …)  
- `src/components/ui/*` — tables, pagination, KPI cards, modals, badges  
- `src/layouts/DashboardLayout.jsx` — RTL sidebar + shell  
- `src/services/api.js` — Axios instance, token refresh  
- `src/store/*` — Redux Toolkit (auth slice)

## Theming

Global styles in `src/index.css`: CSS variables, orange accent (`#F97316`), neutral surfaces. Font: Almarai (Google Fonts).

## API base

`VITE_API_URL` must point to the **canonical** v1 root, e.g. `http://localhost:5000/api/v1`.  
(Optional) you may use `.../api/v1/admin` — paths are the same after the base (`/dashboard`, `/users`, …).

## Build

```bash
npm run build
npm run preview
```

## License

Proprietary / internal use.
