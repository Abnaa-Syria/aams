const prisma = require('../../config/database');
const UserService = require('../users/service');
const ShiftService = require('../shifts/service');
const MaintenanceRequestService = require('../maintenanceRequests/service');
const LeaveRequestService = require('../leaveRequests/service');
const IncidentService = require('../incidents/service');
const FuelLogService = require('../fuelLogs/service');
const DocumentService = require('../documents/service');
const ViolationService = require('../violations/service');
const PenaltyService = require('../penalties/service');
const RewardService = require('../rewards/service');
const InvestigationService = require('../investigations/service');
const PermissionRequestService = require('../permissionRequests/service');
const SalaryAdvanceService = require('../salaryAdvances/service');
const DailyReportService = require('../dailyReports/service');
const PlatformAccountService = require('../platformAccounts/service');
const TicketService = require('../tickets/service');
const VehicleService = require('../vehicles/service');
const { getPaginationParams } = require('../../utils/pagination');
const { mergeDriverNameIntoUserWhere, applyUserOwnedListScope } = require('../../utils/listScope');

const driverCol = { get: (r) => r.user?.fullNameAr || r.appUser?.user?.fullNameAr, label: 'السائق' };
const vehicleCol = { get: (r) => r.vehicle?.plateNumber, label: 'المركبة' };

