import { useSelector } from 'react-redux';
import { hasAnyPermission } from '../../utils/rolePermissions';

/**
 * Renders children only if current user role has any of required permissions.
 * Use for action-level UI guards (buttons/modals), not routing.
 */
export default function PermissionGate({ anyOf = [], children, fallback = null }) {
  const user = useSelector((s) => s.auth.user);
  const ok = hasAnyPermission(user?.role, anyOf);
  return ok ? children : fallback;
}

