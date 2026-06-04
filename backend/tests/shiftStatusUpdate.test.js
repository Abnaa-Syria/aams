const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/config/database');
const shiftServicePath = require.resolve('../src/modules/shifts/service');

function loadWithMockDb(mockPrisma) {
  delete require.cache[shiftServicePath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mockPrisma };
  return require('../src/modules/shifts/service');
}

describe('Shift status update routing', () => {
  beforeEach(() => {
    delete require.cache[shiftServicePath];
    delete require.cache[dbPath];
  });

  it('routes to approve when setting APPROVED', async () => {
    let updateCalled = false;
    let logCreated = false;
    const ShiftService = loadWithMockDb({
      shift: {
        findUnique: async () => ({ id: 21, status: 'REQUESTED', userId: 12 }),
        update: async ({ data }) => {
          assert.equal(data.status, 'APPROVED');
          updateCalled = true;
          return { id: 21, status: 'APPROVED' };
        },
      },
      shiftLog: {
        create: async () => {
          logCreated = true;
          return {};
        },
      },
      user: {
        update: async () => ({}),
      },
      appUser: {
        updateMany: async () => ({}),
      },
      auditLog: {
        create: async () => ({}),
      },
    });

    const result = await ShiftService.updateStatus(21, 'APPROVED', null, { id: 1 });
    assert.equal(result.status, 'APPROVED');
    assert.ok(updateCalled);
    assert.ok(logCreated);
  });

  it('routes to reject when setting REJECTED', async () => {
    let updateCalled = false;
    const ShiftService = loadWithMockDb({
      shift: {
        findUnique: async () => ({ id: 21, status: 'REQUESTED', userId: 12 }),
        update: async ({ data }) => {
          assert.equal(data.status, 'REJECTED');
          assert.equal(data.rejectionReason, 'not needed');
          updateCalled = true;
          return { id: 21, status: 'REJECTED' };
        },
      },
      shiftLog: {
        create: async () => ({}),
      },
    });

    const result = await ShiftService.updateStatus(21, 'REJECTED', 'not needed', { id: 1 });
    assert.equal(result.status, 'REJECTED');
    assert.ok(updateCalled);
  });

  it('routes to startShift when setting ACTIVE', async () => {
    let updateCalled = false;
    const ShiftService = loadWithMockDb({
      shift: {
        findUnique: async () => ({ id: 21, status: 'APPROVED', userId: 12 }),
        findFirst: async () => null,
        update: async ({ data }) => {
          assert.equal(data.status, 'ACTIVE');
          updateCalled = true;
          return { id: 21, status: 'ACTIVE' };
        },
      },
      shiftLog: {
        create: async () => ({}),
      },
    });

    const result = await ShiftService.updateStatus(21, 'ACTIVE', null, { id: 1 });
    assert.equal(result.status, 'ACTIVE');
    assert.ok(updateCalled);
  });

  it('routes to endShift bypassing daily report check when setting ENDED', async () => {
    let updateCalled = false;
    const ShiftService = loadWithMockDb({
      shift: {
        findUnique: async () => ({ id: 21, status: 'ACTIVE', userId: 12, startOdometer: 100 }),
        update: async ({ data }) => {
          assert.equal(data.status, 'ENDED');
          updateCalled = true;
          return { id: 21, status: 'ENDED' };
        },
      },
      shiftLog: {
        create: async () => ({}),
      },
      user: {
        update: async () => ({}),
      },
      appUser: {
        updateMany: async () => ({}),
      },
      vehicleOdometerLog: {
        create: async () => ({}),
      },
      vehicle: {
        update: async () => ({}),
      },
    });

    // If bypass check failed, it would query dailyReport count and error because dailyReport is undefined in mock.
    // So this test implicitly checks bypassReportCheck is true.
    const result = await ShiftService.updateStatus(21, 'ENDED', 'ended', { id: 1 });
    assert.equal(result.status, 'ENDED');
    assert.ok(updateCalled);
  });

  it('routes to cancel when setting CANCELLED', async () => {
    let updateCalled = false;
    const ShiftService = loadWithMockDb({
      shift: {
        findUnique: async () => ({ id: 21, status: 'APPROVED', userId: 12 }),
        update: async ({ data }) => {
          assert.equal(data.status, 'CANCELLED');
          assert.equal(data.cancellationReason, 'cancel reason');
          updateCalled = true;
          return { id: 21, status: 'CANCELLED' };
        },
      },
      shiftLog: {
        create: async () => ({}),
      },
    });

    const result = await ShiftService.updateStatus(21, 'CANCELLED', 'cancel reason', { id: 1 });
    assert.equal(result.status, 'CANCELLED');
    assert.ok(updateCalled);
  });
});
