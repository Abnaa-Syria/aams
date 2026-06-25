# Edit Endpoints Audit

> مرجع المرحلة 2 (#7) — محدّث 2026-06-10

## Legend

| Status | Meaning |
|--------|---------|
| OK | PATCH/PUT يعمل من الداشبورد |
| N/A | لا يوجد تعديل من الداشبورد |

## Priority modules

| Module | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| shifts | PATCH `/shifts/:id` | OK | `updateNotes` |
| shifts | PATCH `/shifts/:id/status` | OK | `adminMutationPerm` |
| investigations | PATCH `/investigations/:id` | OK | multipart + حقول نصية |
| investigations | PATCH `/investigations/:id/status` | OK | NotFound handling |
| platform-accounts | PATCH `/platform-accounts/:id` | OK | `uploadPatch` |
| vehicles | PUT/PATCH `/vehicles/:id` | OK | JSON patch |
| leave-requests | PATCH `/leave-requests/:id/review` | OK | `adminMutationPerm` |
| documents | PATCH `/documents/:id` | OK | `uploadPatch` + `documentNumber` |
| maintenance-requests | PATCH `/maintenance-requests/:id` | OK | `uploadPatch` للمرفقات |
| fuel-logs | PATCH `/fuel-logs/:id` | OK | `uploadPatch` |
| licenses | PATCH `/licenses/:id` | OK | `uploadPatch` |
| bank-accounts | PATCH `/bank-accounts/:id` | OK | `uploadPatch` |
| incidents | PATCH `/incidents/:id` | OK | JSON + status |

## Dashboard pattern

- **إنشاء** مع ملفات: `apiService.upload(POST)`
- **تعديل** مع ملفات: `apiService.uploadPatch(PATCH)`
- **تعديل** بدون ملفات: `apiService.patch`

## المتبقي (اختياري)

- اختبار يدوي UAT لكل فورم بعد `prisma migrate`
- توحيد validators Zod على كل modules (المرحلة 9)
