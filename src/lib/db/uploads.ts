import { supabase } from '../supabase';
import { toUpload } from './mappers';
import { impersonationMetadata } from '../impersonation';
import type { Upload } from '../../types';

const BUCKET = 'uploads';

// Keep in sync with the storage RLS policy's file-size limit and the
// Supabase bucket max. 10MB covers logos, photos, and most PDFs without
// letting a rogue upload fill a plan quota.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// MIME allowlist. Anything outside this is rejected client-side. Server-side
// enforcement lives in the Supabase storage bucket settings.
const ALLOWED_MIME_PREFIXES = [
  'image/',            // logos, photos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/',
];

function validateFile(file: File): void {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File "${file.name}" is too large. Max is ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB.`);
  }
  if (file.size === 0) {
    throw new Error(`File "${file.name}" is empty.`);
  }
  const mime = file.type || '';
  const ok = ALLOWED_MIME_PREFIXES.some(p => mime === p || mime.startsWith(p));
  if (!ok) {
    throw new Error(`File type "${mime || 'unknown'}" is not allowed. Upload images, PDFs, or Office documents.`);
  }
}

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
  validateFile(args.file);
  const uuid = crypto.randomUUID();
  // Strip path traversal, control chars, and anything outside safe ASCII.
  // Keep the original extension for readability but cap the length.
  const safeName = args.file.name
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/\.\.+/g, '_')
    .slice(0, 120);
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

  await supabase.from('activity_log').insert({
    organization_id: args.organizationId,
    user_id: args.userId ?? null,
    action: 'file_uploaded',
    metadata: { ...impersonationMetadata(), category: args.category, file_name: args.file.name, file_size: args.file.size },
  });

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
