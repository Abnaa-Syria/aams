const ShiftService = require('./service');
const ApiResponse = require('../../utils/response');
const { ValidationError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

const SHIFT_START_UPLOAD_FIELDS = [
  { name: 'startPhoto', maxCount: 1 },
  { name: 'startPhotoUrl', maxCount: 1 },
  { name: 'startVehiclePhoto', maxCount: 1 },
  { name: 'startVehiclePhotoUrl', maxCount: 1 },
  { name: 'startAppPhoto', maxCount: 1 },
  { name: 'startAppPhotoUrl', maxCount: 1 },
  { name: 'startOdometerPhoto', maxCount: 1 },
  { name: 'startOdometerPhotoUrl', maxCount: 1 },
];

function isPlaceholderFileValue(value) {
  return typeof value === 'string' && /^File\(/i.test(value.trim());
}

function pickUploadedOrBodyUrl(files, fieldNames, body) {
  for (const name of fieldNames) {
    const uploaded = files?.[name]?.[0];
    if (uploaded?.path) return normalizeStoredUploadPath(uploaded.path);

    const raw = body?.[name];
    if (raw && typeof raw === 'string' && !isPlaceholderFileValue(raw)) {
      return raw.trim();
    }
  }
  return undefined;
}

function parsePositiveIntField(body, fieldName, aliases = []) {
  const keys = [fieldName, ...aliases];
  for (const key of keys) {
    const raw = body?.[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const parsed = parseInt(String(raw), 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function parseRequestStartPayload(req) {
  const body = req.body || {};
  const files = req.files || {};

  const vehicleId = parsePositiveIntField(body, 'vehicleId', ['vehicle_id']);
  const platformAccountId = parsePositiveIntField(body, 'platformAccountId', [
    'platform_account_id',
    'platformAccount',
    'accountId',
  ]);
  const startOdometer = parsePositiveIntField(body, 'startOdometer', ['start_odometer', 'odometer']);

  if (!vehicleId) throw new ValidationError('vehicleId is required');
  if (!platformAccountId) throw new ValidationError('platformAccountId is required');
  if (startOdometer === null) throw new ValidationError('startOdometer is required');

  const payload = {
    vehicleId,
    platformAccountId,
    startOdometer,
    notes: body.notes || undefined,
    requestedStartTime: body.requestedStartTime || undefined,
    requestedEndTime: body.requestedEndTime || undefined,
    startPhotoUrl: pickUploadedOrBodyUrl(files, ['startPhoto', 'startPhotoUrl'], body),
    startVehiclePhotoUrl: pickUploadedOrBodyUrl(files, ['startVehiclePhoto', 'startVehiclePhotoUrl'], body),
    startAppPhotoUrl: pickUploadedOrBodyUrl(files, ['startAppPhoto', 'startAppPhotoUrl'], body),
    startOdometerPhotoUrl: pickUploadedOrBodyUrl(files, ['startOdometerPhoto', 'startOdometerPhotoUrl'], body),
  };

  return payload;
}

class ShiftController {
  static async list(req, res, next) {
    try {
      const { items, meta } = await ShiftService.list(req.query, req.user);
      return ApiResponse.paginated(res, items, meta);
    } catch (err) { next(err); }
  }
  static async getById(req, res, next) {
    try {
      const item = await ShiftService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) { next(err); }
  }
  static async requestStart(req, res, next) {
    try {
      const payload = parseRequestStartPayload(req);
      const shift = await ShiftService.requestStart(req.user.id, payload);
      return ApiResponse.created(res, shift, 'Shift start requested');
    } catch (err) { next(err); }
  }
  static async approve(req, res, next) {
    try {
      const shift = await ShiftService.approve(req.params.id, req.user);
      return ApiResponse.success(res, shift, 'Shift approved');
    } catch (err) { next(err); }
  }
  static async reject(req, res, next) {
    try {
      const shift = await ShiftService.reject(req.params.id, req.body?.reason, req.user);
      return ApiResponse.success(res, shift, 'Shift rejected');
    } catch (err) { next(err); }
  }
  static async approveClosure(req, res, next) {
    try {
      const shift = await ShiftService.approveClosure(req.params.id, req.user);
      return ApiResponse.success(res, shift, 'Shift closure approved');
    } catch (err) { next(err); }
  }
  static async forceEnd(req, res, next) {
    try {
      const shift = await ShiftService.forceEnd(req.params.id, req.user, req.body?.reason);
      return ApiResponse.success(res, shift, 'Shift force ended');
    } catch (err) { next(err); }
  }
  static async startShift(req, res, next) {
    try {
      const shift = await ShiftService.startShift(req.params.id, req.user.id);
      return ApiResponse.success(res, shift, 'Shift started');
    } catch (err) { next(err); }
  }
  static async endShift(req, res, next) {
    try {
      const shift = await ShiftService.endShift(req.params.id, req.user.id, req.body || {});
      return ApiResponse.success(res, shift, 'Shift ended');
    } catch (err) { next(err); }
  }
  static async cancel(req, res, next) {
    try {
      const shift = await ShiftService.cancel(req.params.id, req.body?.reason, req.user);
      return ApiResponse.success(res, shift, 'Shift cancelled');
    } catch (err) { next(err); }
  }
  static async updateStatus(req, res, next) {
    try {
      const shift = await ShiftService.updateStatus(req.params.id, req.body?.status, req.body?.reason, req.user);
      return ApiResponse.success(res, shift, 'Shift status updated');
    } catch (err) { next(err); }
  }
  static async update(req, res, next) {
    try {
      const shift = await ShiftService.updateNotes(req.params.id, req.body || {}, req.user);
      return ApiResponse.success(res, shift, 'Shift updated');
    } catch (err) { next(err); }
  }
}

module.exports = ShiftController;
module.exports.SHIFT_START_UPLOAD_FIELDS = SHIFT_START_UPLOAD_FIELDS;
module.exports.parseRequestStartPayload = parseRequestStartPayload;
