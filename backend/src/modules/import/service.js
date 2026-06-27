const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { parseSpreadsheetToRows } = require('../../utils/spreadsheetParse');
const { exportTemplate } = require('../../utils/xlsxWorkbook');
const { normalizeFormat } = require('../../utils/spreadsheetMime');
const { AuthorizationError, ValidationError, ConflictError } = require('../../utils/errors');
const { logAudit } = require('../../utils/auditLogger');
const {
  MODULE_META,
  DRIVER_EXAMPLE_IDENTITY,
  validateEnumField,
} = require('./metadata');

function columnsFromFields(fields) {
  return fields.map((f) => ({ key: f.key, label: f.label }));
}

function fieldMap(module) {
  const meta = MODULE_META[module];
  if (!meta) return {};
  return Object.fromEntries(meta.fields.map((f) => [f.key, f]));
}

function enrichColumns(module) {
  const tpl = IMPORT_TEMPLATES[module];
  const meta = MODULE_META[module];
  const byKey = Object.fromEntries((meta?.fields || []).map((f) => [f.key, f]));
  return tpl.columns.map((c) => ({
    ...c,
    labelAr: byKey[c.key]?.labelAr || c.label,
    allowedValues: byKey[c.key]?.allowedValues,
  }));
}

async function resolveCityId(cityNameAr) {
  const name = String(cityNameAr || '').trim();
  if (!name) return undefined;
  const city = await prisma.city.findFirst({
    where: { nameAr: name, isActive: true },
    select: { id: true },
  });
  if (!city) {
    throw new ValidationError(`الفرع «${name}» غير موجود — راجع ورقة «الفروع» في القالب`);
  }
  return city.id;
}

async function resolveSupervisorAppUserId(supervisorIdentity) {
  const idNum = String(supervisorIdentity || '').trim();
  if (!idNum) return undefined;
  const supervisorUser = await prisma.user.findFirst({
    where: { identityNumber: idNum, deletedAt: null },
    include: { appUser: { select: { id: true, appRole: true } } },
  });
  if (!supervisorUser?.appUser || supervisorUser.appUser.appRole !== 'SUPERVISOR') {
    throw new ValidationError(`المشرف برقم الهوية «${idNum}» غير موجود أو ليس مشرفاً`);
  }
  return supervisorUser.appUser.id;
}

function validateIdentityNumber(value, labelAr = 'رقم الهوية') {
  const id = String(value || '').trim();
  if (!/^\d{10}$/.test(id)) {
    throw new ValidationError(`${labelAr}: يجب أن يكون 10 أرقام`);
  }
  return id;
}

async function assertUniqueOnUpdate(field, value, userId, messageAr) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return trimmed || null;
  const existing = await prisma.user.findFirst({
    where: { [field]: trimmed, id: { not: userId }, deletedAt: null },
  });
  if (existing) throw new ConflictError(messageAr);
  return trimmed;
}

