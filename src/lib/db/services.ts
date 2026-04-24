import { supabase } from '../supabase';
import { toOrganizationService } from './mappers';
import type { OrganizationService, ServiceKey } from '../../types';

export async function listServicesForOrg(orgId: string): Promise<OrganizationService[]> {
  const { data, error } = await supabase
    .from('organization_services')
    .select('*')
    .eq('organization_id', orgId)
    .eq('enabled', true);
  if (error) throw error;
  return (data ?? []).map(toOrganizationService);
}

export async function enableService(orgId: string, serviceKey: ServiceKey): Promise<void> {
  const { error } = await supabase
    .from('organization_services')
    .upsert({
      organization_id: orgId,
      service_key: serviceKey,
      enabled: true,
      enabled_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,service_key' });
  if (error) throw error;
}

export async function disableService(orgId: string, serviceKey: ServiceKey): Promise<void> {
  const { error } = await supabase
    .from('organization_services')
    .update({ enabled: false })
    .eq('organization_id', orgId)
    .eq('service_key', serviceKey);
  if (error) throw error;
}

export async function setDisabledModuleKeys(orgId: string, serviceKey: ServiceKey, keys: string[]): Promise<void> {
  const { error } = await supabase
    .from('organization_services')
    .update({ disabled_module_keys: keys })
    .eq('organization_id', orgId)
    .eq('service_key', serviceKey);
  if (error) throw error;
}

export async function setDisabledFieldKeys(orgId: string, serviceKey: ServiceKey, keys: string[]): Promise<void> {
  const { error } = await supabase
    .from('organization_services')
    .update({ disabled_field_keys: keys })
    .eq('organization_id', orgId)
    .eq('service_key', serviceKey);
  if (error) throw error;
}
