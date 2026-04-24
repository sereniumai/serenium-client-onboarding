import { useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Eye, ChevronLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useOrgBySlug } from '../hooks/useOrgs';
import { supabase } from '../lib/supabase';

/** Legacy export retained so older callsites compile. */
export function registerImpersonation(_adminUserId: string) { /* no-op */ }

export function ImpersonationBanner() {
  const { user } = useAuth();
  const { orgSlug } = useParams();
  const [params] = useSearchParams();
  const { data: org } = useOrgBySlug(orgSlug);
  const loggedFor = useRef<string | null>(null);

  const active = !!(user && user.role === 'admin' && params.get('impersonate') === '1' && org);

  // Log the impersonation session to the audit table, once per (admin, org)
  // banner mount. Best-effort, any failure is silent, this is compliance
  // logging not application logic.
  useEffect(() => {
    if (!active || !user || !org) return;
    const key = `${user.id}:${org.id}`;
    if (loggedFor.current === key) return;
    loggedFor.current = key;
    supabase.from('admin_impersonation_audit').insert({
      admin_id: user.id,
      organization_id: org.id,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
    }).then(({ error }) => {
      if (error) console.warn('[impersonation-audit] insert failed', error);
    });
  }, [active, user, org]);

  if (!user || user.role !== 'admin') return null;
  if (params.get('impersonate') !== '1') return null;

  return (
    <div className="sticky top-0 z-20 bg-orange text-white border-b border-orange-hover shadow-lg">
      <div className="px-4 py-2 flex items-center gap-3 text-sm">
        <Eye className="h-4 w-4 shrink-0" />
        <p className="flex-1 min-w-0 font-semibold truncate">
          Admin view{org ? ` · ${org.businessName}` : ''}
        </p>
        {orgSlug && (
          <Link
            to={`/admin/clients/${orgSlug}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to admin
          </Link>
        )}
      </div>
    </div>
  );
}
