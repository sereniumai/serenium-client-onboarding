import { useParams, Navigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { useOrgBySlug } from '../../hooks/useOrgs';

/**
 * Reports page is re-ported on top of Supabase monthly_reports in Phase 7.
 * Until then the page keeps its URL but renders a coming-soon placeholder so
 * client-side navigation doesn't crash.
 */
export function ReportsPage() {
  const { orgSlug } = useParams();
  const { data: org } = useOrgBySlug(orgSlug);
  if (!orgSlug) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <section className="relative mx-auto max-w-4xl px-6 pt-14 pb-14">
          <Link to={`/onboarding/${orgSlug}`} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="font-display font-black text-3xl mb-2">Monthly reports</h1>
          <p className="text-white/60">
            {org?.businessName ?? 'Your'} reports will appear here once onboarding is complete and your first report is published.
            Currently being re-ported on top of Supabase, back online in Phase 7 of the migration.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
