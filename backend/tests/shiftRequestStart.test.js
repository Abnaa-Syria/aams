const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseRequestStartPayload } = require('../src/modules/shifts/controller');
const ShiftService = require('../src/modules/shifts/service');
const { BusinessLogicError } = require('../src/utils/errors');

describe('shift request-start payload', () => {
  it('parses multipart form fields and uploaded files', () => {
    const payload = parseRequestStartPayload({
      body: {
        vehicleId: '5',
        platformAccountId: '1',
        startOdometer: '125',
        requestedStartTime: '2026-06-03 14:26',
        requestedEndTime: '2026-06-04 14:26',
        notes: 'بدايه الشفت',
      },
      files: {
        startPhoto: [{ path: 'uploads/demo/start.jpg' }],
        startOdometerPhoto: [{ path: 'uploads/demo/odo.jpg' }],
      },
    });

    assert.equal(payload.vehicleId, 5);
    assert.equal(payload.platformAccountId, 1);
    assert.equal(payload.startOdometer, 125);
    assert.match(payload.startPhotoUrl, /uploads\/demo\/start\.jpg/);
    assert.match(payload.startOdometerPhotoUrl, /uploads\/demo\/odo\.jpg/);
  });

  it('parses mobile datetime strings', () => {
    const start = ShiftService.parseShiftDateTime('2026-06-03 14:26');
    const end = ShiftService.parseShiftDateTime('2026-06-04 14:26');
    assert.ok(end > start);
  });

  it('documents invalid end-before-start window', () => {
    const start = ShiftService.parseShiftDateTime('2026-06-03 14:26');
    const end = ShiftService.parseShiftDateTime('2026-06-02 14:26');
    assert.ok(end <= start);
    const err = new BusinessLogicError('requestedEndTime must be after requestedStartTime');
    assert.equal(err.statusCode, 422);
  });
});
