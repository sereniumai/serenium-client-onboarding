import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Eye, ChevronLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useOrgBySlug } from '../hooks/useOrgs';

/**
 * Shown when an admin is viewing a client's portal via ?impersonate=1.
 * The admin keeps their own session (so actions are still attributed to them),
 * this banner just signals context and offers a fast way back.
 *
 * Legacy export kept for older callsites that imported registerImpersonation.
 */
export function registerImpersonation(_adminUserId: string) { /* no-op */ }

export function ImpersonationBanner() {
  const { user } = useAuth();
  const { orgSlug } = useParams();
  const [params] = useSearchParams();
  const { data: org } = useOrgBySlug(orgSlug);

  if (!user || user.role !== 'admin') return null;
  if (params.get('impersonate') !== '1') return null;

  return (
    <div className="bg-orange text-white px-4 py-2.5 flex items-center gap-3 text-sm shadow-lg">
      <Eye className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">
          Admin view · {org?.businessName ?? 'Loading…'}
        </p>
        <p className="text-xs text-white/80 truncate">You're seeing the client's portal. Any actions you take are attributed to your admin account.</p>
      </div>
      {orgSlug && (
        <Link
          to={`/admin/clients/${orgSlug}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-xs font-semibold shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to admin
        </Link>
      )}
    </div>
  );
}
