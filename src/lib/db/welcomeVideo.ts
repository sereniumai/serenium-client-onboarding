import { supabase } from '../supabase';

const BUCKET = 'uploads';

export interface WelcomeVideoMeta {
  fileName: string | null;
  storagePath: string | null;
  mimeType: string | null;
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
    fileName:    (r.file_name as string | null) ?? null,
    storagePath: (r.storage_path as string | null) ?? null,
    mimeType:    (r.mime_type as string | null) ?? null,
    updatedAt:   r.updated_at as string,
  };
}

export async function uploadWelcomeVideo(file: File): Promise<WelcomeVideoMeta> {
  // Store under a stable path so old videos auto-overwrite, easier to clean up.
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const storagePath = `welcome/${Date.now()}-${safeName}`;
  const { error: storageErr } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (storageErr) throw storageErr;

  const { data, error } = await supabase
    .from('welcome_video')
    .upsert({
      id: 1,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  const r = data as Record<string, unknown>;
  return {
    fileName:    r.file_name as string,
    storagePath: r.storage_path as string,
    mimeType:    r.mime_type as string,
    updatedAt:   r.updated_at as string,
  };
}

export async function clearWelcomeVideo(): Promise<void> {
  const current = await getWelcomeVideo();
  if (current?.storagePath) {
    await supabase.storage.from(BUCKET).remove([current.storagePath]).catch(() => {});
  }
  const { error } = await supabase.from('welcome_video').update({
    file_name: null,
    storage_path: null,
    mime_type: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) throw error;
}

export async function getWelcomeVideoSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('No signed URL returned');
  return data.signedUrl;
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