const IMPORT_TEMPLATES = {
  users: {
    get columns() {
      return columnsFromFields(MODULE_META.users.fields);
    },
    get required() {
      return MODULE_META.users.fields.filter((f) => f.required).map((f) => f.key);
    },
    async importRow(row, actorId) {
      const fields = fieldMap('users');
      const identityNumber = validateIdentityNumber(row.identityNumber);
      const fullNameAr = String(row.fullNameAr || '').trim();
      if (!fullNameAr) throw new ValidationError('الاسم بالعربي مطلوب');

      const employmentStatus = validateEnumField(row.employmentStatus, fields.employmentStatus);
      const transportType = validateEnumField(row.transportType, fields.transportType);
      const cityId = row.cityNameAr?.trim() ? await resolveCityId(row.cityNameAr) : undefined;
      const supervisorAppUserId = row.supervisorIdentityNumber?.trim()
        ? await resolveSupervisorAppUserId(row.supervisorIdentityNumber)
        : undefined;

      const existing = await prisma.user.findUnique({
        where: { identityNumber },
        include: { appUser: true },
      });

      if (existing?.deletedAt) {
        throw new ValidationError('السائق محذوف/مؤرشف — استرجعه من قائمة السائقين أولاً');
      }

      if (existing) {
        const mobileNumber = row.mobileNumber?.trim()
          ? await assertUniqueOnUpdate('mobileNumber', row.mobileNumber, existing.id, 'رقم الجوال مسجل لسائق آخر')
          : (row.mobileNumber === '' ? null : undefined);
        const email = row.email?.trim()
          ? await assertUniqueOnUpdate('email', row.email, existing.id, 'البريد الإلكتروني مسجل لسائق آخر')
          : (row.email === '' ? null : undefined);
        const employeeNumber = row.employeeNumber?.trim()
          ? await assertUniqueOnUpdate('employeeNumber', row.employeeNumber, existing.id, 'الرقم الوظيفي مسجل لسائق آخر')
          : (row.employeeNumber === '' ? null : undefined);

        await prisma.user.update({
          where: { id: existing.id },
          data: {
            fullNameAr,
            ...(row.fullNameEn !== undefined && { fullNameEn: row.fullNameEn?.trim() || null }),
            ...(mobileNumber !== undefined && { mobileNumber }),
            ...(email !== undefined && { email }),
            ...(employeeNumber !== undefined && { employeeNumber }),
            ...(cityId !== undefined && { cityId }),
            ...(supervisorAppUserId !== undefined && { supervisorId: (await prisma.appUser.findUnique({
              where: { id: supervisorAppUserId },
              select: { userId: true },
            }))?.userId }),
          },
        });

        if (existing.userType === 'APP_USER' && existing.appUser) {
          const appData = {};
          if (employmentStatus) appData.employmentStatus = employmentStatus;
          if (transportType) appData.transportType = transportType;
          if (row.sevenHundredNumber !== undefined) {
            appData.sevenHundredNumber = row.sevenHundredNumber?.trim() || null;
          }
          if (row.roomNumber !== undefined) {
            appData.roomNumber = row.roomNumber?.trim() || null;
          }
          if (supervisorAppUserId !== undefined) appData.supervisorId = supervisorAppUserId;
          if (Object.keys(appData).length) {
            await prisma.appUser.update({ where: { id: existing.appUser.id }, data: appData });
          }
        }
        return { action: 'updated', id: existing.id };
      }

      const mobileNumber = row.mobileNumber?.trim() || null;
      const email = row.email?.trim() || null;
      const employeeNumber = row.employeeNumber?.trim() || null;

      if (mobileNumber) {
        const dup = await prisma.user.findFirst({ where: { mobileNumber, deletedAt: null } });
        if (dup) throw new ConflictError('رقم الجوال مسجل لسائق آخر');
      }
      if (email) {
        const dup = await prisma.user.findFirst({ where: { email, deletedAt: null } });
        if (dup) throw new ConflictError('البريد الإلكتروني مسجل لسائق آخر');
      }
      if (employeeNumber) {
        const dup = await prisma.user.findUnique({ where: { employeeNumber } });
        if (dup) throw new ConflictError('الرقم الوظيفي مسجل لسائق آخر');
      }

      const passwordHash = await bcrypt.hash(row.password?.trim() || 'driver123', 12);
      let supervisorUserId = null;
      if (supervisorAppUserId) {
        const sup = await prisma.appUser.findUnique({
          where: { id: supervisorAppUserId },
          select: { userId: true },
        });
        supervisorUserId = sup?.userId ?? null;
      }

      const user = await prisma.user.create({
        data: {
          identityNumber,
          fullNameAr,
          fullNameEn: row.fullNameEn?.trim() || null,
          mobileNumber,
          email,
          employeeNumber,
          cityId: cityId ?? null,
          supervisorId: supervisorUserId,
          passwordHash,
          userType: 'APP_USER',
          accountStatus: 'ACTIVE',
          appUser: {
            create: {
              appRole: 'DRIVER',
              employmentStatus: employmentStatus || 'ON_DUTY',
              transportType: transportType || null,
              sevenHundredNumber: row.sevenHundredNumber?.trim() || null,
              roomNumber: row.roomNumber?.trim() || null,
              supervisorId: supervisorAppUserId ?? null,
            },
          },
        },
      });
      await logAudit({
        userId: actorId,
        action: 'IMPORT_USER',
        entity: 'User',
        entityId: String(user.id),
        newValue: { identityNumber },
      });
      return { action: 'created', id: user.id };
    },
  },
  vehicles: {
    get columns() {
      return columnsFromFields(MODULE_META.vehicles.fields);
    },
    get required() {
      return MODULE_META.vehicles.fields.filter((f) => f.required).map((f) => f.key);
    },
    async importRow(row, actorId) {
      const fields = fieldMap('vehicles');
      const plateNumber = String(row.plateNumber || '').trim();
      if (!plateNumber) throw new ValidationError('رقم اللوحة مطلوب');

      const status = validateEnumField(row.status, fields.status) || 'ACTIVE';

      const data = {
        plateNumber,
        manufacturer: row.manufacturer?.trim() || '—',
        model: row.model?.trim() || '—',
        year: row.year ? parseInt(row.year, 10) : new Date().getFullYear(),
        color: row.color?.trim() || null,
        status,
        odometerKm: row.odometerKm ? parseInt(row.odometerKm, 10) : 0,
      };

      const existing = await prisma.vehicle.findFirst({ where: { plateNumber, deletedAt: null } });
      if (existing) {
        await prisma.vehicle.update({ where: { id: existing.id }, data });
        return { action: 'updated', id: existing.id };
      }

      const vehicle = await prisma.vehicle.create({ data });
      await logAudit({
        userId: actorId,
        action: 'IMPORT_VEHICLE',
        entity: 'Vehicle',
        entityId: String(vehicle.id),
        newValue: { plateNumber },
      });
      return { action: 'created', id: vehicle.id };
    },
  },
};

