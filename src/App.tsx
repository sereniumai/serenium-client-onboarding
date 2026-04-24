import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AuthGuard } from './auth/AuthGuard';
import { Toaster } from './components/Toaster';
import { CommandPalette } from './components/CommandPalette';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { RouteLoader } from './components/RouteLoader';
import { useOrgsForUser } from './hooks/useOrgs';

// Auth pages, small, but loaded once and thrown away after sign-in.
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// Client-facing portal, admins never need this, and clients never need admin code.
const OnboardingDashboard = lazy(() => import('./pages/client/OnboardingDashboard').then(m => ({ default: m.OnboardingDashboard })));
const ModulePage = lazy(() => import('./pages/client/ModulePage').then(m => ({ default: m.ModulePage })));
const ServicePage = lazy(() => import('./pages/client/ServicePage').then(m => ({ default: m.ServicePage })));
const ReportsPage = lazy(() => import('./pages/client/ReportsPage').then(m => ({ default: m.ReportsPage })));

// Admin, the biggest chunk, kept out of the client bundle entirely.
const AdminHome = lazy(() => import('./pages/admin/AdminHome').then(m => ({ default: m.AdminHome })));
const NewClientWizard = lazy(() => import('./pages/admin/NewClientWizard').then(m => ({ default: m.NewClientWizard })));
const ClientDetail = lazy(() => import('./pages/admin/ClientDetail').then(m => ({ default: m.ClientDetail })));
const VideosManager = lazy(() => import('./pages/admin/VideosManager').then(m => ({ default: m.VideosManager })));
const WelcomeVideoManager = lazy(() => import('./pages/admin/WelcomeVideoManager').then(m => ({ default: m.WelcomeVideoManager })));
const FollowupSettingsPage = lazy(() => import('./pages/admin/FollowupSettingsPage').then(m => ({ default: m.FollowupSettingsPage })));
const AiConversationsPage = lazy(() => import('./pages/admin/AiConversationsPage').then(m => ({ default: m.AiConversationsPage })));
const ChangelogPage = lazy(() => import('./pages/admin/ChangelogPage').then(m => ({ default: m.ChangelogPage })));
const DiagnosticsPage = lazy(() => import('./pages/admin/DiagnosticsPage').then(m => ({ default: m.DiagnosticsPage })));
const AccountPage = lazy(() => import('./pages/account/AccountPage').then(m => ({ default: m.AccountPage })));

const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function RootRedirect() {
  const { user, loading } = useAuth();
  const { data: orgs, isLoading: orgsLoading } = useOrgsForUser(
    user && user.role === 'client' ? user.id : undefined,
  );
  if (loading || (user?.role === 'client' && orgsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-white/50">
          <div className="h-8 w-8 rounded-full border-2 border-orange border-t-transparent animate-spin" />
          <p className="text-xs uppercase tracking-wider">Getting you in…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (orgs && orgs[0]) return <Navigate to={`/onboarding/${orgs[0].slug}`} replace />;
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ImpersonationBanner />
        <CommandPalette />
        <Toaster />
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            <Route path="/onboarding/:orgSlug" element={
              <AuthGuard><OnboardingDashboard /></AuthGuard>
            } />
            <Route path="/onboarding/:orgSlug/reports" element={
              <AuthGuard><ReportsPage /></AuthGuard>
            } />
            <Route path="/onboarding/:orgSlug/services/:serviceKey" element={
              <AuthGuard><ServicePage /></AuthGuard>
            } />
            <Route path="/onboarding/:orgSlug/services/:serviceKey/:moduleKey" element={
              <AuthGuard><ModulePage /></AuthGuard>
            } />

            <Route path="/admin" element={<AuthGuard requireRole="admin"><AdminHome /></AuthGuard>} />
            <Route path="/admin/clients/new" element={<AuthGuard requireRole="admin"><NewClientWizard /></AuthGuard>} />
            <Route path="/admin/clients/:orgSlug" element={<AuthGuard requireRole="admin"><ClientDetail /></AuthGuard>} />
            <Route path="/admin/videos" element={<AuthGuard requireRole="admin"><VideosManager /></AuthGuard>} />
            <Route path="/admin/welcome-video" element={<AuthGuard requireRole="admin"><WelcomeVideoManager /></AuthGuard>} />
            <Route path="/admin/settings/followups" element={<AuthGuard requireRole="admin"><FollowupSettingsPage /></AuthGuard>} />
            <Route path="/admin/ai-conversations" element={<AuthGuard requireRole="admin"><AiConversationsPage /></AuthGuard>} />
            <Route path="/admin/whats-new" element={<AuthGuard requireRole="admin"><ChangelogPage /></AuthGuard>} />
            <Route path="/admin/diagnostics" element={<AuthGuard requireRole="admin"><DiagnosticsPage /></AuthGuard>} />
            <Route path="/account" element={<AuthGuard><AccountPage /></AuthGuard>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
