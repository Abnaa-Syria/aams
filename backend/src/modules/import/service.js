const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { parseCsv, rowsToCsv } = require('../../utils/csvParser');
const { AuthorizationError, ValidationError } = require('../../utils/errors');
const { logAudit } = require('../../utils/auditLogger');

const IMPORT_TEMPLATES = {
  users: {
    columns: [
      { key: 'identityNumber', label: 'identityNumber' },
      { key: 'fullNameAr', label: 'fullNameAr' },
      { key: 'fullNameEn', label: 'fullNameEn' },
      { key: 'mobileNumber', label: 'mobileNumber' },
      { key: 'email', label: 'email' },
      { key: 'employeeNumber', label: 'employeeNumber' },
      { key: 'password', label: 'password' },
      { key: 'employmentStatus', label: 'employmentStatus' },
      { key: 'transportType', label: 'transportType' },
    ],
    required: ['identityNumber', 'fullNameAr'],
    async importRow(row, actorId) {
      const identityNumber = String(row.identityNumber || '').trim();
      const fullNameAr = String(row.fullNameAr || '').trim();
      if (!identityNumber || !fullNameAr) throw new ValidationError('identityNumber and fullNameAr required');

      const passwordHash = await bcrypt.hash(row.password?.trim() || 'driver123', 12);
      const existing = await prisma.user.findUnique({ where: { identityNumber } });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            fullNameAr,
            fullNameEn: row.fullNameEn?.trim() || null,
            mobileNumber: row.mobileNumber?.trim() || null,
            email: row.email?.trim() || null,
            employeeNumber: row.employeeNumber?.trim() || undefined,
          },
        });
        if (existing.userType === 'APP_USER' && (row.employmentStatus || row.transportType)) {
          await prisma.appUser.updateMany({
            where: { userId: existing.id },
            data: {
              ...(row.employmentStatus && { employmentStatus: row.employmentStatus }),
              ...(row.transportType && { transportType: row.transportType }),
            },
          });
        }
        return { action: 'updated', id: existing.id };
      }

      const user = await prisma.user.create({
        data: {
          identityNumber,
          fullNameAr,
          fullNameEn: row.fullNameEn?.trim() || null,
          mobileNumber: row.mobileNumber?.trim() || null,
          email: row.email?.trim() || null,
          employeeNumber: row.employeeNumber?.trim() || null,
          passwordHash,
          userType: 'APP_USER',
          accountStatus: 'ACTIVE',
          appUser: {
            create: {
              appRole: 'DRIVER',
              employmentStatus: row.employmentStatus?.trim() || 'ON_DUTY',
              transportType: row.transportType?.trim() || null,
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
    columns: [
      { key: 'plateNumber', label: 'plateNumber' },
      { key: 'manufacturer', label: 'manufacturer' },
      { key: 'model', label: 'model' },
      { key: 'year', label: 'year' },
      { key: 'color', label: 'color' },
      { key: 'status', label: 'status' },
      { key: 'odometerKm', label: 'odometerKm' },
    ],
    required: ['plateNumber'],
    async importRow(row, actorId) {
      const plateNumber = String(row.plateNumber || '').trim();
      if (!plateNumber) throw new ValidationError('plateNumber is required');

      const data = {
        plateNumber,
        manufacturer: row.manufacturer?.trim() || '—',
        model: row.model?.trim() || '—',
        year: row.year ? parseInt(row.year, 10) : new Date().getFullYear(),
        color: row.color?.trim() || null,
        status: row.status?.trim() || 'AVAILABLE',
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

  static template(module) {
    const tpl = IMPORT_TEMPLATES[module];
    if (!tpl) throw new AuthorizationError(`Import module not supported: ${module}`);
    return {
      csv: rowsToCsv([], tpl.columns),
      filename: `${module}-import-template.csv`,
      required: tpl.required,
    };
  }

  static async importCsv(module, fileBuffer, actorId) {
    const tpl = IMPORT_TEMPLATES[module];
    if (!tpl) throw new AuthorizationError(`Import module not supported: ${module}`);

    const text = fileBuffer.toString('utf8');
    const rows = parseCsv(text);
    if (!rows.length) throw new ValidationError('CSV file is empty or invalid');

    const results = { created: 0, updated: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const missing = tpl.required.filter((k) => !rows[i][k]?.trim());
        if (missing.length) throw new ValidationError(`Missing: ${missing.join(', ')}`);
        const outcome = await tpl.importRow(rows[i], actorId);
        if (outcome.action === 'created') results.created += 1;
        else results.updated += 1;
      } catch (err) {
        results.failed += 1;
        results.errors.push({ row: i + 2, message: err.message || 'Import failed' });
      }
    }

    return results;
  }
}

module.exports = ImportService;
