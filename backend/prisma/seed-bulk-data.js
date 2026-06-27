/**
 * Bulk demo data — extends prisma/seed.js without removing existing seeds.
 * Operational daily reports, financial ledgers, extra drivers/vehicles, tickets.
 */

function dateAtMidnight(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function seededPick(seed, items) {
  if (!items.length) return null;
  const x = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
  return items[Math.floor((x - Math.floor(x)) * items.length)];
}

function seededInt(seed, min, max) {
  const x = Math.abs(Math.sin(seed * 78.233) * 43758.5453);
  return min + Math.floor((x - Math.floor(x)) * (max - min + 1));
}

const EXTRA_DRIVER_SPECS = [
  { identityNumber: '3000000006', fullNameAr: 'يوسف الغامدي', fullNameEn: 'Yousef Al-Ghamdi', cityId: 2, employeeNumber: 'DRV006' },
  { identityNumber: '3000000007', fullNameAr: 'عمر الزهراني', fullNameEn: 'Omar Al-Zahrani', cityId: 2, employeeNumber: 'DRV007' },
  { identityNumber: '3000000008', fullNameAr: 'ماجد الحربي', fullNameEn: 'Majed Al-Harbi', cityId: 2, employeeNumber: 'DRV008' },
  { identityNumber: '3000000009', fullNameAr: 'تركي البلوي', fullNameEn: 'Turki Al-Balawi', cityId: 2, employeeNumber: 'DRV009' },
  { identityNumber: '3000000010', fullNameAr: 'سلمان الجهني', fullNameEn: 'Salman Al-Juhani', cityId: 2, employeeNumber: 'DRV010' },
  { identityNumber: '3000000011', fullNameAr: 'رائد السلمي', fullNameEn: 'Raed Al-Sulami', cityId: 2, employeeNumber: 'DRV011' },
  { identityNumber: '3000000012', fullNameAr: 'بندر العتيبي', fullNameEn: 'Bandar Al-Otaibi', cityId: 2, employeeNumber: 'DRV012' },
  { identityNumber: '3000000013', fullNameAr: 'فيصل المالكي', fullNameEn: 'Faisal Al-Malki', cityId: 2, employeeNumber: 'DRV013' },
  { identityNumber: '3000000014', fullNameAr: 'ناصر القرني', fullNameEn: 'Nasser Al-Qarni', cityId: 2, employeeNumber: 'DRV014' },
  { identityNumber: '3000000015', fullNameAr: 'حسن الشريف', fullNameEn: 'Hassan Al-Shareef', cityId: 2, employeeNumber: 'DRV015' },
  { identityNumber: '3000000016', fullNameAr: 'إبراهيم الطائفي', fullNameEn: 'Ibrahim Al-Taifi', cityId: 7, employeeNumber: 'DRV016' },
  { identityNumber: '3000000017', fullNameAr: 'وليد الثقفي', fullNameEn: 'Waleed Al-Thaqafi', cityId: 7, employeeNumber: 'DRV017' },
  { identityNumber: '3000000018', fullNameAr: 'عادل الهاشمي', fullNameEn: 'Adel Al-Hashimi', cityId: 7, employeeNumber: 'DRV018' },
  { identityNumber: '3000000019', fullNameAr: 'زياد العسيري', fullNameEn: 'Ziyad Al-Asiri', cityId: 7, employeeNumber: 'DRV019' },
  { identityNumber: '3000000020', fullNameAr: 'منصور الحازمي', fullNameEn: 'Mansour Al-Hazmi', cityId: 7, employeeNumber: 'DRV020' },
  { identityNumber: '3000000021', fullNameAr: 'هاني المطيري', fullNameEn: 'Hani Al-Mutairi', cityId: 7, employeeNumber: 'DRV021' },
  { identityNumber: '3000000022', fullNameAr: 'سامي الخثعمي', fullNameEn: 'Sami Al-Khathami', cityId: 7, employeeNumber: 'DRV022' },
  { identityNumber: '3000000023', fullNameAr: 'عبدالرحمن السبيعي', fullNameEn: 'Abdulrahman Al-Subaie', cityId: 7, employeeNumber: 'DRV023' },
  { identityNumber: '3000000024', fullNameAr: 'مشعل الربيعان', fullNameEn: 'Mishaal Al-Rabian', cityId: 1, employeeNumber: 'DRV024' },
  { identityNumber: '3000000025', fullNameAr: 'صالح الدخيل', fullNameEn: 'Saleh Al-Dakhil', cityId: 1, employeeNumber: 'DRV025' },
  { identityNumber: '3000000026', fullNameAr: 'جاسم العنزي', fullNameEn: 'Jasem Al-Anazi', cityId: 1, employeeNumber: 'DRV026' },
  { identityNumber: '3000000027', fullNameAr: 'فارس المري', fullNameEn: 'Fares Al-Marri', cityId: 1, employeeNumber: 'DRV027' },
  { identityNumber: '3000000028', fullNameAr: 'ثامر الشمري', fullNameEn: 'Thamer Al-Shammari', cityId: 1, employeeNumber: 'DRV028' },
  { identityNumber: '3000000029', fullNameAr: 'عبدالمجيد الحكمي', fullNameEn: 'Abdulmajid Al-Hakami', cityId: 1, employeeNumber: 'DRV029' },
  { identityNumber: '3000000030', fullNameAr: 'نواف العمري', fullNameEn: 'Nawaf Al-Omari', cityId: 1, employeeNumber: 'DRV030' },
  { identityNumber: '3000000031', fullNameAr: 'خالد البيشي', fullNameEn: 'Khalid Al-Bishi', cityId: 2, employeeNumber: 'DRV031' },
  { identityNumber: '3000000032', fullNameAr: 'أمجد السهلي', fullNameEn: 'Amjad Al-Sahli', cityId: 7, employeeNumber: 'DRV032' },
  { identityNumber: '3000000033', fullNameAr: 'معاذ الفيفي', fullNameEn: 'Moath Al-Fifi', cityId: 2, employeeNumber: 'DRV033' },
  { identityNumber: '3000000034', fullNameAr: 'راشد العمودي', fullNameEn: 'Rashed Al-Amoudi', cityId: 7, employeeNumber: 'DRV034' },
  { identityNumber: '3000000035', fullNameAr: 'طلال الحازمي', fullNameEn: 'Talal Al-Hazmi', cityId: 1, employeeNumber: 'DRV035' },
];

const EXTRA_VEHICLES = [
  { plateNumber: 'JED-1001', manufacturer: 'Toyota', model: 'Yaris', year: 2022, color: 'أبيض' },
  { plateNumber: 'JED-1002', manufacturer: 'Hyundai', model: 'Accent', year: 2023, color: 'فضي' },
  { plateNumber: 'JED-1003', manufacturer: 'Kia', model: 'Pegas', year: 2024, color: 'رمادي' },
  { plateNumber: 'JED-1004', manufacturer: 'Nissan', model: 'Sunny', year: 2021, color: 'أزرق' },
  { plateNumber: 'JED-1005', manufacturer: 'Toyota', model: 'Corolla', year: 2023, color: 'أسود' },
  { plateNumber: 'TIF-2001', manufacturer: 'Suzuki', model: 'Dzire', year: 2022, color: 'أبيض' },
  { plateNumber: 'TIF-2002', manufacturer: 'Hyundai', model: 'Elantra', year: 2023, color: 'فضي' },
  { plateNumber: 'TIF-2003', manufacturer: 'Toyota', model: 'Yaris', year: 2024, color: 'أحمر' },
  { plateNumber: 'TIF-2004', manufacturer: 'Kia', model: 'Cerato', year: 2022, color: 'أبيض' },
  { plateNumber: 'RUH-3001', manufacturer: 'Toyota', model: 'Camry', year: 2023, color: 'أسود' },
  { plateNumber: 'RUH-3002', manufacturer: 'Hyundai', model: 'Sonata', year: 2022, color: 'فضي' },
  { plateNumber: 'RUH-3003', manufacturer: 'Mazda', model: '3', year: 2024, color: 'أبيض' },
  { plateNumber: 'JED-1006', manufacturer: 'Isuzu', model: 'D-Max', year: 2021, color: 'أبيض' },
  { plateNumber: 'TIF-2005', manufacturer: 'Toyota', model: 'Hilux', year: 2023, color: 'فضي' },
  { plateNumber: 'RUH-3004', manufacturer: 'Nissan', model: 'Urvan', year: 2020, color: 'أبيض' },
];

const SIDE_CATEGORIES = [
  'MANAGEMENT',
  'OPERATIONS_DEPT',
  'MECHANICS',
  'BOX_MANUFACTURING',
  'EXTERNAL_WORK',
];

async function seedExtraDrivers(prisma, ctx) {
  const { driverPassword, supervisor, DEMO, daysFromNow } = ctx;
  for (let i = 0; i < EXTRA_DRIVER_SPECS.length; i += 1) {
    const spec = EXTRA_DRIVER_SPECS[i];
    const mobile = `0500${String(200 + i).padStart(5, '0')}`;
    await prisma.user.upsert({
      where: { identityNumber: spec.identityNumber },
      update: {
        cityId: spec.cityId,
        userType: 'APP_USER',
        role: null,
        supervisorId: supervisor.id,
        appUser: {
          upsert: {
            create: {
              appRole: 'DRIVER',
              supervisorId: supervisor.appUser.id,
              employmentStatus: i % 9 === 0 ? 'ON_LEAVE' : 'ON_DUTY',
              availabilityStatus: i % 5 === 0 ? 'OFF_DUTY' : 'AVAILABLE',
              transportType: i % 3 === 0 ? 'MOTORCYCLE' : 'CAR',
            },
            update: {
              appRole: 'DRIVER',
              supervisorId: supervisor.appUser.id,
            },
          },
        },
      },
      create: {
        identityNumber: spec.identityNumber,
        mobileNumber: mobile,
        fullNameAr: spec.fullNameAr,
        fullNameEn: spec.fullNameEn,
        employeeNumber: spec.employeeNumber,
        passwordHash: driverPassword,
        userType: 'APP_USER',
        role: null,
        accountStatus: i % 17 === 0 ? 'TEMPORARILY_SUSPENDED' : 'ACTIVE',
        supervisorId: supervisor.id,
        cityId: spec.cityId,
        gender: 'MALE',
        appUser: {
          create: {
            appRole: 'DRIVER',
            supervisorId: supervisor.appUser.id,
            employmentStatus: i % 9 === 0 ? 'ON_LEAVE' : 'ON_DUTY',
            availabilityStatus: i % 5 === 0 ? 'OFF_DUTY' : 'AVAILABLE',
            transportType: i % 3 === 0 ? 'MOTORCYCLE' : 'CAR',
          },
        },
      },
    });
  }
  console.log(`Extra drivers upserted: ${EXTRA_DRIVER_SPECS.length}`);
}

async function seedExtraVehicles(prisma, ctx) {
  const { DEMO } = ctx;
  for (const vehicle of EXTRA_VEHICLES) {
    await prisma.vehicle.upsert({
      where: { plateNumber: vehicle.plateNumber },
      update: { status: 'ACTIVE' },
      create: {
        ...vehicle,
        status: 'ACTIVE',
        ownershipStatus: 'COMPANY_OWNED',
        odometerKm: 20000 + EXTRA_VEHICLES.indexOf(vehicle) * 500,
        registrationFileUrl: DEMO.pdf.contract,
      },
    });
  }
  console.log(`Extra vehicles upserted: ${EXTRA_VEHICLES.length}`);
}

async function seedDriverFleetBasics(prisma, ctx) {
  const { supervisor, platformRows, DEMO, opsAdmin, daysFromNow } = ctx;
  const allDrivers = await prisma.user.findMany({
    where: {
      identityNumber: { startsWith: '30000000' },
      deletedAt: null,
    },
    select: { id: true, identityNumber: true, fullNameAr: true, cityId: true },
    orderBy: { identityNumber: 'asc' },
  });
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    select: { id: true, plateNumber: true },
    orderBy: { id: 'asc' },
  });

  for (let i = 0; i < allDrivers.length; i += 1) {
    const driver = allDrivers[i];
    const vehicle = vehicles[i % vehicles.length];
    const platform = platformRows[i % platformRows.length];

    const hasAssignment = await prisma.vehicleAssignment.findFirst({
      where: { userId: driver.id, isActive: true },
    });
    if (!hasAssignment && vehicle) {
      await prisma.vehicleAssignment.create({
        data: { userId: driver.id, vehicleId: vehicle.id, notes: 'bulk seed assignment' },
      }).catch(() => {});
    }

    const pAcc = await prisma.platformAccount.findFirst({
      where: { userId: driver.id, platformId: platform.id, deletedAt: null },
    });
    if (!pAcc) {
      await prisma.platformAccount.create({
        data: {
          userId: driver.id,
          platformId: platform.id,
          username: `drv_${driver.identityNumber}`,
          accountId: `ACCT-${driver.identityNumber}`,
          status: 'ACTIVE',
          fileUrl: DEMO.pdf.contract,
        },
      }).catch(() => {});
    }

    const docCount = await prisma.document.count({ where: { userId: driver.id } });
    if (docCount === 0) {
      await prisma.document.create({
        data: {
          userId: driver.id,
          type: 'IQAMA',
          title: 'إقامة',
          documentNumber: `IQ-${driver.identityNumber}`,
          issueDate: daysFromNow(-300),
          expiryDate: daysFromNow(30 + (i % 60)),
          status: i % 4 === 0 ? 'NEAR_EXPIRY' : 'VALID',
          fileUrl: DEMO.img.report,
          fileName: 'iqama.jpg',
        },
      }).catch(() => {});
    }

    const bankCount = await prisma.bankAccount.count({ where: { userId: driver.id } });
    if (bankCount === 0) {
      await prisma.bankAccount.create({
        data: {
          userId: driver.id,
          bankName: seededPick(i, ['البنك الأهلي', 'الراجحي', 'الإنماء']),
          iban: `SA${driver.identityNumber.slice(-10)}0000000000`,
          accountOwnerName: driver.fullNameAr,
          isDefault: true,
          verificationStatus: 'VERIFIED',
          proofFileUrl: DEMO.pdf.iban,
        },
      }).catch(() => {});
    }

    if (i >= 5) {
      const shiftCount = await prisma.shift.count({ where: { userId: driver.id } });
      if (shiftCount < 2 && vehicle) {
        const pa = await prisma.platformAccount.findFirst({
          where: { userId: driver.id, deletedAt: null },
        });
        if (pa) {
          const endedStart = daysFromNow(-(i % 5 + 1));
          endedStart.setHours(8, 0, 0, 0);
          const endedEnd = new Date(endedStart);
          endedEnd.setHours(17, 0, 0, 0);
          await prisma.shift.create({
            data: {
              userId: driver.id,
              vehicleId: vehicle.id,
              platformAccountId: pa.id,
              status: 'ENDED',
              startedAt: endedStart,
              endedAt: endedEnd,
              startOdometer: 10000 + i * 100,
              endOdometer: 10080 + i * 100,
              notes: 'bulk seed shift',
            },
          }).catch(() => {});
        }
      }
    }
  }
  console.log(`Fleet basics ensured for ${allDrivers.length} drivers`);
  return allDrivers;
}

