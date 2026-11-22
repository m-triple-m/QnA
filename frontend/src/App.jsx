import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import '@/lib/toast';
import AnimatedToastItem from '@/components/AnimatedToast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Spinner from '@/components/Spinner';

// Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import HostDashboard from '@/pages/host/HostDashboard';
import QuizListPage from '@/pages/host/QuizListPage';
import QuizBuilderPage from '@/pages/host/QuizBuilderPage';
import HostSessionPage from '@/pages/host/HostSessionPage';
import OpenQnAPage from '@/pages/host/OpenQnAPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import JoinPage from '@/pages/participant/JoinPage';
import PlayPage from '@/pages/participant/PlayPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role || user.user?.role;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/host" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Toaster
          position="top-right"
          gutter={10}
          toastOptions={{
            duration: 3000,
          }}
        >
          {(t) => <AnimatedToastItem toast={t} />}
        </Toaster>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Host routes */}
            <Route
              path="/host"
              element={
                <ProtectedRoute role="host">
                  <HostDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/quizzes"
              element={
                <ProtectedRoute role="host">
                  <QuizListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/quizzes/new"
              element={
                <ProtectedRoute role="host">
                  <QuizBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/quizzes/:id/edit"
              element={
                <ProtectedRoute role="host">
                  <QuizBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/session/:id"
              element={
                <ProtectedRoute role="host">
                  <HostSessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/sessions/:id"
              element={
                <ProtectedRoute role="host">
                  <HostSessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/open-qna"
              element={
                <ProtectedRoute role="host">
                  <OpenQnAPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/live-poll"
              element={
                <ProtectedRoute role="host">
                  <OpenQnAPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/sessions"
              element={
                <Navigate to="/host" replace />
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Participant routes */}
            <Route path="/join" element={<JoinPage />} />
            <Route path="/join/:code" element={<JoinPage />} />
            <Route path="/play/:sessionCode" element={<PlayPage />} />

            {/* 403 & Fallback */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
