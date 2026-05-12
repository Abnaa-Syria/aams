import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../services/api';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [checking, setChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validateAuth() {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        if (!cancelled) {
          setChecking(false);
          setIsValid(false);
        }
        return;
      }

      try {
        const { data } = await apiService.get('/auth/me');
        if (!cancelled) {
          setIsValid(true);
          setChecking(false);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setIsValid(false);
          setChecking(false);
        }
      }
    }

    if (isAuthenticated && !user) {
      validateAuth();
    } else {
      setIsValid(isAuthenticated);
      setChecking(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
