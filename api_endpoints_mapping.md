# AAMS API Endpoints Mapping Report
### Reverse-Engineered from Backend Routes vs. Client Requirements

> **Legend**
> - ✅ Fully Complete — No changes needed
> - 🔄 To Be Modified — Existing endpoint needs updates
> - 🆕 Completely New — Must be built from scratch

---

## 📊 Summary

| Category | Count |
|:---|:---:|
| ✅ Fully Complete | 42 |
| 🔄 To Be Modified | 30 |
| 🆕 Completely New | 42+ |
| **Total** | **114+** |

---

## 1. ✅ Fully Complete (No Changes Needed)

These endpoints already match the client requirements perfectly.

### Auth Module
| Method | Route | Notes |
|:---|:---|:---|
| `POST` | `/api/v1/auth/login` | Login with identity number ✅ |
| `POST` | `/api/v1/auth/login-mobile` | Login with mobile + OTP ✅ |
| `POST` | `/api/v1/auth/send-otp` | Send OTP ✅ |
| `POST` | `/api/v1/auth/verify-otp` | Verify OTP ✅ |
| `POST` | `/api/v1/auth/refresh-token` | Refresh tokens ✅ |
| `POST` | `/api/v1/auth/forgot-password` | Forgot password flow ✅ |
| `POST` | `/api/v1/auth/reset-password` | Reset password ✅ |
| `POST` | `/api/v1/auth/admin/login` | Admin login ✅ |
| `GET` | `/api/v1/auth/me` | Current user profile ✅ |
| `POST` | `/api/v1/auth/logout` | Logout ✅ |
| `POST` | `/api/v1/auth/push-token` | Register push token ✅ |
| `DELETE` | `/api/v1/auth/push-token` | Remove push token ✅ |

### Users Module (Admin CRUD)
| Method | Route | Notes |
|:---|:---|:---|
| `GET` | `/api/v1/users` | List users with filtering ✅ |
| `GET` | `/api/v1/users/:id` | Get user by ID ✅ |
| `PATCH` | `/api/v1/users/:id/assign-supervisor` | Assign supervisor ✅ |
| `DELETE` | `/api/v1/users/:id` | Soft delete (admin only) ✅ |

### Notifications Module
| Method | Route | Notes |
|:---|:---|:---|
| `GET` | `/api/v1/notifications` | User notifications ✅ |
| `GET` | `/api/v1/notifications/unread-count` | Unread count ✅ |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark as read ✅ |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all read ✅ |
| `POST` | `/api/v1/notifications/send` | Admin send ✅ |
| `POST` | `/api/v1/notifications/broadcast` | Broadcast ✅ |
| `GET` | `/api/v1/notifications/admin/all` | Admin list all ✅ |
| `GET/POST/PUT` | `/api/v1/notifications/templates` | Template CRUD ✅ |

### Chat Module
| Method | Route | Notes |
|:---|:---|:---|
| `GET` | `/api/v1/chat/conversations` | Conversation list ✅ |
| `GET` | `/api/v1/chat/messages/:partnerId` | Messages with partner ✅ |
| `POST` | `/api/v1/chat/send` | Send message (scoped) ✅ |
| `GET` | `/api/v1/chat/admin/conversations` | Admin view ✅ |

### Documents Module
| Method | Route | Notes |
|:---|:---|:---|
| `GET` | `/api/v1/documents` | List documents ✅ |
| `GET` | `/api/v1/documents/expiring` | Expiring docs ✅ |
| `GET` | `/api/v1/documents/:id` | Get by ID ✅ |
| `DELETE` | `/api/v1/documents/:id` | Soft delete ✅ |

### Incidents Module
| Method | Route | Notes |
|:---|:---|:---|
| `GET` | `/api/v1/incidents` | List incidents ✅ |
| `GET` | `/api/v1/incidents/:id` | Get incident ✅ |
| `POST` | `/api/v1/incidents` | Report incident (multipart) ✅ |
| `PATCH` | `/api/v1/incidents/:id/status` | Update status ✅ |
| `POST` | `/api/v1/incidents/:id/convert-maintenance` | → Maintenance ✅ |
| `DELETE` | `/api/v1/incidents/:id` | Delete ✅ |

### Investigations Module
| Method | Route | Notes |
|:---|:---|:---|
| `GET` | `/api/v1/investigations` | List ✅ |
| `GET` | `/api/v1/investigations/:id` | Get with attachments ✅ |
| `POST` | `/api/v1/investigations/:id/respond` | Employee response ✅ |
| `PATCH` | `/api/v1/investigations/:id/status` | Update status ✅ |

