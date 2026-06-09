import { useSelector } from 'react-redux';
import { hasAnyPermissionForUser } from '../../utils/rolePermissions';

/**
 * Renders children only if current user has any of required permissions.
 */
export default function PermissionGate({ anyOf = [], children, fallback = null }) {
  const user = useSelector((s) => s.auth.user);
  const ok = hasAnyPermissionForUser(user, anyOf);
  return ok ? children : fallback;
}
