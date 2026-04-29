// ============================================================================
// Serenium, reset-client-data edge function
// ============================================================================
// Wipes all client-generated answers, progress, uploads and AI conversations
// for a single org while preserving the org itself, its services config, and
// audit trail (activity_log, monthly_reports, admin_notes). Admin-only.
//
// Safety rails:
//   - Verifies the caller is an authenticated admin (JWT + profile.role check)
//   - Requires { orgId, confirmSlug } in body and rejects if confirmSlug
//     doesn't match the org's actual slug. Front-end enforces type-to-confirm
//     so we double-check it server-side too.
//   - Every delete is scoped by organization_id with no fallback path that
//     could fan out to other orgs.
//   - Storage cleanup runs LAST, after DB rows are gone, so a partial failure
//     can never orphan files in the wrong direction.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { captureEdgeError } from './_sentry';

export const config = { runtime: 'edge' };

interface Body {
  orgId: string;
  confirmSlug: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: 'Service not configured' }, 503);

  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || (profile as { role: string }).role !== 'admin') return json({ error: 'Admins only' }, 403);

  let b: Body;
  try { b = (await req.json()) as Body; } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!b.orgId || !b.confirmSlug) return json({ error: 'Missing fields' }, 400);
  if (!UUID_RE.test(b.orgId)) return json({ error: 'Invalid orgId' }, 400);

  // Re-load the org server-side and confirm the slug matches what the admin
  // typed. If we can't find the org, or the slug typo, we abort.
  const { data: org } = await admin
    .from('organizations')
    .select('id, slug, business_name')
    .eq('id', b.orgId)
    .maybeSingle();
  if (!org) return json({ error: 'Org not found' }, 404);
  if ((org as { slug: string }).slug !== b.confirmSlug) {
    return json({ error: 'Slug confirmation mismatch' }, 400);
  }

  const orgId = b.orgId;

  try {
    // 1. Collect storage paths BEFORE deleting upload rows so we know what to
    //    remove from the bucket once the DB is clean.
    const { data: uploadsData } = await admin
      .from('uploads')
      .select('storage_path')
      .eq('organization_id', orgId);
    const storagePaths = (uploadsData ?? [])
      .map(u => (u as { storage_path: string | null }).storage_path)
      .filter((p): p is string => !!p);

    // 2. Wipe per-org tables. Order: child tables that have FKs to others
    //    first, even though most cascade from organizations - belt and braces.
    const wipes: Array<[string, string]> = [
      ['submissions',      'organization_id'],
      ['module_progress',  'organization_id'],
      ['task_completions', 'organization_id'],
      ['uploads',          'organization_id'],
      ['ai_chat_threads',  'organization_id'], // ai_chat_messages cascades from threads
      ['ai_chat_messages', 'organization_id'], // catch any orphans without thread_id set
      ['aria_escalations', 'organization_id'],
      ['admin_flags',      'organization_id'],
    ];

    for (const [table, col] of wipes) {
      const { error } = await admin.from(table).delete().eq(col, orgId);
      if (error) {
        // Some tables may not exist in older envs; log and continue rather
        // than blocking the reset on a missing optional table.
        console.warn(`[reset-client-data] ${table} delete:`, error.message);
      }
    }

    // 3. Storage cleanup. Files live under orgs/{orgId}/. Remove the exact
    //    paths we collected; if anything else lingers (e.g. failed upload
    //    rows), pick it up via a folder list as a backstop.
    if (storagePaths.length > 0) {
      await admin.storage.from('uploads').remove(storagePaths).catch(err => {
        console.warn('[reset-client-data] storage remove (paths):', err);
      });
    }
    const { data: leftover } = await admin.storage.from('uploads').list(`orgs/${orgId}`);
    const leftoverPaths = (leftover ?? []).map(f => `orgs/${orgId}/${f.name}`);
    if (leftoverPaths.length > 0) {
      await admin.storage.from('uploads').remove(leftoverPaths).catch(err => {
        console.warn('[reset-client-data] storage remove (leftover):', err);
      });
    }

    // 4. Activity log entry so admins can see this happened.
    await admin.from('activity_log').insert({
      organization_id: orgId,
      user_id: user.id,
      action: 'admin.reset_client_data',
      metadata: {
        impersonating: false,
        admin_email: user.email ?? null,
        business_name: (org as { business_name: string }).business_name,
      },
    }).then(({ error }) => {
      if (error) console.warn('[reset-client-data] activity_log insert:', error.message);
    });

    return json({ ok: true });
  } catch (err) {
    console.error('[reset-client-data] failed', err);
    captureEdgeError(err instanceof Error ? err : new Error(String(err)), {
      endpoint: 'reset-client-data',
      userId: user.id,
      extra: { orgId },
    });
    return json({ error: 'Reset failed. Some data may have been removed. Check the client.' }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
