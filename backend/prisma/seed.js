const bcrypt = require('bcryptjs');

require('dotenv').config();
const prisma = require('../src/config/database');

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function getUserByIdentity(identityNumber) {
  return prisma.user.findUnique({ where: { identityNumber } });
}

async function resetDemoData(demoUserIds) {
  // Delete children first (FK constraints)
  await prisma.shiftLog.deleteMany({ where: { shift: { userId: { in: demoUserIds } } } });
  await prisma.midShiftRecord.deleteMany({ where: { shift: { userId: { in: demoUserIds } } } });

  await prisma.reportScreenshot.deleteMany({ where: { report: { userId: { in: demoUserIds } } } });
  await prisma.reportAppBreakdown.deleteMany({ where: { report: { userId: { in: demoUserIds } } } });
  await prisma.dailyReport.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.incidentAttachment.deleteMany({ where: { incident: { userId: { in: demoUserIds } } } });
  await prisma.incident.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.violation.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.fuelLog.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.leaveRequest.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.leaveBalance.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.salaryAdvance.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.maintenanceRequest.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.reward.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.penalty.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.rating.deleteMany({ where: { OR: [{ userId: { in: demoUserIds } }, { ratedById: { in: demoUserIds } }] } });

  await prisma.investigationAttachment.deleteMany({ where: { investigation: { userId: { in: demoUserIds } } } });
  await prisma.investigationEvent.deleteMany({ where: { investigation: { userId: { in: demoUserIds } } } });
  await prisma.investigation.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.notification.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.chatMessage.deleteMany({ where: { OR: [{ senderId: { in: demoUserIds } }, { receiverId: { in: demoUserIds } }] } });

  // Shifts reference platformAccountId and vehicleId; remove before platform accounts cleanup
  await prisma.shift.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.vehicleAssignment.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.platformAccount.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.bankAccount.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.license.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.document.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.pushDeviceToken?.deleteMany?.({ where: { userId: { in: demoUserIds } } });
}

