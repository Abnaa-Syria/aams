const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  applyUserOwnedListScope,
  applyMidShiftListScope,
  mergeDriverNameIntoUserWhere,
} = require('../src/utils/listScope');

describe('listScope', () => {
  it('scopes DRIVER to own userId', () => {
    const where = applyUserOwnedListScope({ status: 'PENDING' }, {
      user: { role: null, appRole: 'DRIVER', id: 42 },
      query: {},
    });
    assert.equal(where.userId, 42);
    assert.equal(where.status, 'PENDING');
  });

  it('allows ADMIN to filter by query userId', () => {
    const where = applyUserOwnedListScope({}, {
      user: { role: 'OPERATIONS_ADMIN', id: 1 },
      query: { userId: '7' },
    });
    assert.equal(where.userId, 7);
  });

  it('SUPERVISOR uses nested user filter', () => {
    const where = applyUserOwnedListScope({ a: 1 }, {
      user: { role: null, appRole: 'SUPERVISOR', id: 3, appUserId: 30 },
      query: {},
    });
    assert.equal(where.a, 1);
    assert.deepEqual(where.user, { appUser: { supervisorId: 30, appRole: 'DRIVER' } });
  });

  it('ADMIN can filter by appUserId', () => {
    const where = applyUserOwnedListScope({}, {
      user: { role: 'OPERATIONS_ADMIN', id: 1 },
      query: { appUserId: '77' },
    });
    assert.deepEqual(where.user, { appUser: { id: 77 } });
  });

  it('SUPERVISOR keeps team scope when filtering by appUserId', () => {
    const where = applyUserOwnedListScope({}, {
      user: { role: null, appRole: 'SUPERVISOR', id: 3, appUserId: 30 },
      query: { appUserId: '77' },
    });
    assert.deepEqual(where.user, { appUser: { supervisorId: 30, appRole: 'DRIVER', id: 77 } });
  });

  it('mid-shift DRIVER scopes via shift.userId', () => {
    const where = applyMidShiftListScope({}, {
      user: { role: null, appRole: 'DRIVER', id: 9 },
      query: {},
    });
    assert.deepEqual(where.shift, { userId: 9 });
  });

  it('merges driver name filter with existing user scope', () => {
    const where = mergeDriverNameIntoUserWhere(
      { status: 'PENDING', user: { appUser: { supervisorId: 3, appRole: 'DRIVER' } } },
      { driverName: 'Ali' },
    );

    assert.equal(where.status, 'PENDING');
    assert.equal(where.user.appUser.supervisorId, 3);
    assert.equal(where.user.appUser.appRole, 'DRIVER');
    assert.deepEqual(where.user.OR, [
      { fullNameAr: { contains: 'Ali' } },
      { fullNameEn: { contains: 'Ali' } },
    ]);
  });
});
