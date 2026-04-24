import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/queryClient';
import * as subs from '../lib/db/submissions';
import * as prog from '../lib/db/progress';
import { useOrgServices } from './useOrgs';
import { useUploadsForOrg } from './useUploads';
import type { OrgSnapshot } from '../lib/progress';

export function useSubmissions(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.submissions(orgId ?? ''),
    queryFn: () => subs.listSubmissionsForOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useModuleProgress(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.moduleProgress(orgId ?? ''),
    queryFn: () => prog.listModuleProgress(orgId!),
    enabled: !!orgId,
  });
}

export function useTaskCompletions(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.taskCompletions(orgId ?? ''),
    queryFn: () => prog.listTaskCompletions(orgId!),
    enabled: !!orgId,
  });
}

export function useAdminFlags(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.adminFlags(orgId ?? ''),
    queryFn: () => prog.listAdminFlags(orgId!),
    enabled: !!orgId,
  });
}

export function useUpsertSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subs.upsertSubmission,
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: qk.submissions(vars.organizationId) }); },
  });
}

export function useSetModuleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: prog.setModuleStatus,
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: qk.moduleProgress(vars.organizationId) }); },
  });
}

export function useSetTaskCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: prog.setTaskCompletion,
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: qk.taskCompletions(vars.organizationId) }); },
  });
}

/**
 * Aggregates everything the progress helpers need into a single snapshot.
 * Components call this once, then pass the snapshot to getOrgProgress /
 * moduleIsReady / etc. without further fetches.
 */
export function useOrgSnapshot(orgId: string | undefined): {
  snapshot: OrgSnapshot | null;
  isLoading: boolean;
  isError: boolean;
} {
  const services      = useOrgServices(orgId);
  const submissions   = useSubmissions(orgId);
  const moduleProgress = useModuleProgress(orgId);
  const taskCompletions = useTaskCompletions(orgId);
  const adminFlags    = useAdminFlags(orgId);
  const uploads       = useUploadsForOrg(orgId);

  const ready = !!orgId
    && !services.isLoading && !submissions.isLoading
    && !moduleProgress.isLoading && !taskCompletions.isLoading
    && !adminFlags.isLoading && !uploads.isLoading;

  const snapshot = useMemo<OrgSnapshot | null>(() => {
    if (!ready || !orgId) return null;
    return {
      organizationId: orgId,
      services: services.data ?? [],
      submissions: submissions.data ?? [],
      moduleProgress: moduleProgress.data ?? [],
      taskCompletions: taskCompletions.data ?? [],
      adminFlags: adminFlags.data ?? {},
      uploads: uploads.data ?? [],
    };
  }, [ready, orgId,
      services.data, submissions.data, moduleProgress.data,
      taskCompletions.data, adminFlags.data, uploads.data]);

  const isLoading = !!orgId && !ready;
  const isError = !!(services.isError || submissions.isError || moduleProgress.isError
    || taskCompletions.isError || adminFlags.isError || uploads.isError);

  return { snapshot, isLoading, isError };
}

export function useSetAdminFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, flagKey, value }: { orgId: string; flagKey: string; value: boolean }) =>
      prog.setAdminFlag(orgId, flagKey, value),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: qk.adminFlags(vars.orgId) }); },
  });
}
