import { supabase } from '../supabase';

export interface WelcomeVideoMeta {
  videoUrl: string | null;
  updatedAt: string;
}

export async function getWelcomeVideo(): Promise<WelcomeVideoMeta | null> {
  const { data, error } = await supabase
    .from('welcome_video')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    videoUrl:  (r.video_url as string | null) ?? null,
    updatedAt: r.updated_at as string,
  };
}

export async function setWelcomeVideoUrl(url: string): Promise<WelcomeVideoMeta> {
  const { data, error } = await supabase
    .from('welcome_video')
    .upsert({
      id: 1,
      video_url: url.trim() || null,
      // Clear the legacy file-based columns if any rows still reference them.
      file_name: null,
      storage_path: null,
      mime_type: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  const r = data as Record<string, unknown>;
  return {
    videoUrl:  (r.video_url as string | null) ?? null,
    updatedAt: r.updated_at as string,
  };
}

export async function clearWelcomeVideo(): Promise<void> {
  const { error } = await supabase.from('welcome_video').update({
    video_url: null,
    file_name: null,
    storage_path: null,
    mime_type: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) throw error;
}

// Track which users have seen the welcome video (dismissal state).
export async function markWelcomeSeen(userId: string): Promise<void> {
  const { error } = await supabase.from('welcomed_users').upsert({
    user_id: userId,
    seen_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function hasSeenWelcome(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('welcomed_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