class ImportService {
  static supportedModules() {
    return Object.keys(IMPORT_TEMPLATES);
  }

  static meta(module) {
    const tpl = MODULE_META[module];
    if (!tpl) throw new AuthorizationError(`Import module not supported: ${module}`);
    return {
      module,
      ...tpl,
      templateFilename: tpl.templateFilename || `${module}-import-template.xlsx`,
      acceptedFormats: ['xlsx', 'csv'],
    };
  }

  static async template(module, format = 'xlsx') {
    const meta = MODULE_META[module];
    if (!IMPORT_TEMPLATES[module]) throw new AuthorizationError(`Import module not supported: ${module}`);

    return exportTemplate({
      columns: enrichColumns(module),
      format: normalizeFormat(format),
      filename: (meta.templateFilename || `${module}-import-template`).replace(/\.xlsx$/i, ''),
      guideFields: meta?.fields,
      minimal: true,
    });
  }

  static isSkippableExampleRow(module, row) {
    if (module !== 'users') return false;
    const id = String(row.identityNumber || '').trim();
    return id === DRIVER_EXAMPLE_IDENTITY || id.toUpperCase() === 'EXAMPLE';
  }

  static async importFile(module, fileBuffer, actorId, filename = '') {
    const tpl = IMPORT_TEMPLATES[module];
    if (!tpl) throw new AuthorizationError(`Import module not supported: ${module}`);

    const fields = MODULE_META[module]?.fields || [];
    const rows = await parseSpreadsheetToRows(fileBuffer, filename, { fields });
    if (!rows.length) throw new ValidationError('الملف فارغ أو غير صالح');

    const results = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i += 1) {
      const sheetRow = rows[i]._sheetRow || (i + 4);
      const row = { ...rows[i] };
      delete row._sheetRow;
      try {
        if (ImportService.isSkippableExampleRow(module, row)) {
          results.skipped += 1;
          continue;
        }
        const missing = tpl.required.filter((k) => !row[k]?.trim());
        if (missing.length) {
          const labels = missing.map((k) => fieldMap(module)[k]?.labelAr || k);
          throw new ValidationError(`حقول ناقصة: ${labels.join('، ')}`);
        }
        const outcome = await tpl.importRow(row, actorId);
        if (outcome.action === 'created') results.created += 1;
        else results.updated += 1;
      } catch (err) {
        results.failed += 1;
        const msg = err.message || 'فشل الاستيراد';
        results.errors.push({ row: sheetRow, message: msg });
      }
    }

    if (!results.created && !results.updated && results.failed) {
      throw new ValidationError(results.errors[0]?.message || 'فشل استيراد جميع الصفوف');
    }

    return results;
  }

  /** @deprecated use importFile */
  static async importCsv(module, fileBuffer, actorId, filename) {
    return ImportService.importFile(module, fileBuffer, actorId, filename);
  }
}

module.exports = ImportService;
