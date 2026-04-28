import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ChevronLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useOrgBySlug } from '../hooks/useOrgs';
import { useImpersonation } from '../hooks/useImpersonation';
import { stopImpersonation } from '../lib/impersonation';
import { supabase } from '../lib/supabase';

/** Legacy export retained so older callsites compile. */
export function registerImpersonation(_adminUserId: string) { /* no-op */ }

export function ImpersonationBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { orgSlug, active: impersonating } = useImpersonation();
  const { data: org } = useOrgBySlug(impersonating ? orgSlug ?? undefined : undefined);
  const loggedFor = useRef<string | null>(null);

  const isAdminImpersonating = !!(user && user.role === 'admin' && impersonating);

  // Log the impersonation session to the audit table, once per (admin, org)
  // banner mount. Best-effort, any failure is silent, this is compliance
  // logging not application logic.
  useEffect(() => {
    if (!isAdminImpersonating || !user || !org) return;
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
  }, [isAdminImpersonating, user, org]);

  if (!user || user.role !== 'admin') return null;
  if (!impersonating) return null;

  const exit = () => {
    const slug = orgSlug;
    stopImpersonation();
    if (slug) navigate(`/admin/clients/${slug}`);
    else navigate('/admin');
  };

  return (
    <div className="sticky top-0 z-30 bg-orange text-white border-b border-orange-hover shadow-lg">
      <div className="px-4 py-2 flex items-center gap-3 text-sm">
        <Eye className="h-4 w-4 shrink-0" />
        <p className="flex-1 min-w-0 font-semibold truncate">
          Admin view{org ? ` · ${org.businessName}` : ''}
        </p>
        <button
          type="button"
          onClick={exit}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Back to admin</span><span className="sm:hidden">Back</span>
        </button>
      </div>
    </div>
  );
}
