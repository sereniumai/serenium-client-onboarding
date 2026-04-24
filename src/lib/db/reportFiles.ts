import { supabase } from '../supabase';
import type { ReportFile } from '../../types';

const BUCKET = 'uploads';
const MAX_REPORT_BYTES = 25 * 1024 * 1024; // monthly reports can be larger than onboarding uploads
const ALLOWED_REPORT_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

/** Upload a report attachment. Returns the metadata entry to append to monthly_reports.files. */
export async function uploadReportFile(args: {
  organizationId: string;
  reportId: string;
  file: File;
}): Promise<ReportFile> {
  if (args.file.size > MAX_REPORT_BYTES) {
    throw new Error(`File "${args.file.name}" is too large. Max is ${Math.round(MAX_REPORT_BYTES / 1024 / 1024)}MB.`);
  }
  if (args.file.size === 0) {
    throw new Error(`File "${args.file.name}" is empty.`);
  }
  const mime = args.file.type || 'application/pdf';
  if (!ALLOWED_REPORT_MIME.includes(mime)) {
    throw new Error(`File type "${mime}" not supported. Upload PDFs or images.`);
  }
  const safeName = args.file.name
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/\.\.+/g, '_')
    .slice(0, 120);
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

