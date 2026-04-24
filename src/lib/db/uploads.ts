import { supabase } from '../supabase';
import { toUpload } from './mappers';
import type { Upload } from '../../types';

const BUCKET = 'uploads';

export async function listUploads(orgId: string, category?: string): Promise<Upload[]> {
  let q = supabase.from('uploads').select('*').eq('organization_id', orgId);
  if (category) q = q.eq('category', category);
  const { data, error } = await q.order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toUpload);
}

export async function uploadFile(args: {
  organizationId: string;
  category: string;
  file: File;
  userId?: string;
}): Promise<Upload> {
  const uuid = crypto.randomUUID();
  const safeName = args.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const storagePath = `orgs/${args.organizationId}/${uuid}-${safeName}`;

  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, args.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: args.file.type,
    });
  if (storageErr) throw storageErr;

  const { data, error } = await supabase
    .from('uploads')
    .insert({
      organization_id: args.organizationId,
      category: args.category,
      file_name: args.file.name,
      storage_path: storagePath,
      file_size: args.file.size,
      mime_type: args.file.type,
      uploaded_by: args.userId ?? null,
    })
    .select('*')
    .single();
  if (error) {
    // Rollback storage object if metadata insert failed.
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw error;
  }
  return toUpload(data);
}

export async function removeUpload(upload: Upload): Promise<void> {
  if (upload.storagePath) {
    await supabase.storage.from(BUCKET).remove([upload.storagePath]).catch(() => {});
  }
  const { error } = await supabase.from('uploads').delete().eq('id', upload.id);
  if (error) throw error;
}

/**
 * Returns a short-lived signed URL (1 hour) for rendering a private file.
 * Throws on failure, so call sites render the error surface they want.
 */
export async function getUploadSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('No signed URL returned');
  return data.signedUrl;
}
