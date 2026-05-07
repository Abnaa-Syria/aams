# AAMS ERP — Requirements Audit Report
> **Date:** 2026-05-07 | **Scope:** Backend (`d:\AAMS\backend`) — Prisma Schema + API Routes + Service Logic

---

## Legend

| Icon | Meaning |
|------|---------|
| ✅ | **Fully Implemented** — Schema model + API route + service logic all exist |
| 🟡 | **Schema Only / Partial** — Database model exists but API/logic is incomplete or basic CRUD only |
| ❌ | **Not Implemented** — No schema, no API, or critical business logic is missing |

---

## 1. خصائص النظام العامة والصلاحيات (General System & Permissions)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 1.1 | دعم جميع أجهزة الجوال (أندرويد، أبل) | ✅ | API is REST-based, mobile-agnostic. Route prefix `/api/v1/mobile/` exists. Push tokens support `EXPO` & `FCM_LEGACY`. |
| 1.2 | صلاحيات الموظف مقتصرة على بياناته فقط | ✅ | `authenticate` middleware scopes queries by `req.user.id` for DRIVER role. Shifts, documents, etc. are user-scoped. |
| 1.3 | الإدارة تصل لكافة البيانات | ✅ | `adminPerm()` middleware + `PERMISSIONS` constants grant full access to admin roles (`SUPER_ADMIN`, `OPERATIONS_ADMIN`, etc.). |
| 1.4 | واجهة بلغة الموظف | 🟡 | `NotificationTemplate` has `titleAr`/`bodyAr` + `titleEn`/`bodyEn`. **But no dynamic locale selection per user**; the mobile app must handle locale switching client-side. |
| 1.5 | حذف الحساب مخصص للمسؤولين فقط | ✅ | `DELETE /users/:id` is guarded by `adminPerm(P.USERS_DELETE)`. No self-delete endpoint exists for drivers. |

---

## 2. البيانات الأساسية والملف الشخصي (Profile & Personal Data)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 2.1 | صورة شخصية للموظف | ✅ | `User.profileImageUrl` field exists. Upload endpoint available. |
| 2.2 | حقل "رقم الـ 700" | ✅ | `User.sevenHundredNumber` field exists, indexed. |
| 2.3 | حالة الموظف (على رأس العمل، إجازة، موقوف، هارب، خروج نهائي) | ✅ | `EmploymentStatus` enum: `ON_DUTY`, `ON_LEAVE`, `SUSPENDED`, `RUNAWAY`, `FINAL_EXIT`. |
| 2.4 | وسيلة النقل (سيارة، دراجة نارية، شاحنة) | ✅ | `TransportType` enum: `CAR`, `MOTORCYCLE`, `TRUCK`. Field on `User.transportType`. |
| 2.5 | جهة اتصال الطوارئ (اسم، صلة قرابة، جوال) | ✅ | `User.emergencyName`, `User.emergencyRelation`, `User.emergencyPhone` all exist. |
| 2.6 | اسم المعرف/المعرف البديل (اليوزر) | ✅ | `PlatformAccount.username` + `PlatformAccount.alternateUsername` + `PlatformAccount.isAlternate`. |
| 2.7 | تواريخ بداية ونهاية استلام المعرف | ✅ | `PlatformAccount.receiptDate` + `PlatformAccount.returnDate`. |
| 2.8 | تاريخ بدء عمل الموظف على يوزر معين | ✅ | `PlatformAccount.startWorkDate`. |

---

