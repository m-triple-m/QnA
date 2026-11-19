import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== 'admin') return <Navigate to="/unauthorized" replace />;
  return children;
}
