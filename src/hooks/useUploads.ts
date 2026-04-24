import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toUpload } from '../lib/db/mappers';
import { qk } from '../lib/queryClient';
import type { Upload } from '../types';

/**
 * Metadata-only list of uploads for an org, optionally scoped by category.
 *
 * Does NOT generate signed URLs (too expensive for list views), call
 * getUploadSignedUrl(storagePath) on-demand for display.
 */
export function useUploadsForOrg(orgId: string | undefined, category?: string) {
  return useQuery({
    queryKey: qk.uploads(orgId ?? '', category),
    queryFn: async (): Promise<Upload[]> => {
      let q = supabase.from('uploads').select('*').eq('organization_id', orgId!);
      if (category) q = q.eq('category', category);
      const { data, error } = await q.order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toUpload);
    },
    enabled: !!orgId,
  });
}
