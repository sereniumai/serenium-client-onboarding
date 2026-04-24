import { supabase } from '../supabase';

export async function getRetellNumber(orgId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('retell_numbers')
    .select('phone_number')
    .eq('organization_id', orgId)
    .maybeSingle();
  if (error) throw error;
  return (data?.phone_number as string | undefined) ?? null;
}

export async function setRetellNumber(orgId: string, phoneNumber: string): Promise<void> {
  const { error } = await supabase
    .from('retell_numbers')
    .upsert({
      organization_id: orgId,
      phone_number: phoneNumber,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' });
  if (error) throw error;
}

export async function clearRetellNumber(orgId: string): Promise<void> {
  const { error } = await supabase.from('retell_numbers').delete().eq('organization_id', orgId);
  if (error) throw error;
}