> ⚠️ **Note**: `POST /investigations` currently admin-only. Client requires employees to also initiate investigations (§8). See 🔄 Modified section.

---

## 2. 🔄 To Be Modified (Updates Required)

### Auth — §1 & §7
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/auth/login` | **Validator + Service** | Accept `mobileNumber` or `iqamaNumber` in addition to `identityNumber`. Client wants login via phone, iqama, or ID. |
| `GET` | `/auth/me` | **Service** | Return new fields: `sevenHundredNumber`, `transportType`, `emergencyContact`, `employmentStatus`, `roomNumber`. |

### Users — §2 (Profile & Basic Data)
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/users` | **Validator + Service** | Accept new fields: `sevenHundredNumber`, `transportType`, `emergencyName`, `emergencyRelation`, `emergencyPhone`, `employmentStatus`, `roomNumber`. |
| `PUT` | `/users/:id` | **Validator + Service** | Same new fields as create. Also add `profileImageUrl` upload support (currently text-only). |
| `PATCH` | `/users/:id/status` | **Validator (Enum)** | Add new `AccountStatus` values: `ON_DUTY`, `ON_LEAVE_STATUS`, `SUSPENDED`, `RUNAWAY`, `FINAL_EXIT`. |
| `GET` | `/users` | **Service (Filters)** | Add query filters: `sevenHundredNumber`, `employmentStatus`, `transportType`, `cityId`, `roomNumber`, `hasBankAccount`. |

### Documents — §3
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/documents` | **Validator (Enum)** | Add new `DocumentType` values: `BORDER_NUMBER`, `MUQEEM_ID`, `VISA`, `CONTRACT_WITH_SANAD`, `DRIVER_CARD`, `DRIVING_PERMIT`, `POLICE_CLEARANCE`, `WORK_INJURY`, `CLEARANCE_DOC`, `TERMINATION_DOC`, `HEALTH_CARD`, `MEDICAL_INSURANCE`. |
| `PUT` | `/documents/:id` | **Validator (Enum)** | Same new types. |
| `PATCH` | `/documents/:id/review` | **Service** | Trigger IQAMA expiry notification on review. |

### Licenses — §3 & §7
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/licenses` | **Validator (Enum)** | Add `DRIVER_CARD` type with `issueDate` + `expiryDate`. |
| `GET` | `/licenses/expiring` | **Service** | Include new document types (DRIVER_CARD, HEALTH_CARD) in the expiring query. |

### Bank Accounts — §7
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/bank-accounts` | **Validator + Service** | Add `paymentMethod` field (BANK_TRANSFER / CASH). If CASH, require `cashReceiptPhotoUrl` and `receivedStatus` (RECEIVED / NOT_RECEIVED). |
| `PUT` | `/bank-accounts/:id` | **Validator + Service** | Same new fields. |
| `GET` | `/bank-accounts` | **Service (Filters)** | Add filter by `paymentMethod` (cash vs bank). |

### Platform Accounts — §5 (Multi-Account / Username)
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/platform-accounts` | **Validator + Service** | Add fields: `isAlternate`, `receiptDate`, `returnDate`, `startWorkDate`, `alternateUsername`. |
| `PUT` | `/platform-accounts/:id` | **Validator + Service** | Same new fields. |
| `GET` | `/platform-accounts` | **Service (Filters)** | Add filter by `username` (search by "يوزر"). |

### Shifts — §6
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/shifts/request-start` | **Validator + Service** | Add required fields: `startAppPhotoUrl` (screenshot of app). Validate `startOdometer` is provided. |
| `POST` | `/shifts/:id/start` | **Service** | Add 1km movement validation before allowing `ACTIVE`. Send "تحرك كيلو" notification on approve. |
| `POST` | `/shifts/:id/end` | **Validator + Service** | Require `endAppPhotoUrl`, `endPhotoUrl`, `endOdometer`. Validate `endedAt` is based on actual work end, not fixed 10 PM. |
| `POST` | `/shifts/:id/approve` | **Service** | After approval, send "تحرك كيلو" push notification to driver. |

### Fuel Logs — §4
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/fuel-logs` | **Service (Validation)** | Enforce: receipt photo is mandatory (reject if missing). Limit 2nd fueling/day: check daily order count > threshold. |
| `PATCH` | `/fuel-logs/:id/review` | **Service** | Auto-flag if same vehicle has 2+ logs same day and order count is low. |

