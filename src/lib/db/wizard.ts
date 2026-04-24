/**
 * High-level wizard actions. These orchestrate multiple lower-level db calls
 * (org + services + seed rows + invitations) as one logical operation.
 *
 * Not atomic across failure boundaries, best-effort. If a step fails mid-way
 * the org is left in an incomplete state and admin re-runs or patches it.
 * When we move to edge functions, these become single transactional RPCs.
 */
import { supabase } from '../supabase';
import { SERVICES } from '../../config/modules';
import { createOrg } from './orgs';
import { createInvitation } from './invitations';
import type { Organization, ServiceKey, MemberRole } from '../../types';

export interface CreateClientInput {
  businessName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  services: ServiceKey[];
  /** Opt-out list of module keys per service. Absent = all modules included. */
  serviceModules?: Partial<Record<ServiceKey, string[]>>;
  users: { fullName: string; email: string; role: MemberRole }[];
}

export async function createClient(input: CreateClientInput): Promise<Organization> {
  const org = await createOrg({
    businessName: input.businessName,
    primaryContactName: input.primaryContactName,
    primaryContactEmail: input.primaryContactEmail,
    primaryContactPhone: input.primaryContactPhone,
  });

  // Business Profile is always enabled. Other selected services come next.
  const allServices: ServiceKey[] = ['business_profile', ...input.services.filter(s => s !== 'business_profile')];
  const serviceRows = allServices.map(sk => ({
    organization_id: org.id,
    service_key: sk,
    enabled: true,
    enabled_at: new Date().toISOString(),
    disabled_module_keys: input.serviceModules?.[sk] ?? [],
    disabled_field_keys: [],
  }));
  const { error: svcErr } = await supabase.from('organization_services').insert(serviceRows);
  if (svcErr) throw svcErr;

  // Seed module_progress = not_started for every module of every enabled service.
  const progressRows: Array<{ organization_id: string; service_key: string; module_key: string; status: string }> = [];
  for (const sk of allServices) {
    const svc = SERVICES.find(s => s.key === sk);
    if (!svc) continue;
    for (const m of svc.modules) {
      progressRows.push({
        organization_id: org.id,
        service_key: sk,
        module_key: m.key,
        status: 'not_started',
      });
    }
  }
  if (progressRows.length > 0) {
    const { error: progErr } = await supabase.from('module_progress').insert(progressRows);
    if (progErr) throw progErr;
  }

  // Invitations for each user. Skip empty emails.
  const validUsers = input.users.filter(u => u.email.trim());
  for (const u of validUsers) {
    await createInvitation({
      organizationId: org.id,
      email: u.email,
      fullName: u.fullName || undefined,
      role: u.role,
    });
  }

  return org;
}
