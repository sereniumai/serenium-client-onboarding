import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AuthGuard } from './auth/AuthGuard';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { OnboardingDashboard } from './pages/client/OnboardingDashboard';
import { ModulePage } from './pages/client/ModulePage';
import { ReportsPage } from './pages/client/ReportsPage';
import { AdminHome } from './pages/admin/AdminHome';
import { NewClientWizard } from './pages/admin/NewClientWizard';
import { ClientDetail } from './pages/admin/ClientDetail';
import { VideosManager } from './pages/admin/VideosManager';
import { WelcomeVideoManager } from './pages/admin/WelcomeVideoManager';
import { NotFoundPage } from './pages/NotFoundPage';
import { Toaster } from './components/Toaster';
import { CommandPalette } from './components/CommandPalette';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { db } from './lib/mockDb';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  const orgs = db.listOrganizationsForUser(user.id);
  if (orgs[0]) return <Navigate to={`/onboarding/${orgs[0].slug}`} replace />;
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ImpersonationBanner />
        <CommandPalette />
        <Toaster />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/onboarding/:orgSlug" element={
            <AuthGuard><OnboardingDashboard /></AuthGuard>
          } />
          <Route path="/onboarding/:orgSlug/reports" element={
            <AuthGuard><ReportsPage /></AuthGuard>
          } />
          <Route path="/onboarding/:orgSlug/services/:serviceKey/:moduleKey" element={
            <AuthGuard><ModulePage /></AuthGuard>
          } />

          <Route path="/admin" element={<AuthGuard requireRole="admin"><AdminHome /></AuthGuard>} />
          <Route path="/admin/clients/new" element={<AuthGuard requireRole="admin"><NewClientWizard /></AuthGuard>} />
          <Route path="/admin/clients/:orgSlug" element={<AuthGuard requireRole="admin"><ClientDetail /></AuthGuard>} />
          <Route path="/admin/videos" element={<AuthGuard requireRole="admin"><VideosManager /></AuthGuard>} />
          <Route path="/admin/welcome-video" element={<AuthGuard requireRole="admin"><WelcomeVideoManager /></AuthGuard>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
