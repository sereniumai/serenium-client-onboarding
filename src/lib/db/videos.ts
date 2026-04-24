import { supabase } from '../supabase';
import type { ServiceKey } from '../../types';

export interface StepVideo {
  serviceKey: ServiceKey;
  moduleKey: string;
  url: string;
  updatedAt: string;
}

export async function listStepVideos(): Promise<StepVideo[]> {
  const { data, error } = await supabase.from('step_videos').select('*');
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map(r => ({
    serviceKey: r.service_key as ServiceKey,
    moduleKey:  r.module_key as string,
    url:        r.url as string,
    updatedAt:  r.updated_at as string,
  }));
}

export async function getStepVideo(serviceKey: ServiceKey, moduleKey: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('step_videos')
    .select('url')
    .eq('service_key', serviceKey)
    .eq('module_key', moduleKey)
    .maybeSingle();
  if (error) throw error;
  return (data?.url as string | undefined) ?? null;
}

export async function setStepVideo(serviceKey: ServiceKey, moduleKey: string, url: string): Promise<void> {
  const { error } = await supabase.from('step_videos').upsert({
    service_key: serviceKey,
    module_key:  moduleKey,
    url,
    updated_at:  new Date().toISOString(),
  }, { onConflict: 'service_key,module_key' });
  if (error) throw error;
}

export async function removeStepVideo(serviceKey: ServiceKey, moduleKey: string): Promise<void> {
  const { error } = await supabase
    .from('step_videos')
    .delete()
    .eq('service_key', serviceKey)
    .eq('module_key', moduleKey);
  if (error) throw error;
}
