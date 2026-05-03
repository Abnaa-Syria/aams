const prisma = require('../config/database');
const { NotFoundError } = require('./errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy, buildSearchFilter } = require('./pagination');
const { logAudit } = require('./auditLogger');
const ApiResponse = require('./response');

/**
 * Creates standard CRUD service methods for a Prisma model.
 * Used to reduce boilerplate across modules.
 */
function createCrudService(modelName, options = {}) {
  const {
    searchFields = [],
    sortFields = ['createdAt'],
    defaultSelect = undefined,
    defaultInclude = undefined,
    softDelete = false,
    auditEntity = modelName,
  } = options;

  const model = prisma[modelName];

  return {
    async list(query, extraWhere = {}) {
      const { page, limit, skip } = getPaginationParams(query);
      const orderBy = buildOrderBy(query, sortFields);
      const searchFilter = buildSearchFilter(query, searchFields);

      const where = {
        ...searchFilter,
        ...extraWhere,
        ...(softDelete && { deletedAt: null }),
      };

      const findArgs = { where, skip, take: limit, orderBy };
      if (defaultSelect) findArgs.select = defaultSelect;
      if (defaultInclude) findArgs.include = defaultInclude;

      const [items, total] = await Promise.all([
        model.findMany(findArgs),
        model.count({ where }),
      ]);

      return { items, meta: buildPaginationMeta(total, page, limit) };
    },

    async getById(id, include = defaultInclude) {
      const findArgs = { where: { id: parseInt(id), ...(softDelete && { deletedAt: null }) } };
      if (include) findArgs.include = include;
      if (defaultSelect && !include) findArgs.select = defaultSelect;

      const item = await model.findFirst(findArgs);
      if (!item) throw new NotFoundError(auditEntity);
      return item;
    },

    async create(data) {
      return model.create({ data });
    },

    async update(id, data, adminUser = null) {
      const existing = await model.findFirst({
        where: { id: parseInt(id), ...(softDelete && { deletedAt: null }) },
      });
      if (!existing) throw new NotFoundError(auditEntity);

      const updated = await model.update({ where: { id: parseInt(id) }, data });

      if (adminUser) {
        await logAudit({
          userId: adminUser.id,
          action: `UPDATE_${auditEntity.toUpperCase()}`,
          entity: auditEntity,
          entityId: String(id),
          oldValue: existing,
          newValue: updated,
        });
      }

      return updated;
    },

    async remove(id, adminUser = null) {
      const existing = await model.findFirst({
        where: { id: parseInt(id), ...(softDelete && { deletedAt: null }) },
      });
      if (!existing) throw new NotFoundError(auditEntity);

      if (softDelete) {
        await model.update({ where: { id: parseInt(id) }, data: { deletedAt: new Date() } });
      } else {
        await model.delete({ where: { id: parseInt(id) } });
      }

      if (adminUser) {
        await logAudit({
          userId: adminUser.id,
          action: `DELETE_${auditEntity.toUpperCase()}`,
          entity: auditEntity,
          entityId: String(id),
        });
      }
    },

    async updateStatus(id, statusField, statusValue, adminUser = null) {
      const existing = await model.findFirst({
        where: { id: parseInt(id), ...(softDelete && { deletedAt: null }) },
      });
      if (!existing) throw new NotFoundError(auditEntity);

      const updated = await model.update({
        where: { id: parseInt(id) },
        data: { [statusField]: statusValue },
      });

      if (adminUser) {
        await logAudit({
          userId: adminUser.id,
          action: `STATUS_CHANGE_${auditEntity.toUpperCase()}`,
          entity: auditEntity,
          entityId: String(id),
          oldValue: { [statusField]: existing[statusField] },
          newValue: { [statusField]: statusValue },
        });
      }

      return updated;
    },
  };
}

function createCrudController(service, entityName) {
  return {
    async list(req, res, next) {
      try {
        const { items, meta } = await service.list(req.query);
        return ApiResponse.paginated(res, items, meta);
      } catch (err) { next(err); }
    },
    async getById(req, res, next) {
      try {
        const item = await service.getById(req.params.id);
        return ApiResponse.success(res, item);
      } catch (err) { next(err); }
    },
    async create(req, res, next) {
      try {
        const item = await service.create(req.body);
        return ApiResponse.created(res, item, `${entityName} created`);
      } catch (err) { next(err); }
    },
    async update(req, res, next) {
      try {
        const item = await service.update(req.params.id, req.body, req.user);
        return ApiResponse.success(res, item, `${entityName} updated`);
      } catch (err) { next(err); }
    },
    async remove(req, res, next) {
      try {
        await service.remove(req.params.id, req.user);
        return ApiResponse.success(res, null, `${entityName} deleted`);
      } catch (err) { next(err); }
    },
  };
}

module.exports = { createCrudService, createCrudController };
