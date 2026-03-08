import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InvoiceFormPage from './pages/InvoiceFormPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import UserEditPage from './pages/UserEditPage.jsx';
import { useAuth } from './hooks/useAuth.js';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading session...</p>
      </div>
    );
  }

  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoice/new"
          element={
            <ProtectedRoute>
              <InvoiceFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoice/:invoiceId/edit"
          element={
            <ProtectedRoute>
              <InvoiceFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users/:userId/edit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserEditPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  );
}

export default App;