/** @type {Record<string, { columns: object[], fetchIds(ids): Promise<any[]>, fetchFiltered?(filters, req): Promise<any[]> }>} */
const EXPORT_REGISTRY = {
  users: {
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'fullNameAr', label: 'الاسم' },
      { key: 'identityNumber', label: 'رقم الهوية' },
      { key: 'mobileNumber', label: 'الجوال' },
      { get: (r) => r.availabilityStatus, label: 'التوفر' },
      { get: (r) => r.employmentStatus, label: 'حالة التوظيف' },
      { key: 'accountStatus', label: 'حالة الحساب' },
    ],
    fetchIds: (ids) => prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, fullNameAr: true, identityNumber: true, mobileNumber: true, accountStatus: true,
        appUser: { select: { availabilityStatus: true, employmentStatus: true } },
      },
    }).then((rows) => rows.map((u) => ({
      ...u,
      availabilityStatus: u.appUser?.availabilityStatus,
      employmentStatus: u.appUser?.employmentStatus,
    }))),
    fetchFiltered: async (filters, req) => {
      const r = await UserService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.users || r.items || [];
    },
  },
  vehicles: {
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'plateNumber', label: 'اللوحة' },
      { key: 'manufacturer', label: 'الشركة' },
      { key: 'model', label: 'الموديل' },
      { key: 'year', label: 'السنة' },
      { key: 'status', label: 'الحالة' },
      { key: 'odometerKm', label: 'العداد' },
    ],
    fetchIds: (ids) => prisma.vehicle.findMany({ where: { id: { in: ids } } }),
    fetchFiltered: async (filters, req) => {
      const r = await VehicleService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.vehicles || r.items || [];
    },
  },
  shifts: {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      vehicleCol,
      { key: 'status', label: 'الحالة' },
      { key: 'requestedAt', label: 'تاريخ الطلب' },
      { key: 'startedAt', label: 'بدء' },
      { key: 'endedAt', label: 'انتهاء' },
    ],
    fetchIds: (ids) => prisma.shift.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { fullNameAr: true } },
        vehicle: { select: { plateNumber: true } },
      },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await ShiftService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  'maintenance-requests': {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      vehicleCol,
      { key: 'issueType', label: 'النوع' },
      { key: 'priority', label: 'الأولوية' },
      { key: 'status', label: 'الحالة' },
      { key: 'description', label: 'الوصف' },
      { key: 'createdAt', label: 'التاريخ' },
    ],
    fetchIds: (ids) => prisma.maintenanceRequest.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { fullNameAr: true } },
        vehicle: { select: { plateNumber: true } },
      },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await MaintenanceRequestService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  'leave-requests': {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'leaveType', label: 'النوع' },
      { key: 'startDate', label: 'من' },
      { key: 'endDate', label: 'إلى' },
      { key: 'status', label: 'الحالة' },
    ],
    fetchIds: (ids) => prisma.leaveRequest.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await LeaveRequestService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  incidents: {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'type', label: 'النوع' },
      { key: 'title', label: 'العنوان' },
      { key: 'severity', label: 'الخطورة' },
      { key: 'status', label: 'الحالة' },
      { key: 'createdAt', label: 'التاريخ' },
    ],
    fetchIds: (ids) => prisma.incident.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await IncidentService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  'fuel-logs': {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      vehicleCol,
      { key: 'amount', label: 'المبلغ' },
      { key: 'liters', label: 'اللترات' },
      { key: 'fuelDate', label: 'التاريخ' },
      { key: 'status', label: 'الحالة' },
    ],
    fetchIds: (ids) => prisma.fuelLog.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { fullNameAr: true } },
        vehicle: { select: { plateNumber: true } },
      },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await FuelLogService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  documents: {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'type', label: 'النوع' },
      { key: 'title', label: 'العنوان' },
      { key: 'status', label: 'الحالة' },
      { key: 'expiryDate', label: 'انتهاء' },
    ],
    fetchIds: (ids) => prisma.document.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await DocumentService.list({ ...filters, limit: 5000, page: 1 }, req);
      return r.items;
    },
  },
  licenses: {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'type', label: 'النوع' },
      { key: 'licenseNumber', label: 'رقم الرخصة' },
      { key: 'status', label: 'الحالة' },
      { key: 'expiryDate', label: 'انتهاء' },
    ],
    fetchIds: (ids) => prisma.license.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const { skip, limit } = getPaginationParams({ ...filters, limit: 5000, page: 1 });
      let where = {
        deletedAt: null,
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.userId && { userId: parseInt(filters.userId) }),
      };
      where = applyUserOwnedListScope(where, req);
      where = mergeDriverNameIntoUserWhere(where, filters);
      return prisma.license.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullNameAr: true } } },
      });
    },
  },
  violations: {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      vehicleCol,
      { key: 'reason', label: 'السبب' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة' },
      { key: 'violationDate', label: 'التاريخ' },
    ],
    fetchIds: (ids) => prisma.violation.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { fullNameAr: true } },
        vehicle: { select: { plateNumber: true } },
      },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await ViolationService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  penalties: {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'type', label: 'النوع' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة' },
      { key: 'penaltyDate', label: 'التاريخ' },
    ],
    fetchIds: (ids) => prisma.penalty.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await PenaltyService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  rewards: {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'category', label: 'الفئة' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة' },
    ],
    fetchIds: (ids) => prisma.reward.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await RewardService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  investigations: {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'title', label: 'العنوان' },
      { key: 'category', label: 'الفئة' },
      { key: 'status', label: 'الحالة' },
    ],
    fetchIds: (ids) => prisma.investigation.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await InvestigationService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  'permission-requests': {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'permissionDate', label: 'التاريخ' },
      { key: 'startTime', label: 'من' },
      { key: 'endTime', label: 'إلى' },
      { key: 'status', label: 'الحالة' },
    ],
    fetchIds: (ids) => prisma.permissionRequest.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await PermissionRequestService.list({ ...filters, limit: 5000, page: 1 }, req.user, req);
      return r.items;
    },
  },
  'salary-advances': {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة' },
      { key: 'createdAt', label: 'التاريخ' },
    ],
    fetchIds: (ids) => prisma.salaryAdvance.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await SalaryAdvanceService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  'daily-reports': {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'reportDate', label: 'التاريخ' },
      { key: 'totalHours', label: 'الساعات' },
      { key: 'status', label: 'الحالة' },
    ],
    fetchIds: (ids) => prisma.dailyReport.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await DailyReportService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  'bank-accounts': {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { key: 'bankName', label: 'البنك' },
      { key: 'iban', label: 'IBAN' },
      { key: 'verificationStatus', label: 'التحقق' },
    ],
    fetchIds: (ids) => prisma.bankAccount.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { fullNameAr: true } } },
    }),
    fetchFiltered: async (filters, req) => {
      const { skip, limit } = getPaginationParams({ ...filters, limit: 5000, page: 1 });
      let where = {
        deletedAt: null,
        ...(filters.userId && { userId: parseInt(filters.userId) }),
        ...(filters.verificationStatus && { verificationStatus: filters.verificationStatus }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
      };
      where = applyUserOwnedListScope(where, req);
      where = mergeDriverNameIntoUserWhere(where, filters);
      return prisma.bankAccount.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullNameAr: true } } },
      });
    },
  },
  'platform-accounts': {
    columns: [
      { key: 'id', label: 'ID' },
      driverCol,
      { get: (r) => r.platform?.nameAr, label: 'المنصة' },
      { key: 'status', label: 'الحالة' },
    ],
    fetchIds: (ids) => prisma.platformAccount.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { fullNameAr: true } },
        platform: { select: { nameAr: true } },
      },
    }),
    fetchFiltered: async (filters, req) => {
      const r = await PlatformAccountService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  tickets: {
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'العنوان' },
      { key: 'category', label: 'الفئة' },
      { key: 'priority', label: 'الأولوية' },
      { key: 'status', label: 'الحالة' },
    ],
    fetchIds: (ids) => prisma.ticket.findMany({ where: { id: { in: ids } } }),
    fetchFiltered: async (filters, req) => {
      const r = await TicketService.list({ ...filters, limit: 5000, page: 1 }, req.user);
      return r.items;
    },
  },
  'audit-logs': {
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'action', label: 'الإجراء' },
      { key: 'entity', label: 'الكيان' },
      { key: 'entityId', label: 'معرف الكيان' },
      { key: 'createdAt', label: 'التاريخ' },
    ],
    fetchIds: (ids) => prisma.auditLog.findMany({ where: { id: { in: ids } } }),
    fetchFiltered: async (filters) => {
      const { skip, limit } = getPaginationParams({ ...filters, limit: 5000, page: 1 });
      const where = {
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: parseInt(filters.userId) }),
      };
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
      }
      return prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } });
    },
  },
};

module.exports = { EXPORT_REGISTRY };