async function seedBulkDailyReports(prisma, ctx) {
  const { platformRows, opsAdmin, daysFromNow } = ctx;
  const drivers = await prisma.user.findMany({
    where: { identityNumber: { startsWith: '30000000' }, deletedAt: null },
    select: { id: true },
  });

  for (let day = 0; day >= -21; day -= 1) {
    const reportDate = daysFromNow(day);
    reportDate.setHours(12, 0, 0, 0);
    for (let di = 0; di < drivers.length; di += 1) {
      const driver = drivers[di];
      const seed = day * 1000 + driver.id;
      if (seededInt(seed, 0, 3) !== 0) continue;

      const existing = await prisma.dailyReport.findFirst({
        where: { userId: driver.id, reportDate },
      });
      if (existing) continue;

      const shift = await prisma.shift.findFirst({
        where: { userId: driver.id },
        orderBy: { id: 'desc' },
      });
      const totalOrders = seededInt(seed, 8, 35);
      const report = await prisma.dailyReport.create({
        data: {
          userId: driver.id,
          shiftId: shift?.id ?? null,
          reportDate,
          totalHours: String(seededInt(seed, 6, 11)),
          totalOrders,
          status: day >= -3 ? 'APPROVED' : (day % 5 === 0 ? 'SUBMITTED' : 'APPROVED'),
          reviewedBy: day >= -3 ? opsAdmin.id : undefined,
          reviewedAt: day >= -3 ? new Date() : undefined,
          notes: 'تقرير يومي — بيانات تجريبية موسّعة',
        },
      }).catch(() => null);
      if (!report) continue;

      const breakdowns = platformRows.slice(0, 3).map((p, pi) => ({
        reportId: report.id,
        platformName: p.nameEn || p.nameAr,
        orders: Math.max(1, Math.floor(totalOrders / (pi + 2))),
        hours: String(2 + pi),
        earnings: String(50 + pi * 30),
      }));
      await prisma.reportAppBreakdown.createMany({ data: breakdowns }).catch(() => {});
    }
  }
  console.log('Bulk daily reports seeded (last 22 days)');
}

