const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/config/database');
const recordAccessPath = require.resolve('../src/utils/recordAccess');
const { AuthorizationError } = require('../src/utils/errors');

function loadWithMockDb(mockPrisma) {
  // Ensure recordAccess re-imports with mocked db module
  delete require.cache[recordAccessPath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mockPrisma };
  // eslint-disable-next-line global-require
  return require('../src/utils/recordAccess');
}

describe('recordAccess.assertCanAccessDriverRecord', () => {
  beforeEach(() => {
    delete require.cache[recordAccessPath];
    delete require.cache[dbPath];
  });

  it('allows admins without querying database', async () => {
    let called = false;
    const { assertCanAccessDriverRecord } = loadWithMockDb({
      user: {
        findFirst: async () => {
          called = true;
          return null;
        },
      },
    });

    await assertCanAccessDriverRecord({ user: { role: 'OPERATIONS_ADMIN', id: 1 } }, 999);
    assert.equal(called, false);
  });

  it('allows driver to access own record', async () => {
    const { assertCanAccessDriverRecord } = loadWithMockDb({ user: { findFirst: async () => null } });
    await assertCanAccessDriverRecord({ user: { role: null, appRole: 'DRIVER', id: 5 } }, 5);
  });

  it('denies driver accessing other driver record', async () => {
    const { assertCanAccessDriverRecord } = loadWithMockDb({ user: { findFirst: async () => null } });
    await assert.rejects(
      () => assertCanAccessDriverRecord({ user: { role: null, appRole: 'DRIVER', id: 5 } }, 6),
      (err) => {
        assert.ok(err instanceof AuthorizationError);
        return true;
      },
    );
  });

  it('allows supervisor to access assigned driver record', async () => {
    const { assertCanAccessDriverRecord } = loadWithMockDb({
      user: {
        findFirst: async ({ where }) => {
          assert.deepEqual(where, { id: 10, appUser: { supervisorId: 2, appRole: 'DRIVER' }, deletedAt: null });
          return { id: 10 };
        },
      },
    });
    await assertCanAccessDriverRecord({ user: { role: null, appRole: 'SUPERVISOR', id: 20, appUserId: 2 } }, 10);
  });

  it('denies supervisor to access non-assigned driver record', async () => {
    const { assertCanAccessDriverRecord } = loadWithMockDb({
      user: { findFirst: async () => null },
    });
    await assert.rejects(
      () => assertCanAccessDriverRecord({ user: { role: null, appRole: 'SUPERVISOR', id: 20, appUserId: 2 } }, 10),
      (err) => err instanceof AuthorizationError,
    );
  });
});

