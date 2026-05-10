import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasAnyPermission } from '../utils/rolePermissions';

export default function PermissionRoute({ anyOf = [], requiredRole = null, children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    if (user?.role !== requiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
    return children;
  }

  if (anyOf.length > 0) {
    const ok = hasAnyPermission(user?.role, anyOf);
    if (!ok) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