async function seedOperationalReports(prisma, ctx) {
  const { opsAdmin } = ctx;
  const drivers = await prisma.user.findMany({
    where: { identityNumber: { startsWith: '30000000' }, deletedAt: null },
    select: { id: true, cityId: true, fullNameAr: true },
    orderBy: { id: 'asc' },
  });
  const platforms = await prisma.platform.findMany({
    where: { isActive: true },
    select: { nameAr: true },
    orderBy: { id: 'asc' },
  });
  const platformNames = platforms.map((p) => p.nameAr);

  const cityConfigs = [
    { cityId: null },
    { cityId: 2 },
    { cityId: 7 },
  ];

  for (let day = 0; day >= -25; day -= 1) {
    const reportDate = dateAtMidnight(day);

    for (const cfg of cityConfigs) {
      const pool = cfg.cityId
        ? drivers.filter((d) => d.cityId === cfg.cityId)
        : drivers;
      if (pool.length < 3) continue;

      let report = await prisma.dailyOperationalReport.findFirst({
        where: { reportDate, cityId: cfg.cityId },
      });
      if (!report) {
        report = await prisma.dailyOperationalReport.create({
          data: {
            reportDate,
            cityId: cfg.cityId,
            status: day === 0 ? 'DRAFT' : (day % 7 === 0 ? 'FINALIZED' : 'DRAFT'),
            requiredOrdersManual: 448,
            achievedOrdersManual: null,
            summaryNotes: day === 0 ? 'ملخص تجريبي — بيانات موسّعة للعرض' : (day % 7 === 0 ? 'تقرير مغلق' : null),
            generatedBy: opsAdmin.id,
            ...(day % 7 === 0 && day !== 0
              ? { finalizedBy: opsAdmin.id, finalizedAt: new Date() }
              : {}),
          },
        });
      } else {
        report = await prisma.dailyOperationalReport.update({
          where: { id: report.id },
          data: {
            generatedBy: opsAdmin.id,
          },
        });
      }

      await prisma.operationalReportRow.deleteMany({ where: { reportId: report.id } });

      const rows = [];
      let sort = 0;
      let achieved = 0;

      pool.forEach((driver, idx) => {
        const seed = day * 997 + driver.id * 13 + idx;
        const bucket = seededInt(seed, 0, 99);
        let category;
        let notes = null;
        let platformOrders = null;

        if (bucket < 52) {
          category = 'DEPLOYED';
          platformOrders = {};
          let rowTotal = 0;
          platformNames.forEach((name, pi) => {
            const orders = seededInt(seed + pi, 0, 18);
            platformOrders[name] = orders;
            rowTotal += orders;
          });
          achieved += rowTotal;
          if (rowTotal === 0) notes = 'نازل بدون طلبات';
        } else if (bucket < 64) {
          category = 'ON_LEAVE';
          notes = seededPick(seed, ['إجازة سنوية', 'إجازة طارئة', 'إجازة شخصية']);
        } else if (bucket < 72) {
          category = 'SICK';
          notes = 'مرضي';
        } else if (bucket < 78) {
          category = 'ABSENT';
          notes = 'غياب بدون إذن';
        } else if (bucket < 86) {
          category = 'NOT_DEPLOYED';
          notes = 'على رأس العمل — لم ينزل';
        } else if (bucket < 90) {
          category = 'LICENSE_FOLLOWUP';
          notes = seededPick(seed, ['متابعة دلة', 'إعادة اختبار', 'تجديد رخصة']);
        } else {
          category = seededPick(seed, SIDE_CATEGORIES);
          notes = 'قسم جانبي — بيانات تجريبية';
        }

        rows.push({
          reportId: report.id,
          userId: driver.id,
          category,
          platformOrders,
          notes,
          sortOrder: sort++,
          isManual: bucket % 5 === 0,
        });
      });

      if (rows.length) {
        await prisma.operationalReportRow.createMany({ data: rows });
      }

      await prisma.dailyOperationalReport.update({
        where: { id: report.id },
        data: {
          achievedOrders: achieved,
          achievedOrdersManual: day % 3 === 0 ? achieved : null,
          requiredOrders: 448,
        },
      });
    }
  }
  console.log('Operational daily reports seeded (26 days × 3 branches)');
}

