import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/queryClient';
import * as orgs from '../lib/db/orgs';
import * as members from '../lib/db/members';
import * as services from '../lib/db/services';

export function useAllOrgs() {
  return useQuery({
    queryKey: qk.orgs(),
    queryFn: orgs.listAllOrgs,
  });
}

export function useOrgsForUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['orgs', 'forUser', userId ?? ''],
    queryFn: () => orgs.listOrgsForUser(userId!),
    enabled: !!userId,
  });
}

export function useOrgBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: qk.org(slug ?? ''),
    queryFn: () => orgs.getOrgBySlug(slug!),
    enabled: !!slug,
  });
}

export function useOrgById(id: string | undefined) {
  return useQuery({
    queryKey: qk.org(id ?? ''),
    queryFn: () => orgs.getOrgById(id!),
    enabled: !!id,
  });
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.orgMembers(orgId ?? ''),
    queryFn: () => members.listMembersForOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useOrgServices(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.orgServices(orgId ?? ''),
    queryFn: () => services.listServicesForOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgs.createOrg,
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.orgs() }); },
  });
}

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: orgs.UpdateOrgInput }) => orgs.updateOrg(id, patch),
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: qk.orgs() });
      qc.invalidateQueries({ queryKey: qk.org(org.id) });
      qc.invalidateQueries({ queryKey: qk.org(org.slug) });
    },
  });
}

export function useDeleteOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgs.deleteOrg,
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.orgs() }); },
  });
}