async function main() {
  console.log('Seeding database...');

  // Create Super Admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { identityNumber: '1000000001' },
    update: {},
    create: {
      identityNumber: '1000000001',
      mobileNumber: '0500000001',
      email: 'admin@aams.com',
      passwordHash: adminPassword,
      fullNameAr: 'مدير النظام',
      fullNameEn: 'System Admin',
      role: 'SUPER_ADMIN',
      accountStatus: 'ACTIVE',
      employeeNumber: 'ADM001',
    },
  });
  console.log('Super Admin created:', superAdmin.id);

  // Create Operations Admin
  const opsAdmin = await prisma.user.upsert({
    where: { identityNumber: '1000000002' },
    update: {},
    create: {
      identityNumber: '1000000002',
      mobileNumber: '0500000002',
      email: 'ops@aams.com',
      passwordHash: adminPassword,
      fullNameAr: 'مدير العمليات',
      fullNameEn: 'Operations Admin',
      role: 'OPERATIONS_ADMIN',
      accountStatus: 'ACTIVE',
      employeeNumber: 'ADM002',
    },
  });

  // Create additional admins (to showcase permissions in dashboard)
  await prisma.user.upsert({
    where: { identityNumber: '1000000003' },
    update: {},
    create: {
      identityNumber: '1000000003',
      mobileNumber: '0500000003',
      email: 'hr@aams.com',
      passwordHash: adminPassword,
      fullNameAr: 'مدير الموارد البشرية',
      fullNameEn: 'HR Admin',
      role: 'HR_ADMIN',
      accountStatus: 'ACTIVE',
      employeeNumber: 'ADM003',
    },
  });
  await prisma.user.upsert({
    where: { identityNumber: '1000000004' },
    update: {},
    create: {
      identityNumber: '1000000004',
      mobileNumber: '0500000004',
      email: 'fleet@aams.com',
      passwordHash: adminPassword,
      fullNameAr: 'مدير الأسطول',
      fullNameEn: 'Fleet Admin',
      role: 'FLEET_ADMIN',
      accountStatus: 'ACTIVE',
      employeeNumber: 'ADM004',
    },
  });
  await prisma.user.upsert({
    where: { identityNumber: '1000000005' },
    update: {},
    create: {
      identityNumber: '1000000005',
      mobileNumber: '0500000005',
      email: 'finance@aams.com',
      passwordHash: adminPassword,
      fullNameAr: 'مدير المالية',
      fullNameEn: 'Finance Admin',
      role: 'FINANCE_ADMIN',
      accountStatus: 'ACTIVE',
      employeeNumber: 'ADM005',
    },
  });

  // Create Cities
  const cities = [
    { nameAr: 'الرياض', nameEn: 'Riyadh', region: 'الوسطى' },
    { nameAr: 'جدة', nameEn: 'Jeddah', region: 'الغربية' },
    { nameAr: 'الدمام', nameEn: 'Dammam', region: 'الشرقية' },
    { nameAr: 'مكة المكرمة', nameEn: 'Makkah', region: 'الغربية' },
    { nameAr: 'المدينة المنورة', nameEn: 'Madinah', region: 'الغربية' },
    { nameAr: 'تبوك', nameEn: 'Tabuk', region: 'الشمالية' },
  ];
  for (const city of cities) {
    await prisma.city.upsert({ where: { id: cities.indexOf(city) + 1 }, update: {}, create: city });
  }
  console.log('Cities created');

  // Create Platforms
  const platforms = [
    { nameAr: 'كيتا', nameEn: 'Keeta' },
    { nameAr: 'هنقرستيشن', nameEn: 'HungerStation' },
    { nameAr: 'نينجا', nameEn: 'Ninja' },
    { nameAr: 'مرسول', nameEn: 'Marsool' },
    { nameAr: 'جاهز', nameEn: 'Jahez' },
    { nameAr: 'تو يو', nameEn: 'ToYou' },
  ];
  for (const platform of platforms) {
    await prisma.platform.upsert({ where: { id: platforms.indexOf(platform) + 1 }, update: {}, create: platform });
  }
  console.log('Platforms created');

  // Create Supervisor
  const supervisor = await prisma.user.upsert({
    where: { identityNumber: '2000000001' },
    update: {},
    create: {
      identityNumber: '2000000001',
      mobileNumber: '0500000010',
      passwordHash: adminPassword,
      fullNameAr: 'أحمد المشرف',
      fullNameEn: 'Ahmed Supervisor',
      role: 'SUPERVISOR',
      accountStatus: 'ACTIVE',
      employeeNumber: 'SUP001',
      cityId: 1,
    },
  });
  console.log('Supervisor created:', supervisor.id);

  // Create sample drivers
  const driverPassword = await bcrypt.hash('driver123', 12);
  const drivers = [
    { identityNumber: '3000000001', mobileNumber: '0500000100', fullNameAr: 'محمد الأحمد', fullNameEn: 'Mohammed Al-Ahmad', employeeNumber: 'DRV001' },
    { identityNumber: '3000000002', mobileNumber: '0500000101', fullNameAr: 'خالد العمري', fullNameEn: 'Khalid Al-Omari', employeeNumber: 'DRV002' },
    { identityNumber: '3000000003', mobileNumber: '0500000102', fullNameAr: 'عبدالله الشهري', fullNameEn: 'Abdullah Al-Shahri', employeeNumber: 'DRV003' },
    { identityNumber: '3000000004', mobileNumber: '0500000103', fullNameAr: 'فهد الدوسري', fullNameEn: 'Fahad Al-Dosari', employeeNumber: 'DRV004' },
    { identityNumber: '3000000005', mobileNumber: '0500000104', fullNameAr: 'سعد القحطاني', fullNameEn: 'Saad Al-Qahtani', employeeNumber: 'DRV005' },
  ];

  for (const driver of drivers) {
    await prisma.user.upsert({
      where: { identityNumber: driver.identityNumber },
      update: {},
      create: {
        ...driver,
        passwordHash: driverPassword,
        role: 'DRIVER',
        accountStatus: 'ACTIVE',
        supervisorId: supervisor.id,
        cityId: 1,
        gender: 'MALE',
      },
    });
  }
  console.log('Drivers created');

  const driverUsers = await prisma.user.findMany({
    where: { identityNumber: { in: drivers.map((d) => d.identityNumber) } },
    select: { id: true, identityNumber: true, fullNameAr: true, supervisorId: true },
    orderBy: { id: 'asc' },
  });

  // Optional: reset demo transactional data for these users (safe for dev)
  if (String(process.env.SEED_RESET || '').toLowerCase() === 'true') {
    console.log('SEED_RESET=true → cleaning demo data…');
    await resetDemoData(driverUsers.map((u) => u.id));
  }

  // Create Vehicles
  const vehicles = [
    { plateNumber: 'ABC 1234', manufacturer: 'Toyota', model: 'Hilux', year: 2023, color: 'أبيض' },
    { plateNumber: 'XYZ 5678', manufacturer: 'Hyundai', model: 'Accent', year: 2024, color: 'فضي' },
    { plateNumber: 'DEF 9012', manufacturer: 'Suzuki', model: 'Swift', year: 2023, color: 'أسود' },
    { plateNumber: 'GHI 3456', manufacturer: 'Kia', model: 'Rio', year: 2022, color: 'أحمر' },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { plateNumber: vehicle.plateNumber },
      update: {},
      create: { ...vehicle, status: 'ACTIVE', ownershipStatus: 'COMPANY_OWNED' },
    });
  }
  console.log('Vehicles created');

  const vehicleRows = await prisma.vehicle.findMany({
    where: { plateNumber: { in: vehicles.map((v) => v.plateNumber) } },
    select: { id: true, plateNumber: true },
  });

  // Assign first vehicles to first drivers (to populate dashboard columns)
  for (let i = 0; i < Math.min(driverUsers.length, vehicleRows.length); i++) {
    const driver = driverUsers[i];
    const vehicle = vehicleRows[i];
    const existing = await prisma.vehicleAssignment.findFirst({
      where: { userId: driver.id, vehicleId: vehicle.id, isActive: true },
      select: { id: true },
    });
    if (!existing) {
      await prisma.vehicleAssignment.create({
        data: { userId: driver.id, vehicleId: vehicle.id, notes: 'seed demo assignment' },
      });
    }
  }

  // Create platform accounts for drivers (required for shifts)
  const platformRows = await prisma.platform.findMany({ select: { id: true, nameAr: true }, orderBy: { id: 'asc' } });
  const platformAccounts = [];
  for (let i = 0; i < driverUsers.length; i++) {
    const driver = driverUsers[i];
    const platform = platformRows[i % platformRows.length];
    const username = `drv_${driver.identityNumber}`;
    const existing = await prisma.platformAccount.findFirst({
      where: { userId: driver.id, platformId: platform.id, deletedAt: null },
      select: { id: true },
    });
    const row = existing
      ? await prisma.platformAccount.update({ where: { id: existing.id }, data: { username, status: 'ACTIVE' } })
      : await prisma.platformAccount.create({
        data: {
          userId: driver.id,
          platformId: platform.id,
          username,
          accountId: `ACCT-${driver.identityNumber}`,
          status: 'ACTIVE',
          notes: 'seed demo',
        },
      });
    platformAccounts.push(row);
  }

  // Create documents + licenses + bank accounts for each driver
  for (const driver of driverUsers) {
    await prisma.document.create({
      data: {
        userId: driver.id,
        type: 'IQAMA',
        title: 'إقامة',
        documentNumber: `IQ-${driver.identityNumber}`,
        issueDate: daysFromNow(-365),
        expiryDate: daysFromNow(20),
        status: 'NEAR_EXPIRY',
        fileUrl: 'uploads/demo/iqama.pdf',
        fileName: 'iqama.pdf',
      },
    }).catch(() => {});

    await prisma.document.create({
      data: {
        userId: driver.id,
        type: 'WORK_CONTRACT',
        title: 'عقد عمل',
        documentNumber: `CT-${driver.identityNumber}`,
        issueDate: daysFromNow(-180),
        expiryDate: daysFromNow(180),
        status: 'VALID',
        fileUrl: 'uploads/demo/contract.pdf',
        fileName: 'contract.pdf',
      },
    }).catch(() => {});

    await prisma.license.create({
      data: {
        userId: driver.id,
        type: 'DRIVING_LICENSE',
        title: 'رخصة قيادة',
        licenseNumber: `DL-${driver.identityNumber}`,
        issueDate: daysFromNow(-700),
        expiryDate: daysFromNow(60),
        status: 'VALID',
        fileUrl: 'uploads/demo/license.pdf',
        fileName: 'license.pdf',
      },
    }).catch(() => {});

    await prisma.bankAccount.create({
      data: {
        userId: driver.id,
        bankName: 'البنك الأهلي',
        iban: `SA${driver.identityNumber}000000000000`,
        accountOwnerName: driver.fullNameAr,
        isDefault: true,
        verificationStatus: 'VERIFIED',
        proofFileUrl: 'uploads/demo/iban.pdf',
        proofFileName: 'iban.pdf',
      },
    }).catch(() => {});
  }

  // Create shifts with different statuses + logs + related records
  for (let i = 0; i < driverUsers.length; i++) {
    const driver = driverUsers[i];
    const vehicle = vehicleRows[i % vehicleRows.length];
    const pAcc = platformAccounts[i % platformAccounts.length];

    const requested = await prisma.shift.create({
      data: {
        userId: driver.id,
        vehicleId: vehicle.id,
        platformAccountId: pAcc.id,
        status: 'REQUESTED',
        notes: 'seed requested shift',
      },
    });
    await prisma.shiftLog.create({ data: { shiftId: requested.id, action: 'SHIFT_REQUESTED', performedBy: driver.id } });

    const approved = await prisma.shift.create({
      data: {
        userId: driver.id,
        vehicleId: vehicle.id,
        platformAccountId: pAcc.id,
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: opsAdmin.id,
        notes: 'seed approved shift',
      },
    });
    await prisma.shiftLog.create({ data: { shiftId: approved.id, action: 'SHIFT_APPROVED', performedBy: opsAdmin.id } });

    const active = await prisma.shift.create({
      data: {
        userId: driver.id,
        vehicleId: vehicle.id,
        platformAccountId: pAcc.id,
        status: 'ACTIVE',
        approvedAt: new Date(),
        approvedBy: opsAdmin.id,
        startedAt: daysFromNow(0),
        startPhotoUrl: 'uploads/demo/shift_start.jpg',
        notes: 'seed active shift',
      },
    });
    await prisma.shiftLog.create({ data: { shiftId: active.id, action: 'SHIFT_STARTED', performedBy: driver.id } });

    await prisma.midShiftRecord.create({
      data: {
        shiftId: active.id,
        screenshotUrl: 'uploads/demo/midshift.webp',
        notes: 'seed mid-shift record',
        checklistData: { tires: true, fuel: true },
      },
    });

    await prisma.fuelLog.create({
      data: {
        userId: driver.id,
        vehicleId: vehicle.id,
        shiftId: active.id,
        amount: '120.50',
        liters: '25.30',
        fuelDate: daysFromNow(-1),
        status: 'APPROVED',
        reviewedBy: opsAdmin.id,
        reviewedAt: new Date(),
        receiptUrl: 'uploads/demo/receipt.jpg',
      },
    });

    await prisma.violation.create({
      data: {
        userId: driver.id,
        vehicleId: vehicle.id,
        shiftId: active.id,
        reason: 'تجاوز سرعة',
        amount: '150.00',
        location: 'الرياض',
        violationDate: daysFromNow(-2),
        status: 'UNDER_REVIEW',
      },
    });

    const incident = await prisma.incident.create({
      data: {
        userId: driver.id,
        shiftId: active.id,
        type: 'BREAKDOWN',
        severity: 'MEDIUM',
        title: 'عطل بسيط',
        description: 'تم تسجيل عطل بسيط أثناء الشفت',
        location: 'الرياض',
        status: 'OPEN',
      },
    });
    await prisma.incidentAttachment.create({
      data: { incidentId: incident.id, fileUrl: 'uploads/demo/incident.jpg', fileName: 'incident.jpg', fileType: 'image/jpeg' },
    });

    const report = await prisma.dailyReport.create({
      data: {
        userId: driver.id,
        shiftId: active.id,
        reportDate: daysFromNow(-1),
        totalHours: '9.5',
        totalOrders: 22,
        status: 'APPROVED',
        reviewedBy: opsAdmin.id,
        reviewedAt: new Date(),
        notes: 'seed daily report',
      },
    });
    await prisma.reportAppBreakdown.create({
      data: { reportId: report.id, platformName: 'Keeta', orders: 10, hours: '4.0', earnings: '120.00' },
    });
    await prisma.reportScreenshot.create({
      data: { reportId: report.id, fileUrl: 'uploads/demo/report.png', fileName: 'report.png' },
    });

    await prisma.leaveBalance.upsert({
      where: { userId_leaveType_year: { userId: driver.id, leaveType: 'ANNUAL', year: new Date().getFullYear() } },
      update: { totalDays: 30, remainingDays: 25, usedDays: 5 },
      create: { userId: driver.id, leaveType: 'ANNUAL', year: new Date().getFullYear(), totalDays: 30, remainingDays: 25, usedDays: 5 },
    });

    await prisma.leaveRequest.create({
      data: {
        userId: driver.id,
        leaveType: 'ANNUAL',
        startDate: daysFromNow(5),
        endDate: daysFromNow(7),
        totalDays: 3,
        reason: 'إجازة ديمو للوحة التحكم',
        status: 'PENDING',
        attachmentUrl: 'uploads/demo/leave.pdf',
      },
    });

    await prisma.salaryAdvance.create({
      data: {
        userId: driver.id,
        amount: '500.00',
        reason: 'سلفة ديمو',
        status: 'PENDING',
      },
    });

    await prisma.maintenanceRequest.create({
      data: {
        userId: driver.id,
        vehicleId: vehicle.id,
        issueType: 'صيانة دورية',
        priority: 'LOW',
        description: 'طلب صيانة ديمو',
        status: 'REQUESTED',
        attachmentUrl: 'uploads/demo/maint.jpg',
      },
    });

    await prisma.penalty.create({
      data: {
        userId: driver.id,
        type: 'FINANCIAL',
        amount: '100.00',
        reason: 'جزاء ديمو',
        status: 'APPLIED',
        penaltyDate: daysFromNow(-10),
        createdBy: opsAdmin.id,
        approvedBy: opsAdmin.id,
        approvedAt: new Date(),
      },
    });

    await prisma.reward.create({
      data: {
        userId: driver.id,
        category: 'PERFORMANCE',
        amount: '200.00',
        reason: 'مكافأة ديمو',
        status: 'APPROVED',
        approvedBy: opsAdmin.id,
        approvedAt: new Date(),
      },
    });

    await prisma.rating.create({
      data: {
        userId: driver.id,
        ratedById: supervisor.id,
        overallScore: '4.5',
        punctuality: '4.0',
        communication: '4.5',
        compliance: '4.8',
        productivity: '4.4',
        period: '2026-04',
        notes: 'تقييم ديمو',
      },
    });

    const inv = await prisma.investigation.create({
      data: {
        userId: driver.id,
        createdById: opsAdmin.id,
        category: 'COMPLIANCE',
        title: 'تحقيق ديمو',
        details: 'تم فتح تحقيق لغرض تجربة لوحة التحكم',
        status: 'PENDING_RESPONSE',
        internalNotes: 'seed internal notes',
      },
    });
    await prisma.investigationEvent.create({ data: { investigationId: inv.id, action: 'Investigation opened', performedBy: opsAdmin.id } });

    await prisma.notification.createMany({
      data: [
        { userId: driver.id, title: 'تنبيه مستندات', body: 'لديك مستندات قريبة الانتهاء', category: 'DOCUMENT' },
        { userId: driver.id, title: 'تنبيه شفت', body: 'تمت الموافقة على الشفت', category: 'SHIFT' },
      ],
    });
  }

  // Seed chat between supervisor and first driver
  if (driverUsers[0]) {
    const d = driverUsers[0];
    await prisma.chatMessage.createMany({
      data: [
        { senderId: d.id, receiverId: supervisor.id, message: 'السلام عليكم، جاهز لبدء الشفت؟', tag: 'seed' },
        { senderId: supervisor.id, receiverId: d.id, message: 'وعليكم السلام، تم اعتماد الطلب. بالتوفيق.', tag: 'seed' },
      ],
    }).catch(() => {});
  }

  // Seed audit logs to populate audit page
  await prisma.auditLog.createMany({
    data: [
      { userId: superAdmin.id, action: 'SEED', entity: 'System', entityId: '0', ipAddress: '127.0.0.1', userAgent: 'seed', newValue: { note: 'seed run' } },
      { userId: opsAdmin.id, action: 'APPROVE_SHIFT', entity: 'Shift', entityId: '1', ipAddress: '127.0.0.1', userAgent: 'seed' },
    ],
  }).catch(() => {});

  // Create Master Data Types
  const masterData = [
    { category: 'leave_type', nameAr: 'إجازة سنوية', nameEn: 'Annual Leave' },
    { category: 'leave_type', nameAr: 'إجازة مرضية', nameEn: 'Sick Leave' },
    { category: 'leave_type', nameAr: 'إجازة طارئة', nameEn: 'Emergency Leave' },
    { category: 'incident_type', nameAr: 'حادث طريق', nameEn: 'Road Accident' },
    { category: 'incident_type', nameAr: 'حالة طبية', nameEn: 'Medical Case' },
    { category: 'incident_type', nameAr: 'عطل مركبة', nameEn: 'Vehicle Breakdown' },
    { category: 'penalty_type', nameAr: 'إنذار', nameEn: 'Warning' },
    { category: 'penalty_type', nameAr: 'خصم مالي', nameEn: 'Financial Deduction' },
    { category: 'penalty_type', nameAr: 'إيقاف مؤقت', nameEn: 'Temporary Suspension' },
    { category: 'reward_type', nameAr: 'مكافأة أداء', nameEn: 'Performance Bonus' },
    { category: 'reward_type', nameAr: 'مكافأة التزام', nameEn: 'Compliance Reward' },
    { category: 'maintenance_type', nameAr: 'صيانة دورية', nameEn: 'Regular Maintenance' },
    { category: 'maintenance_type', nameAr: 'إصلاح طارئ', nameEn: 'Emergency Repair' },
  ];

  for (let i = 0; i < masterData.length; i++) {
    await prisma.masterDataType.upsert({
      where: { id: i + 1 },
      update: {},
      create: { ...masterData[i], sortOrder: i },
    });
  }
  console.log('Master data created');

  // Create System Settings
  const settings = [
    { key: 'max_shift_hours', value: '12', description: 'Maximum shift duration in hours', group: 'shifts' },
    { key: 'document_expiry_alert_days', value: '30', description: 'Days before expiry to alert', group: 'documents' },
    { key: 'max_fuel_logs_per_day', value: '5', description: 'Maximum fuel logs per day per driver', group: 'fuel' },
    { key: 'annual_leave_days', value: '30', description: 'Default annual leave days', group: 'leaves' },
    { key: 'company_name_ar', value: 'شركة النقل المتقدمة', description: 'Company name in Arabic', group: 'general' },
    { key: 'company_name_en', value: 'Advanced Asset Management System', description: 'Company name in English', group: 'general' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({ where: { key: setting.key }, update: {}, create: setting });
  }
  console.log('System settings created');

  // Create Notification Templates
  const templates = [
    { key: 'shift_approved', titleAr: 'تم قبول الشفت', titleEn: 'Shift Approved', bodyAr: 'تم قبول طلب الشفت الخاص بك', bodyEn: 'Your shift request has been approved', category: 'SHIFT' },
    { key: 'shift_rejected', titleAr: 'تم رفض الشفت', titleEn: 'Shift Rejected', bodyAr: 'تم رفض طلب الشفت الخاص بك', bodyEn: 'Your shift request has been rejected', category: 'SHIFT' },
    { key: 'document_expiring', titleAr: 'مستند قارب على الانتهاء', titleEn: 'Document Expiring Soon', bodyAr: 'أحد مستنداتك يقترب من تاريخ الانتهاء', bodyEn: 'One of your documents is nearing expiry', category: 'DOCUMENT' },
    { key: 'investigation_opened', titleAr: 'تحقيق جديد', titleEn: 'New Investigation', bodyAr: 'تم فتح تحقيق بشأنك', bodyEn: 'An investigation has been opened regarding you', category: 'COMPLIANCE' },
    { key: 'leave_approved', titleAr: 'تم قبول الإجازة', titleEn: 'Leave Approved', bodyAr: 'تم قبول طلب الإجازة الخاص بك', bodyEn: 'Your leave request has been approved', category: 'HR' },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({ where: { key: template.key }, update: {}, create: template });
  }
  console.log('Notification templates created');

  console.log('Seeding completed successfully!');
  console.log('---');
  console.log('Admin login: identityNumber=1000000001, password=admin123');
  console.log('Driver login: identityNumber=3000000001, password=driver123');
  console.log('Tip: set SEED_RESET=true to wipe demo transactional rows for demo drivers before reseeding.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