async function seedFinancialLedgers(prisma, ctx) {
  const { opsAdmin } = ctx;
  const drivers = await prisma.user.findMany({
    where: { identityNumber: { startsWith: '30000000' }, deletedAt: null },
    select: { id: true },
  });

  for (let day = 0; day >= -25; day -= 1) {
    const reportDate = dateAtMidnight(day);
    const ledger = await prisma.dailyFinancialLedger.upsert({
      where: { reportDate },
      create: {
        reportDate,
        status: day % 10 === 0 ? 'FINALIZED' : 'DRAFT',
        ...(day % 10 === 0 ? { finalizedBy: opsAdmin.id, finalizedAt: new Date() } : {}),
      },
      update: {},
    });

    await prisma.financialLedgerRow.deleteMany({ where: { ledgerId: ledger.id } });

    const rows = drivers
      .filter((_, i) => seededInt(day * 31 + i, 0, 2) > 0)
      .map((driver, i) => {
        const seed = day * 500 + driver.id;
        return {
          ledgerId: ledger.id,
          userId: driver.id,
          deductionsAmount: seededInt(seed, 0, 4) === 0 ? seededInt(seed, 50, 300) : null,
          deductionsNote: seededInt(seed, 0, 4) === 0 ? 'خصم تأخير' : null,
          violationsAmount: seededInt(seed + 1, 0, 5) === 0 ? seededInt(seed, 100, 500) : null,
          violationsNote: seededInt(seed + 1, 0, 5) === 0 ? 'مخالفة مرور' : null,
          trafficAmount: seededInt(seed + 2, 0, 6) === 0 ? seededInt(seed, 80, 400) : null,
          trafficNote: seededInt(seed + 2, 0, 6) === 0 ? 'مخالفة مرورية' : null,
          rewardsAmount: seededInt(seed + 3, 0, 7) === 0 ? seededInt(seed, 100, 500) : null,
          advancesAmount: seededInt(seed + 4, 0, 8) === 0 ? seededInt(seed, 200, 1000) : null,
          isManual: i % 4 === 0,
        };
      });

    if (rows.length) {
      await prisma.financialLedgerRow.createMany({ data: rows });
    }
  }
  console.log('Financial ledgers seeded (26 days)');
}

