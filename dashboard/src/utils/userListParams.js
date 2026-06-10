/** Query params for user/supervisor/admin list endpoints (soft-delete aware). */
export function buildUserListParams(params) {
  const next = { ...params };
  if (next.accountStatus === 'ARCHIVED' || next.deletedOnly === 'true') {
    next.deletedOnly = 'true';
  }
  return Object.fromEntries(
    Object.entries(next).filter(([, v]) => v !== '' && v != null),
  );
}