### Violations — §8
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/violations` | **Validator** | Add `bikeImageUrl` field for motorcycle/bike photo. Update upload fields to accept `bikeImage`. |
| `PUT` | `/violations/:id` | **Validator** | Same field. |

### Investigations — §8 (Employee-Initiated)
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/investigations` | **Service + Middleware** | Currently admin-only (`COMPLIANCE_WRITE`). Client requires employees to also initiate investigations. Add `authenticate` as alternative guard. Employee-created investigations should auto-notify admins. |

### Maintenance Requests — §4
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/maintenance-requests` | **Service** | Auto-create oil change **request** when odometer ≥ previous + **1000km**. Auto-send oil change **notification** when odometer ≥ previous + **10000km**. (Client specifies two separate thresholds). |
| `PATCH` | `/maintenance-requests/:id/status` | **Service** | When status → `IN_PROGRESS`, set `Vehicle.status = IN_MAINTENANCE`. When `COMPLETED`, restore to `ACTIVE`. |

### Leave Requests — §7
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/leave-requests` | **Validator + Service** | Enforce: `SICK` type requires medical attachment (unless work injury, then admin decides). `reason` is now mandatory for daily leaves. |
| `GET` | `/leave-requests` | **Service (Filters)** | Add filters: `dateFrom`, `dateTo` for searching absences. |

### Salary Advances — §7
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/salary-advances` | **Validator + Service** | Add fields: `numberOfMonths` (installment), `installmentAmount` (calculated). `reason` is now mandatory. |
| `PATCH` | `/salary-advances/:id/review` | **Service** | Allow supervisors to approve/reject (not just finance admins). |

### Penalties — §8
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/penalties` | **Validator (Enum)** | Add penalty reasons: `ASSET_DAMAGE` (إلحاق الضرر بالعهد), `MISCONDUCT` (سوء سلوك). |
| `POST` | `/penalties` | **Service** | Restrict `penaltyDate` to today only, unless SUPER_ADMIN overrides. Require `attachmentUrl` for document proof. |

### Ratings — §8
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/ratings` | **Service** | Auto-aggregate: violations count, shift punctuality, order count vs hours, vehicle condition. |
| `GET` | `/ratings/user/:userId/average` | **Service** | Include investigation count and penalty count in response. |

### Daily Reports — §6
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `POST` | `/daily-reports` | **Service** | Submit based on actual shift end, not fixed 10 PM cutoff. |

### Dashboard — §10
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `GET` | `/dashboard` | **Service** | Add counts: employees by `employmentStatus`, vehicles by status, low-performance drivers (< 12 orders). |

### Reports — §10
| Method | Route | Target Layer | Required Change |
|:---|:---|:---|:---|
| `GET` | `/reports/expiring-documents` | **Service** | Include new document types (DRIVER_CARD, HEALTH_CARD, MEDICAL_INSURANCE, VISA, AJEER_CONTRACT). |
| `GET` | `/reports/driver-productivity` | **Service** | Add filter by `sevenHundredNumber`. Add weekly/monthly/yearly period selector. |

---

## 3. 🆕 Completely New (From Scratch)

### Asset Management (العهد) — §3
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `GET` | `/assets` | Controller + Service | List all asset types (bike, helmet, phone, SIM, thermal box, etc.). |
| `POST` | `/assets` | Controller + Service | Create asset type (admin). |
| `GET` | `/asset-assignments` | Controller + Service | List all assigned assets with photos and status. |
| `POST` | `/asset-assignments` | Controller + Service | Assign asset to employee with photos. |
| `PUT` | `/asset-assignments/:id` | Controller + Service | Update assignment (return date, condition). |
| `PATCH` | `/asset-assignments/:id/return` | Controller + Service | Mark asset as returned, require photos. |
| `GET` | `/asset-assignments/user/:userId` | Controller + Service | All assets for a specific employee. |

### Substitute Vehicle (مركبة بديلة) — §4
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/vehicles/:id/assign-substitute` | Controller + Service | Assign a substitute vehicle with start/end dates. |
| `PATCH` | `/vehicles/:id/release-substitute` | Controller + Service | Release substitute vehicle. |
| `GET` | `/vehicles/substitutes` | Controller + Service | List all active substitute assignments. |

### Oil Change Automation — §4
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `GET` | `/vehicles/:id/oil-change-status` | Controller + Service | Check last oil change km, next due km. |
| `POST` | `/vehicles/:id/oil-change` | Controller + Service | Log oil change event. |

