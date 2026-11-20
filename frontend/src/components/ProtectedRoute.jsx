import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  const userRole = user.role || user.user?.role;
  if (role && userRole !== role && userRole !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
