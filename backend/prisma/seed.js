const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

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
  // Phase 5 Additions Clean up
  await prisma.assetAssignment.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.locationHistory.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.complaint.deleteMany({ where: { OR: [{ filedById: { in: demoUserIds } }, { subjectId: { in: demoUserIds } }] } });
  await prisma.adminRequest.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.breakRequest.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.canceledOrderLog.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.vehicleSwapRequest.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.substituteVehicleAssignment.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.licenseTest.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.trainee.deleteMany({ where: { OR: [{ traineeId: { in: demoUserIds } }, { trainerId: { in: demoUserIds } }] } });
  await prisma.scheduledReminder.deleteMany({ where: { OR: [{ targetUserId: { in: demoUserIds } }, { createdById: { in: demoUserIds } }] } });

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

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileIfMissing(absPath, buf) {
  if (fs.existsSync(absPath)) return;
  ensureDirSync(path.dirname(absPath));
  fs.writeFileSync(absPath, buf);
}

function ensureDemoUploadFiles() {
  const backendRoot = path.resolve(__dirname, '..');
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const demoDir = path.join(backendRoot, uploadDir, 'demo');

  // Tiny valid PDF (single page) — good enough for preview/download demos
  const pdfBytes = Buffer.from(
    `%PDF-1.4\n` +
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n` +
    `4 0 obj\n<< /Length 93 >>\nstream\nBT\n/F1 24 Tf\n72 720 Td\n(Seed demo PDF attachment) Tj\nET\nendstream\nendobj\n` +
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n` +
    `xref\n0 6\n0000000000 65535 f \n` +
    `0000000009 00000 n \n` +
    `0000000058 00000 n \n` +
    `0000000115 00000 n \n` +
    `0000000271 00000 n \n` +
    `0000000414 00000 n \n` +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n` +
    `484\n%%EOF\n`,
    'utf8'
  );

  // 1x1 PNG (transparent)
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X7n3cAAAAASUVORK5CYII=',
    'base64'
  );

  // 1x1 JPEG (white)
  const jpg1x1 = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAAaABoBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC0A//Z',
    'base64'
  );

  // 1x1 WebP (lossy)
  const webp1x1 = Buffer.from(
    'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==',
    'base64'
  );

  // PDFs referenced by seed data
  writeFileIfMissing(path.join(demoDir, 'iqama.pdf'), pdfBytes);
  writeFileIfMissing(path.join(demoDir, 'contract.pdf'), pdfBytes);
  writeFileIfMissing(path.join(demoDir, 'license.pdf'), pdfBytes);
  writeFileIfMissing(path.join(demoDir, 'iban.pdf'), pdfBytes);
  writeFileIfMissing(path.join(demoDir, 'leave.pdf'), pdfBytes);

  // Images referenced by seed data
  writeFileIfMissing(path.join(demoDir, 'shift_start.jpg'), jpg1x1);
  writeFileIfMissing(path.join(demoDir, 'receipt.jpg'), jpg1x1);
  writeFileIfMissing(path.join(demoDir, 'incident.jpg'), jpg1x1);
  writeFileIfMissing(path.join(demoDir, 'maint.jpg'), jpg1x1);
  writeFileIfMissing(path.join(demoDir, 'report.png'), png1x1);
  writeFileIfMissing(path.join(demoDir, 'midshift.webp'), webp1x1);

  console.log(`Demo upload files ensured at: ${demoDir}`);
}

async function main() {
  console.log('Seeding database...');
  ensureDemoUploadFiles();

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

  // Create Assets
  const assets = [
    { type: 'MOTORCYCLE', nameAr: 'دراجة نارية 01', description: 'دراجة سوزوكي', isActive: true },
    { type: 'SAFETY_EQUIPMENT', nameAr: 'خوذة حماية', description: 'خوذة أمان معتمدة', isActive: true },
  ];
  for (const asset of assets) {
    await prisma.asset.create({ data: asset }).catch(() => {});
  }
  console.log('Assets created');

  // Create Zones
  await prisma.zone.create({
    data: {
      nameAr: 'المنطقة الحمراء',
      description: 'منطقة محظورة',
      boundary: { type: 'Polygon', coordinates: [[[46.6, 24.7], [46.7, 24.7], [46.7, 24.8], [46.6, 24.8], [46.6, 24.7]]] },
      isRestricted: true,
      isActive: true,
      alertMessage: 'تحذير: لقد دخلت منطقة محظورة'
    }
  }).catch(() => {});

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

    // --- Phase 5 user-specific data ---
    
    // 1. AssetAssignment
    const someAsset = await prisma.asset.findFirst();
    if (someAsset) {
      await prisma.assetAssignment.create({
        data: {
          assetId: someAsset.id,
          userId: driver.id,
          assignedBy: opsAdmin.id,
          notes: 'seed asset assignment'
        }
      }).catch(() => {});
    }

    // 2. LocationHistory
    await prisma.locationHistory.create({
      data: { userId: driver.id, latitude: 24.7136, longitude: 46.6753, speed: 60 }
    }).catch(() => {});

    // 3. Complaint
    await prisma.complaint.create({
      data: {
        type: 'EMPLOYEE_COMPLAINT',
        filedById: driver.id,
        subjectId: supervisor.id,
        title: 'تأخر الرواتب',
        details: 'يوجد تأخير في استلام الراتب',
        status: 'PENDING'
      }
    }).catch(() => {});

    // 4. AdminRequest
    await prisma.adminRequest.create({
      data: {
        userId: driver.id,
        type: 'OTHER',
        title: 'طلب خطاب تعريف',
        details: 'يرجى تزويدي بخطاب تعريف للبنك',
        status: 'PENDING'
      }
    }).catch(() => {});

    // 5. BreakRequest
    await prisma.breakRequest.create({
      data: {
        shiftId: active.id,
        userId: driver.id,
        reason: 'استراحة غداء',
        status: 'APPROVED',
        reviewedBy: opsAdmin.id,
        reviewedAt: new Date()
      }
    }).catch(() => {});

    // 6. VehicleSwapRequest
    await prisma.vehicleSwapRequest.create({
      data: {
        shiftId: active.id,
        userId: driver.id,
        currentVehicleId: vehicle.id,
        reason: 'صوت غريب في المحرك',
        status: 'PENDING'
      }
    }).catch(() => {});

    // 7. CanceledOrderLog
    await prisma.canceledOrderLog.create({
      data: {
        userId: driver.id,
        orderRef: 'ORD-999',
        reason: 'العميل لم يستجب',
        platformName: 'Keeta',
        discountAmount: 15.5,
        orderDate: daysFromNow(-1)
      }
    }).catch(() => {});

    // 8. OilChangeLog
    await prisma.oilChangeLog.create({
      data: {
        vehicleId: vehicle.id,
        odometerAtChange: 15000,
        nextDueOdometer: 20000,
        performedBy: opsAdmin.id,
        notes: 'تغيير زيت دوري'
      }
    }).catch(() => {});

    // 9. SubstituteVehicleAssignment
    if (i === 0 && vehicleRows.length > 1) {
      await prisma.substituteVehicleAssignment.create({
        data: {
          vehicleId: vehicleRows[1].id,
          originalVehicleId: vehicle.id,
          userId: driver.id,
          startDate: daysFromNow(-2),
          reason: 'صيانة دورية للمركبة الأساسية',
          assignedBy: opsAdmin.id
        }
      }).catch(() => {});
    }

    // 10. LicenseTest & Trainee
    if (i === 1) {
      await prisma.trainee.create({
        data: {
          traineeId: driver.id,
          trainerId: supervisor.id,
          startDate: daysFromNow(-30),
          isCompleted: true,
          completedAt: daysFromNow(-5),
          notes: 'اجتاز التدريب بنجاح'
        }
      }).catch(() => {});

      await prisma.licenseTest.create({
        data: {
          userId: driver.id,
          testDate: daysFromNow(-10),
          result: 'ADVANCED',
          scheduledBy: opsAdmin.id,
          resultSetBy: supervisor.id
        }
      }).catch(() => {});
    }

    // 11. ScheduledReminder
    await prisma.scheduledReminder.create({
      data: {
        targetUserId: driver.id,
        createdById: opsAdmin.id,
        title: 'تجديد الإقامة',
        body: 'يرجى تجديد الإقامة قبل الانتهاء',
        triggerDate: daysFromNow(10),
        category: 'HR'
      }
    }).catch(() => {});

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
    { key: 'shift_approved', titleAr: 'تم قبول الشفت', titleEn: 'Shift Approved', bodyAr: 'تم قبول طلب الشفت الخاص بك', bodyEn: 'Your shift request has been approved' },
    { key: 'shift_rejected', titleAr: 'تم رفض الشفت', titleEn: 'Shift Rejected', bodyAr: 'تم رفض طلب الشفت الخاص بك', bodyEn: 'Your shift request has been rejected' },
    { key: 'document_expiring', titleAr: 'مستند قارب على الانتهاء', titleEn: 'Document Expiring Soon', bodyAr: 'أحد مستنداتك يقترب من تاريخ الانتهاء', bodyEn: 'One of your documents is nearing expiry' },
    { key: 'investigation_opened', titleAr: 'تحقيق جديد', titleEn: 'New Investigation', bodyAr: 'تم فتح تحقيق بشأنك', bodyEn: 'An investigation has been opened regarding you' },
    { key: 'leave_approved', titleAr: 'تم قبول الإجازة', titleEn: 'Leave Approved', bodyAr: 'تم قبول طلب الإجازة الخاص بك', bodyEn: 'Your leave request has been approved' },
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