### Break Requests (طلب استراحة) — §6
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/shifts/:id/break-request` | Controller + Service | Driver requests break with reason. |
| `PATCH` | `/shifts/:id/break-request/:breakId/review` | Controller + Service | Supervisor approves/rejects. |

### Shift Closure Request (طلب إقفال شفت) — §7
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/shifts/:id/closure-request` | Controller + Service | Driver requests shift closure (needs admin approval). |
| `PATCH` | `/shifts/:id/closure-request/review` | Controller + Service | Admin approves/rejects closure. |

### Geofencing & Location (التتبع اللحظي) — §6
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/locations/update` | Controller + Service | Driver sends GPS coordinates periodically. |
| `GET` | `/locations/live/:userId` | Controller + Service | Admin/Supervisor gets live location of a driver. |
| `POST` | `/zones` | Controller + Service | Admin creates geographic zone. |
| `PUT` | `/zones/:id` | Controller + Service | Update zone boundaries. |
| `GET` | `/zones` | Controller + Service | List all zones. |
| `POST` | `/zones/restricted` | Controller + Service | Create restricted zone (sends alert on entry). |

### Vehicle Swap Request (طلب تبديل مركبة) — §6
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/shifts/:id/vehicle-swap` | Controller + Service | Driver requests vehicle swap during active shift with reason. |
| `PATCH` | `/shifts/:id/vehicle-swap/:swapId/review` | Controller + Service | Supervisor/Admin approves and assigns new vehicle. |
| `GET` | `/vehicle-swaps` | Controller + Service | List all swap requests with filters. |

### Complaints (شكوى) — §8
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `GET` | `/complaints` | Controller + Service | List complaints. |
| `POST` | `/complaints` | Controller + Service | File complaint (supervisor or employee type). |
| `GET` | `/complaints/:id` | Controller + Service | Get complaint details. |
| `PATCH` | `/complaints/:id/status` | Controller + Service | Update complaint status. |

### Admin Requests (طلبات إدارية متعددة) — §7
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `GET` | `/admin-requests` | Controller + Service | List all admin requests (polymorphic). |
| `POST` | `/admin-requests` | Controller + Service | Create: BONUS, REVIEW, EXEMPTION, OBJECTION, VEHICLE_TRANSFER, SHIFT_TRANSFER, GOVERNMENT_ACTION. |
| `GET` | `/admin-requests/:id` | Controller + Service | Get request details with attachments. |
| `PATCH` | `/admin-requests/:id/review` | Controller + Service | Approve/reject with notes. |

### License Test Workflow (اختبار الرخصة) — §7
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/license-tests/book` | Controller + Service | Book license test appointment. |
| `POST` | `/license-tests/retest` | Controller + Service | Request retest. |
| `PATCH` | `/license-tests/:id/result` | Controller + Service | Set result: ADVANCED, INTERMEDIATE, BEGINNER, FAIL. |
| `GET` | `/license-tests` | Controller + Service | List all test records. |

### Canceled Order Documentation — §8
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/canceled-orders` | Controller + Service | Log canceled/problematic order with invoice, photo, discount amount. |
| `GET` | `/canceled-orders` | Controller + Service | List canceled orders by user/date. |
| `GET` | `/canceled-orders/:id` | Controller + Service | Get details. |

### Trainee Tracking (المتدربون) — §7
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/trainees` | Controller + Service | Register trainee with start date. |
| `PATCH` | `/trainees/:id/complete` | Controller + Service | Auto-approve at 30 days, trigger trainer reward. |
| `GET` | `/trainees` | Controller + Service | List trainees with completion status. |

### Advanced Search / Reports — §10
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `GET` | `/reports/vehicle-usage` | Controller + Service | Search vehicle by plate, show all users and time periods. |
| `GET` | `/reports/user-accounts` | Controller + Service | Search by identity → all platform accounts, orders, advances. |
| `GET` | `/reports/absence-report` | Controller + Service | Absences/tardiness by company or individual. |
| `GET` | `/reports/salary-detail` | Controller + Service | Monthly salary breakdown with deductions/bonuses. |
| `GET` | `/reports/company-expenses` | Controller + Service | Company-wide expenses over time range. |
| `GET` | `/reports/employees-by-700` | Controller + Service | Employees registered under a specific 700 number. |
| `GET` | `/reports/on-leave-employees` | Controller + Service | Currently on leave (annual/weekly). |
| `GET` | `/reports/suspended-employees` | Controller + Service | Suspended with reasons. |
| `GET` | `/reports/stopped-vehicles` | Controller + Service | Inactive vehicles with reasons. |
| `GET` | `/reports/employees-by-room` | Controller + Service | Employees grouped by room number. |
| `GET` | `/reports/platform-account-history` | Controller + Service | Per-يوزر: who worked, when, how many orders. |

### WhatsApp/SMS Integration — §9
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/notifications/whatsapp` | Service + External API | Send notification via WhatsApp (Twilio/360dialog). |
| `POST` | `/notifications/sms` | Service + External API | Send notification via SMS. |

