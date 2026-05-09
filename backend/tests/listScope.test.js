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
      user: { role: 'DRIVER', id: 42 },
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
      user: { role: 'SUPERVISOR', id: 3 },
      query: {},
    });
    assert.equal(where.a, 1);
    assert.deepEqual(where.user, { supervisorId: 3, role: 'DRIVER' });
  });

  it('mid-shift DRIVER scopes via shift.userId', () => {
    const where = applyMidShiftListScope({}, {
      user: { role: 'DRIVER', id: 9 },
      query: {},
    });
    assert.deepEqual(where.shift, { userId: 9 });
  });

  it('merges driver name filter with existing user scope', () => {
    const where = mergeDriverNameIntoUserWhere(
      { status: 'PENDING', user: { supervisorId: 3, role: 'DRIVER' } },
      { driverName: 'Ali' },
    );

    assert.equal(where.status, 'PENDING');
    assert.equal(where.user.supervisorId, 3);
    assert.equal(where.user.role, 'DRIVER');
    assert.deepEqual(where.user.OR, [
      { fullNameAr: { contains: 'Ali' } },
      { fullNameEn: { contains: 'Ali' } },
    ]);
  });
});