async function seedTicketsAndPermissions(prisma, ctx) {
  const { driverUsers, opsAdmin, supervisor } = ctx;
  const ticketSubjects = [
    { title: 'مشكلة في تطبيق المنصة', category: 'TECHNICAL', priority: 'HIGH' },
    { title: 'استفسار عن الراتب', category: 'FINANCIAL', priority: 'MEDIUM' },
    { title: 'طلب تحديث بيانات البنك', category: 'HR', priority: 'LOW' },
    { title: 'عطل في المركبة', category: 'FLEET', priority: 'HIGH' },
    { title: 'تأخر اعتماد الشفت', category: 'OTHER', priority: 'MEDIUM' },
  ];

  for (let i = 0; i < Math.min(driverUsers.length, 15); i += 1) {
    const driver = driverUsers[i];
    const subj = ticketSubjects[i % ticketSubjects.length];
    const existing = await prisma.ticket.findFirst({
      where: { userId: driver.id, title: subj.title },
    });
    if (existing) continue;

    const ticket = await prisma.ticket.create({
      data: {
        userId: driver.id,
        title: subj.title,
        description: `تذكرة دعم تجريبية — ${driver.fullNameAr}`,
        category: subj.category,
        priority: subj.priority,
        status: i % 3 === 0 ? 'OPEN' : (i % 3 === 1 ? 'IN_PROGRESS' : 'RESOLVED'),
        assignedToId: i % 2 === 0 ? opsAdmin.id : supervisor.id,
        lastReplyAt: new Date(),
      },
    });
    await prisma.ticketMessage.createMany({
      data: [
        { ticketId: ticket.id, senderId: driver.id, message: 'السلام عليكم، أحتاج مساعدة في هذا الموضوع.' },
        { ticketId: ticket.id, senderId: supervisor.id, message: 'وعليكم السلام، جاري المتابعة.' },
      ],
    }).catch(() => {});
  }

  for (let i = 0; i < Math.min(driverUsers.length, 12); i += 1) {
    const driver = driverUsers[i];
    const permDate = dateAtMidnight(i % 7);
    const exists = await prisma.permissionRequest.findFirst({
      where: { userId: driver.id, permissionDate: permDate },
    });
    if (exists) continue;
    await prisma.permissionRequest.create({
      data: {
        userId: driver.id,
        permissionDate: permDate,
        startTime: '10:00',
        endTime: '12:00',
        reason: 'استئذان — موعد شخصي',
        status: i % 4 === 0 ? 'PENDING' : 'APPROVED',
        reviewedBy: i % 4 !== 0 ? opsAdmin.id : undefined,
        reviewedAt: i % 4 !== 0 ? new Date() : undefined,
      },
    }).catch(() => {});
  }
  console.log('Tickets and permission requests seeded');
}