### Scheduled Reminders (تنبيهات مواعيد) — §9
| Method | Route | Target Layer | Description |
|:---|:---|:---|:---|
| `POST` | `/reminders` | Controller + Service | Supervisor creates a scheduled reminder for employee(s) on a specific date. |
| `GET` | `/reminders` | Controller + Service | List reminders (scoped: supervisor sees own, admin sees all). |
| `PUT` | `/reminders/:id` | Controller + Service | Update reminder. |
| `DELETE` | `/reminders/:id` | Controller + Service | Cancel reminder. |

### Scheduler / Cron Jobs — §4, §6, §9
> These are not API endpoints but background services that need to be created:

| Job | Description |
|:---|:---|
| `DocumentExpiryChecker` | Daily cron: check all docs/licenses expiring in 30 days → send notification. |
| `OilChangeMonitor` | On odometer update: check if 10000km threshold crossed → auto-create maintenance request + notification. |
| `ShiftLateAlert` | Check if driver hasn't started approved shift within N minutes → alert supervisors. |
| `IdleDriverAlert` | Check location logs: driver stationary > 40 min → alert supervisor. |
| `CongregationAlert` | Check if 2+ drivers are in same zone → alert supervisors. |
| `DisconnectionMonitor` | Check if driver's last location update > N minutes → alert supervisors. |
| `LowPerformanceAlert` | Weekly: flag drivers with < 12 orders → alert admin. |
| `ScheduledReminderDispatcher` | Check `reminders` table daily → send notifications on trigger date. |
| `OilChangeRequestAt1k` | On odometer update: if ≥ 1000km since last oil change → auto-create maintenance REQUEST. |
| `TraineeAutoCompletion` | Daily cron: check trainees with 30+ days → auto-mark complete + reward trainer. |

---

## 4. Schema Changes Required (Pre-requisite)

> [!IMPORTANT]
> Before implementing any of the above, the Prisma schema must be updated first. Here's a summary of all new models and fields:

### New Enums
- `EmploymentStatus`: `ON_DUTY`, `ON_LEAVE`, `SUSPENDED`, `RUNAWAY`, `FINAL_EXIT`
- `TransportType`: `CAR`, `MOTORCYCLE`, `TRUCK`
- `PaymentMethod`: `BANK_TRANSFER`, `CASH`
- `AdminRequestType`: `BONUS`, `REVIEW`, `EXEMPTION`, `OBJECTION`, `VEHICLE_TRANSFER`, `SHIFT_TRANSFER`, `GOVERNMENT_ACTION`
- `LicenseTestResult`: `ADVANCED`, `INTERMEDIATE`, `BEGINNER`, `FAIL`
- `ComplaintType`: `SUPERVISOR_COMPLAINT`, `EMPLOYEE_COMPLAINT`

### Modified Models
- **User**: + `sevenHundredNumber`, `transportType`, `employmentStatus`, `emergencyName`, `emergencyRelation`, `emergencyPhone`, `roomNumber`
- **PlatformAccount**: + `isAlternate`, `alternateUsername`, `receiptDate`, `returnDate`, `startWorkDate`
- **Shift**: + `startAppPhotoUrl`, `endAppPhotoUrl`, `closureRequested`, `closureApprovedBy`
- **SalaryAdvance**: + `numberOfMonths`, `installmentAmount`
- **BankAccount**: + `paymentMethod`, `cashReceiptPhotoUrl`, `receivedStatus`, `receivedDate`
- **Violation**: + `bikeImageUrl`
- **DocumentType enum**: + 10 new values
- **PenaltyType enum**: + `ASSET_DAMAGE`, `MISCONDUCT`

### New Models
- `Asset`, `AssetAssignment`, `LocationHistory`, `Zone`, `RestrictedZone`
- `BreakRequest`, `Complaint`, `AdminRequest`, `LicenseTest`
- `CanceledOrderLog`, `Trainee`, `SubstituteVehicle`, `OilChangeLog`
- `VehicleSwapRequest`, `ScheduledReminder`