## 3. إدارة الوثائق والعهد (Documents & Custody)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 3.1 | تنبيه انتهاء الإقامة | 🟡 | `Document.expiryDate` exists & `ScheduledReminder` model exists. **But no automated cron job** to scan expiring documents and trigger alerts. Schema ready, automation missing. |
| 3.2 | حقل "رقم الحدود" | ✅ | `DocumentType.BORDER_NUMBER` enum value exists. |
| 3.3 | هوية مقيم + تأشيرة الموظف | ✅ | `DocumentType.MUQEEM_ID`, `DocumentType.VISA` enum values exist. |
| 3.4 | إرفاق "العقد مع سند لأمر" | ✅ | `DocumentType.CONTRACT_WITH_SANAD` enum value exists. |
| 3.5 | "بطاقة سائق" مع تاريخ إصدار وانتهاء | ✅ | `DocumentType.DRIVER_CARD`, `Document.issueDate`, `Document.expiryDate`. |
| 3.6 | "رخصة سير" مع تاريخ إصدار وانتهاء | ✅ | `DocumentType.DRIVING_PERMIT` + date fields. |
| 3.7 | شهادة خلو سوابق | ✅ | `DocumentType.POLICE_CLEARANCE`. |
| 3.8 | العهدة المسلمة للموظف مع صور | ✅ | `Asset` + `AssetAssignment` models with `assignPhotoUrl`, `returnPhotoUrl`. Types: `MOTORCYCLE`, `SAFETY_EQUIPMENT`, `PHONE`, `SIM_CARD`, `LICENSE_CARD`, `THERMAL_BOX`. |
| 3.9 | وثيقة "إصابة العمل" مع صورة | ✅ | `DocumentType.WORK_INJURY`, `Document.fileUrl`. |
| 3.10 | وثيقة إخلاء طرف + إنهاء خدمات | ✅ | `DocumentType.CLEARANCE_DOC`, `DocumentType.TERMINATION_DOC`. |

---

