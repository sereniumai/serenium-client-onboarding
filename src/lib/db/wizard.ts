/**
 * High-level wizard actions. These orchestrate multiple lower-level db calls
 * (org + services + seed rows + invitations) as one logical operation.
 *
 * Not truly atomic because these writes aren't wrapped in a single RPC. What
 * we do instead: on any failure past the initial createOrg, roll the org
 * back so the admin UI doesn't show a half-created zombie entry. If the
 * rollback itself fails we log + flag but still throw the original error so
 * the admin sees a clear failure message. A proper atomic create_client()
 * RPC is the right long-term fix.
 */
import * as Sentry from '@sentry/react';
import { supabase } from '../supabase';
import { SERVICES } from '../../config/modules';
import { createOrg, deleteOrg } from './orgs';
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

  // From here on, any failure should trigger a rollback so we don't leave a
  // zombie org in the admin UI. rollback() deletes the org, which cascades
  // to organization_services, module_progress, organization_members, and
  // invitations via the FK ON DELETE CASCADE in the schema.
  const rollback = async (reason: string, err: unknown) => {
    Sentry.captureException(err, {
      extra: { phase: reason, orgId: org.id, businessName: input.businessName },
    });
    try {
      await deleteOrg(org.id);
    } catch (rollbackErr) {
      Sentry.captureException(rollbackErr, {
        extra: { phase: 'rollback-failed', orgId: org.id, originalReason: reason },
        level: 'fatal',
      });
      console.error('[wizard] rollback failed — zombie org left behind:', org.id, rollbackErr);
    }
  };

  try {
    // Business Profile is always enabled. Other selected services come next.
    const allServices: ServiceKey[] = ['business_profile', ...input.services.filter(s => s !== 'business_profile')];
    const serviceRows = allServices.map((sk, i) => ({
      organization_id: org.id,
      service_key: sk,
      enabled: true,
      enabled_at: new Date().toISOString(),
      display_order: i,
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
  } catch (err) {
    await rollback('createClient-after-createOrg', err);
    throw err;
  }
}