async function seedMoreAuditLogs(prisma, ctx) {
  const { superAdmin, opsAdmin, driverUsers } = ctx;
  const logs = [];
  for (let i = 0; i < 40; i += 1) {
    const actor = i % 3 === 0 ? superAdmin : opsAdmin;
    const driver = driverUsers[i % driverUsers.length];
    logs.push({
      userId: actor.id,
      action: seededPick(i, ['VIEW', 'UPDATE', 'APPROVE', 'EXPORT', 'IMPORT']),
      entity: seededPick(i, ['User', 'Shift', 'Vehicle', 'DailyReport', 'Violation']),
      entityId: String(driver?.id ?? i),
      ipAddress: '127.0.0.1',
      userAgent: 'seed-bulk',
      newValue: { note: `bulk audit ${i}` },
    });
  }
  await prisma.auditLog.createMany({ data: logs }).catch(() => {});
  console.log('Extra audit logs added');
}

async function seedBulkDemoData(prisma, ctx) {
  console.log('--- Bulk demo data extension ---');
  await seedExtraDrivers(prisma, ctx);
  await seedExtraVehicles(prisma, ctx);
  const allDrivers = await seedDriverFleetBasics(prisma, ctx);
  await seedBulkDailyReports(prisma, ctx);
  await seedOperationalReports(prisma, ctx);
  await seedFinancialLedgers(prisma, ctx);
  await seedTicketsAndPermissions(prisma, { ...ctx, driverUsers: allDrivers });
  await seedMoreAuditLogs(prisma, { ...ctx, driverUsers: allDrivers });
  console.log('--- Bulk demo data complete ---');
}

module.exports = { seedBulkDemoData, EXTRA_DRIVER_SPECS };
