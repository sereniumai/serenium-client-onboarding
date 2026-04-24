import { supabase } from '../supabase';
import type { ReportFile } from '../../types';

const BUCKET = 'uploads';

/** Upload a report attachment. Returns the metadata entry to append to monthly_reports.files. */
export async function uploadReportFile(args: {
  organizationId: string;
  reportId: string;
  file: File;
}): Promise<ReportFile> {
  const safeName = args.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const storagePath = `reports/${args.organizationId}/${args.reportId}/${Date.now()}-${safeName}`;

  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, args.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: args.file.type || 'application/pdf',
    });
  if (storageErr) throw storageErr;

  return {
    id: crypto.randomUUID(),
    fileName: args.file.name,
    fileUrl: storagePath,      // legacy slot stores the storage path
    fileSize: args.file.size,
    mimeType: args.file.type || 'application/pdf',
  };
}

export async function removeReportFile(storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
}

export async function getReportFileSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('No signed URL returned');
  return data.signedUrl;
}

