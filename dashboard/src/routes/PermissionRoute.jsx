import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasAnyPermissionForUser } from '../utils/rolePermissions';

export default function PermissionRoute({ anyOf = [], requiredRole = null, children }) {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If we have a token but user data is still loading or not yet fetched, 
  // wait before deciding to redirect to unauthorized.
  if (isAuthenticated && !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (requiredRole) {
    if (user?.role !== requiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
    return children;
  }

  if (anyOf.length > 0) {
    // Check custom permissions first, then fallback to role-based permissions
    const ok = hasAnyPermissionForUser(user, anyOf);
      
    if (!ok) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