## 4. إدارة المركبات والصيانة والوقود (Vehicles, Maintenance & Fuel)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 4.1 | حالة المركبة (نشطة، تحت الصيانة) | ✅ | `VehicleStatus` enum: `ACTIVE`, `IN_MAINTENANCE`, `OUT_OF_SERVICE`, `RESERVED`, `DECOMMISSIONED`. |
| 4.2 | مركبة بديلة مع تاريخ استلام وانتهاء | ✅ | `SubstituteVehicleAssignment` model with `startDate`, `endDate`, `originalVehicleId`. |
| 4.3 | طلب تغيير زيت تلقائي كل 1000 كم | 🟡 | `OilChangeLog` model with `odometerAtChange`, `nextDueOdometer` exists. **But no automated cron/trigger** to compare current odometer reading and auto-generate a maintenance request. |
| 4.4 | إشعار تغيير زيت كل 10000 كم | ❌ | Same as above — no background worker to check odometer thresholds and fire notifications. |
| 4.5 | تعبئة الوقود مرة ثانية فقط إذا الطلبات جيدة | 🟡 | `FuelLog.isDuplicate` field exists. Fuel service has basic validation but **no rule checking order count** to conditionally allow second fueling. |
| 4.6 | إرفاق صورة فاتورة البنزين إلزامي | 🟡 | `FuelLog.receiptUrl` field exists. **But the API does not enforce** that `receiptUrl` is required (it's nullable in schema). Needs validation enforcement. |

---

## 5. نظام تعدد الحسابات (اليوزرات) والتتبع (Multi-Account & Tracking)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 5.1 | الموظف يعمل على أكثر من يوزر | ✅ | `PlatformAccount` has `userId` (many-to-one). Each shift links to a `platformAccountId`. |
| 5.2 | حساب بديل لكل موظف | ✅ | `PlatformAccount.isAlternate` + `alternateUsername`. |
| 5.3 | تسجيل عمليات مرتبطة باليوزر تلقائياً | ✅ | `Shift.platformAccountId` links every shift to a specific platform account. `DailyReport` → `ReportAppBreakdown` logs per-platform stats. |
| 5.4 | منع الموظفين من حذف سجل النشاط | ✅ | No delete endpoints for shift logs, audit logs, or daily reports are exposed to DRIVER role. |
| 5.5 | لوحة تحكم: بحث عن يوزر → الموظفين والتفاصيل | 🟡 | `PlatformAccount` data exists but **no dedicated "user tracking dashboard" API endpoint** to aggregate which employees used which account, with date ranges and order counts. Basic list/filter exists. |
| 5.6 | تصفية بحث سريع (تاريخ، موظف، يوزر) | 🟡 | Shift list supports `userId`, `dateFrom`, `dateTo` filters. **But no filter by `platformAccountId`** on the shift or report endpoints. |

---

## 6. دورة الشفت والتتبع اللحظي (Shift Cycle & Real-Time Tracking)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 6.1 | بدء الشفت: صورة عداد + مركبة + تطبيق | ✅ | `Shift.startPhotoUrl`, `Shift.startOdometer`, `Shift.startAppPhotoUrl` fields exist. |
| 6.2 | تنبيه تأخر بدء الشفت | ❌ | No cron job or scheduled check for late shift starts. `ScheduledReminder` model exists but not wired for this use case. |
| 6.3 | أمر "تحرك كيلو" بعد الموافقة | ❌ | No "move 1 km to activate" logic exists. Shift goes from `APPROVED` → `ACTIVE` directly via `POST /shifts/:id/start`. |
| 6.4 | التتبع المباشر (GPS) + نطاقات جغرافية | 🟡 | `LocationHistory` model and `Zone` model exist. `geofencing` module has routes. **But no real-time GPS streaming (WebSocket/MQTT)** or zone boundary checking logic. |
| 6.5 | مناطق محظورة + إشعار دخول | 🟡 | `Zone.isRestricted` + `Zone.alertMessage` fields exist. **But no server-side geo-fence boundary check** to auto-trigger alerts. |
| 6.6 | إنذار توقف 40 دقيقة | ❌ | No idle detection logic. Would require background worker analyzing `LocationHistory` for stationarity. |
| 6.7 | تنبيه تجمع مندوبين في نفس النطاق | ❌ | No proximity/clustering detection exists. |
| 6.8 | إشعار انقطاع اتصال المندوب | ❌ | No heartbeat monitoring system. |
| 6.9 | دردشة (شات) مترجمة بلغة المندوب | 🟡 | `ChatMessage` model exists with CRUD API. **But no auto-translation feature**. |
| 6.10 | طلب استراحة مع ذكر السبب | ✅ | `BreakRequest` model + `break-requests` API module with `reason` field. |
| 6.11 | بلاغ لحظي: عطل، حادث، طلب كبير، حالة مرضية، تبديل مركبة | ✅ | `Incident` (types: `MEDICAL`, `ACCIDENT`, `BREAKDOWN`, `LARGE_ORDER`) + `VehicleSwapRequest`. |
| 6.12 | إغلاق الشفت: صورة عداد + مركبة + تطبيق خلال 6 ساعات | 🟡 | `Shift.endPhotoUrl`, `endOdometer`, `endAppPhotoUrl` exist. `POST /shifts/:id/end` exists. **But no 6-hour enforcement deadline**. |
| 6.13 | تقرير نهاية اليوم بناءً على نهاية العمل الفعلي | ✅ | `DailyReport` with `ReportAppBreakdown` per platform. Not tied to a fixed 10 PM clock. |

---

## 7. الطلبات والإجراءات الإدارية (Requests & Administrative Actions)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 7.1 | تسجيل دخول بالجوال أو الإقامة أو رقم الهوية | ✅ | `POST /auth/login` (identityNumber), `POST /auth/login-mobile` (mobile+OTP), `POST /auth/send-otp`. |
| 7.2 | طلب حجز موعد رخصة + إعادة اختبار | ✅ | `LicenseTest` model with `isRetest`, `testDate`, `scheduledBy`. API routes exist. |
| 7.3 | حالة اختبار الرخصة (متقدم، متوسط، مبتدئ، رسوب) | ✅ | `LicenseTestResult` enum: `ADVANCED`, `INTERMEDIATE`, `BEGINNER`, `FAIL`. |
| 7.4 | الحسابات البنكية + خيار كاش مع إثبات | ✅ | `BankAccount.paymentMethod` (`BANK_TRANSFER`, `CASH`), `cashReceiptPhotoUrl`, `receivedStatus`, `receivedDate`. |
| 7.5 | طلب إقفال شفت يتطلب موافقة مسؤولين | ✅ | `Shift.closureRequested`, `closureApprovedBy`, `closureApprovedAt`. `POST /shifts/:id/approve-closure` endpoint. |
| 7.6 | سبب واضح لطلب الإجازة اليومية | ✅ | `LeaveRequest.reason` is a required `Text` field. |
| 7.7 | الإجازة المرضية بعذر طبي فقط | 🟡 | `LeaveRequest.leaveType` has `SICK` + `attachmentUrl` for medical proof. **But no server-side enforcement** that SICK leave requires attachment. |
| 7.8 | السلفة: سبب + تقسيط أو خصم من الراتب | ✅ | `SalaryAdvance.reason`, `numberOfMonths`, `installmentAmount`, `deductFromCurrent`. |
| 7.9 | قبول/رفض السلفة من المشرفين | ✅ | `SalaryAdvance.status` (PENDING/APPROVED/REJECTED), `reviewedBy`, `reviewedAt`. |
| 7.10 | طلبات: مكافأة، مراجعة، إعفاء، اعتراض | ✅ | `AdminRequestType` enum: `BONUS`, `REVIEW`, `EXEMPTION`, `OBJECTION`. |
| 7.11 | طلب نقل مركبة + مستندات | ✅ | `AdminRequestType.VEHICLE_TRANSFER` + `AdminRequest.attachmentUrl`. |
| 7.12 | طلب نقل وردية/فرع + نقل تلقائي | 🟡 | `AdminRequestType.SHIFT_TRANSFER` exists. **But no auto-transfer logic** upon approval. |
| 7.13 | طلب استلام عهدة | ✅ | `AdminRequestType.ASSET_RECEIPT` + `Asset`/`AssetAssignment` system. |
| 7.14 | طلب إجراء حكومي | ✅ | `AdminRequestType.GOVERNMENT_ACTION`. |
| 7.15 | المتدربون: اعتماد بعد 30 يوم + مكافأة تلقائية | 🟡 | `Trainee` model with `totalDays`, `isCompleted`, `rewardIssued`, `rewardAmount`. **But no auto-completion cron** that checks if 30 days passed and issues reward. |

---

## 8. التحقيقات والمخالفات والتقييمات (Investigations, Violations & Ratings)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 8.1 | طلب الموظف للتحقيق مع إشعار فوري | 🟡 | `Investigation` model + API exists. **But no automatic push notification** on creation. Notification module exists but not wired to investigation events. |
| 8.2 | شكوى مشرف + شكوى موظف | ✅ | `ComplaintType` enum: `SUPERVISOR_COMPLAINT`, `EMPLOYEE_COMPLAINT`. `Complaint` model with full CRUD. |
| 8.3 | صورة المخالفة + صورة المركبة عند تسجيلها | ✅ | `Violation.violationImageUrl` + `vehicleImageUrl` + `bikeImageUrl`. |
| 8.4 | مخالفة "إلحاق ضرر بالعهد" + "سوء سلوك" | ✅ | `PenaltyType` enum includes `ASSET_DAMAGE`, `MISCONDUCT`. |
| 8.5 | تقييم بناءً على تحقيقات ومخالفات | 🟡 | `Rating` model with categories (`punctuality`, `compliance`, `productivity`, etc.) exists. **But no automated scoring** based on violation/investigation history. Manual entry only. |
| 8.6 | طلب ملغى: المشكلة + الفاتورة + صورة + مبلغ الخصم | ✅ | `CanceledOrderLog` with `reason`, `invoiceUrl`, `photoUrl`, `discountAmount`. |

---

## 9. الإشعارات والتنبيهات (Notifications & Alerts)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 9.1 | إشعارات عبر واتساب أو رسائل نصية | ❌ | No WhatsApp API or SMS gateway integration. Notifications are in-app + push only. |
| 9.2 | تنبيه انخفاض تقييم الموظف (< 12 طلب) + بحث أسبوعي/شهري/سنوي | ❌ | No performance threshold alerting system. Report APIs have basic summaries but no automated alert triggers. |
| 9.3 | تنبيهات إدارية + مواعيد بتواريخ محددة من المشرف | ✅ | `ScheduledReminder` model with `targetUserId`, `triggerDate`, `title`, `body`, `createdById`. |

---

## 10. البحث المتقدم والتقارير (Advanced Search & Reports)

| # | Requirement | Status | Details |
|---|-------------|--------|---------|
| 10.1 | تقييد إدخال السلف/المكافآت/الخصومات بتاريخ اليوم | ❌ | No date validation enforcing "today only" on financial entries. |
| 10.2 | إضافة تطبيقات إضافية للمندوب + ملخص شهري لكل تطبيق | ✅ | `PlatformAccount` (multiple per user) + `ReportAppBreakdown` (per-platform daily stats). |
| 10.3 | بحث بهوية المندوب → كافة حساباته وطلباته | 🟡 | User detail API returns relations. **But no single "search by identity → full history" composite endpoint.** |
| 10.4 | بحث عن مركبة ومستخدمها في أي وقت | 🟡 | `VehicleAssignment` tracks assignment history. **But no dedicated "who used vehicle X at time T" search endpoint.** |
| 10.5 | بحث عدد المركبات الإجمالي + سجلات أوقات مستخدميها | 🟡 | Vehicles list exists. `VehicleOdometerLog` has usage history. **No composite report endpoint.** |
| 10.6 | بحث تفصيلي: مخالفات، سلف، مكافآت... خلال مدة | 🟡 | Individual modules have list/filter. **No unified cross-module search API.** |
| 10.7 | بحث عن غيابات وتأخيرات | ❌ | No absence/tardiness tracking model or report. |
| 10.8 | بحث عن موظفين أوشكت وثائقهم على الانتهاء | 🟡 | `GET /reports/expiring-documents` exists and returns expiring docs + licenses. **Works but limited**; doesn't cover all document subtypes (health card, medical insurance, etc.) as separate searches. |
| 10.9 | بحث بـ "رقم الـ 700" | 🟡 | `User.sevenHundredNumber` is indexed. **But no dedicated search endpoint by this field.** Standard user search may not filter by it. |
| 10.10 | بحث عن المجازين، الموقوفين، المركبات المتوقفة | 🟡 | `User.employmentStatus` and `Vehicle.status` filters exist on list endpoints. **But no dedicated aggregation report.** |
| 10.11 | بحث بحساب بنكي أو كاش | 🟡 | `BankAccount.paymentMethod` field exists. **No filter on user list by payment method.** |
| 10.12 | بحث تفاصيل رواتب شهر محدد + مصروفات | 🟡 | `PayrollCycle` + `EmployeePayroll` models exist. **But payroll API/cron is not fully implemented.** |
| 10.13 | بحث بالمدينة، الوردية، أرقام غرف السكن | 🟡 | `User.cityId`, `User.roomNumber` fields exist. Shift has no "branch/ward" field. **Basic but not all filters exposed.** |

---

## 📌 Additional Dashboard-Specific Requests (العميل)

| # | Request | Status | Details |
|---|---------|--------|---------|
| D.1 | رؤية متى بدأ الموظف الشفت ومتى انتهى | ✅ | `Shift.startedAt` + `Shift.endedAt` fields exist in schema and returned by API. Dashboard currently shows status but **could better display timestamps**. |
| D.2 | تصليح الصلاحيات | ✅ | RBAC system with `PERMISSIONS` constants + `adminPerm()` middleware is fully implemented. Specific issues need case-by-case review. |
| D.3 | ظهور المركبات التي عمل عليها الموظف في بروفايله | 🟡 | `VehicleAssignment` tracks history. `Shift` links to `vehicleId`. **But the driver profile API (`GET /users/:id`) does not include vehicle assignment history** in its response. Needs a new include/relation. |
| D.4 | إضافة نوع المستند (بطاقة شخصية، رخصة) في الحالات | ✅ | `DocumentType` enum already has `NATIONAL_ID` (بطاقة شخصية) and multiple license types. This is a **frontend display issue** — the dashboard should show the `type` field. |
| D.5 | الشخص يمتلك أكثر من رخصة | ✅ | `License` model has `userId` as a non-unique FK — **multiple licenses per user are supported**. |
| D.6 | في حسابات المنصات: من يعمل بالحساب حالياً | 🟡 | `PlatformAccount.userId` shows owner. **But no "currently active on this account" indicator** (would require checking active shifts linked to this `platformAccountId`). |
| D.7 | تغيير أسماء status الشفتات (طلب بدء الشفت، يعمل الآن...) | 🟡 | `ShiftStatus` enum uses: `REQUESTED`, `APPROVED`, `ACTIVE`, `ENDED`. These are **English-code enums** — the **frontend should map them** to Arabic labels like "طلب بدء الشفت" = `REQUESTED`, "يعمل الآن" = `ACTIVE`. No backend change needed, only frontend mapping. |
| D.8 | حساب متى انتهى الشفت الخاص باليوزر | ✅ | `Shift.endedAt` is recorded. Combined with `platformAccountId`, you can query when a specific account's shift ended. |
| D.9 | فلتر باستخدام اليوزر والأكونت | 🟡 | Shift list has `userId` filter. **Missing `platformAccountId` filter** on the shift list endpoint. |

---

## 📊 Summary Statistics

| Category | ✅ Implemented | 🟡 Partial | ❌ Missing |
|----------|:-:|:-:|:-:|
| 1. General & Permissions | 4 | 1 | 0 |
| 2. Profile & Personal Data | 8 | 0 | 0 |
| 3. Documents & Custody | 9 | 1 | 0 |
| 4. Vehicles, Maintenance & Fuel | 2 | 3 | 1 |
| 5. Multi-Account & Tracking | 4 | 2 | 0 |
| 6. Shift Cycle & Real-Time | 5 | 3 | 5 |
| 7. Requests & Admin Actions | 11 | 2 | 0 |
| 8. Investigations & Ratings | 4 | 1 | 0 |
| 9. Notifications & Alerts | 1 | 0 | 2 |
| 10. Advanced Search & Reports | 1 | 10 | 2 |
| Dashboard Specific | 5 | 4 | 0 |
| **TOTAL** | **54** | **27** | **10** |

---

## 🔴 Critical Gaps Requiring Immediate Attention

### 1. Background Automation Workers (Cron Jobs)
The following features exist in the **schema** but have **no automated trigger**:
- Oil change reminders at odometer thresholds
- Document expiry notifications
- Trainee auto-completion after 30 days
- Late shift start alerts
- Idle detection (40-min stop warning)

> **Recommendation:** Build a `cron/` service using `node-cron` that runs periodic checks.

### 2. WhatsApp / SMS Integration
No external messaging gateway exists. Notifications are push-only.

> **Recommendation:** Integrate a service like Twilio, MessageBird, or the WhatsApp Business API.

### 3. Real-Time GPS & Geofencing Engine
Schema for `LocationHistory` and `Zone` exists but:
- No WebSocket/MQTT for live tracking
- No server-side geo-fence boundary checks
- No proximity clustering detection

> **Recommendation:** Use Socket.IO for real-time location streaming and a spatial library (like Turf.js) for geo-fence polygon checks.

### 4. Advanced Composite Reports
Most individual module APIs support basic filters, but there is **no unified reporting engine** for cross-module queries (e.g., "show all violations, advances, rewards for driver X between date A and B").

> **Recommendation:** Build a `/reports/driver-summary` endpoint that aggregates across modules.
