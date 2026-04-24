import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Search, Bot, User as UserIcon, ExternalLink } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { EmptyState } from '../../components/EmptyState';
import { Markdown } from '../../components/Markdown';
import { db } from '../../lib/mockDb';
import { useDbVersion } from '../../hooks/useDb';
import { getService, getModule } from '../../config/modules';
import type { ServiceKey } from '../../types';
import { cn } from '../../lib/cn';

export function AiConversationsPage() {
  useDbVersion();
  const [query, setQuery] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string | 'all'>('all');

  const all = db.listAllAiChats();
  const orgs = db.listAllOrganizations();

  // userId -> display name. A user may be in multiple orgs — we only need their name here;
  // the org context comes from each message's own `organizationId`, not the profile.
  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const org of orgs) {
      for (const mem of db.listMembersForOrg(org.id)) {
        if (!m.has(mem.profile.id)) m.set(mem.profile.id, mem.profile.fullName);
      }
    }
    return m;
  }, [orgs]);
  const orgById = useMemo(() => new Map(orgs.map(o => [o.id, o])), [orgs]);

  const filtered = useMemo(() => {
    return all
      .filter(m => selectedOrgId === 'all' || m.organizationId === selectedOrgId)
      .filter(m => !query || m.content.toLowerCase().includes(query.toLowerCase()));
  }, [all, query, selectedOrgId]);

  // Group into conversations per (user + org + day) — ensures a user chatting from two orgs
  // on the same day doesn't get merged into one conversation.
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const msg of filtered) {
      const day = new Date(msg.createdAt).toISOString().slice(0, 10);
      const key = `${msg.userId}::${msg.organizationId ?? 'none'}::${day}`;
      const arr = map.get(key) ?? [];
      arr.push(msg);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([key, msgs]) => {
        const [userId, orgId, day] = key.split('::');
        return {
          key,
          day,
          userId,
          orgId: orgId === 'none' ? null : orgId,
          messages: msgs.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
        };
      })
      .sort((a, b) => (a.messages[0].createdAt < b.messages[0].createdAt ? 1 : -1));
  }, [filtered]);

  const contextLabel = (ctx: string | null) => {
    if (!ctx) return null;
    const [svc, mod] = ctx.split('.');
    const service = getService(svc as ServiceKey);
    if (!service) return ctx;
    if (!mod) return service.label;
    const m = getModule(svc as ServiceKey, mod);
    return `${service.label} → ${m?.title ?? mod}`;
  };

  const userQuestions = all.filter(m => m.role === 'user').length;

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-5xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="eyebrow">Admin</p>
              <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight">AI conversations</h1>
            </div>
          </div>
          <p className="text-white/60 text-sm md:text-base mb-8 max-w-2xl">
            Everything clients have asked the onboarding assistant. Use this to spot confusion, improve instructions, and train the AI on what clients actually need.
          </p>

          {/* FILTERS */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search questions and answers…"
                className="input !pl-9 !py-2.5 w-full"
              />
            </div>
            <select value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} className="input !py-2.5 md:max-w-xs">
              <option value="all">All clients ({orgs.length})</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.businessName}</option>)}
            </select>
          </div>

          <div className="flex gap-3 mb-6 text-sm text-white/60">
            <span>{userQuestions} question{userQuestions === 1 ? '' : 's'} total</span>
            <span className="text-white/20">·</span>
            <span>{filtered.length} message{filtered.length === 1 ? '' : 's'} shown</span>
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={query ? 'No matching messages' : 'No AI conversations yet'}
              description={query
                ? 'Try a different search term.'
                : "As soon as clients start asking the onboarding assistant questions, you'll see every exchange here."}
            />
          ) : (
            <div className="space-y-6">
              {groups.map(group => {
                const userName = userNameById.get(group.userId);
                const org = group.orgId ? orgById.get(group.orgId) : null;
                return (
                  <div key={group.key} className="card p-0 overflow-hidden">
                    <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-border-subtle bg-bg-tertiary/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center shrink-0">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{userName ?? 'Unknown user'}</p>
                          <p className="text-xs text-white/50 truncate">{org?.businessName ?? '—'} · {new Date(group.day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                      {org && (
                        <Link to={`/admin/clients/${org.slug}`} className="text-xs text-orange hover:text-orange-hover inline-flex items-center gap-1 shrink-0">
                          View client <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <div className="p-5 space-y-3">
                      {group.messages.map(m => (
                        <ConvMessage key={m.id} message={m} contextLabel={contextLabel(m.context)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ConvMessage({ message, contextLabel }: { message: { role: 'user' | 'assistant'; content: string; createdAt: string; context: string | null }; contextLabel: string | null }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-orange/15 text-orange flex items-center justify-center shrink-0 self-start mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={cn('max-w-[82%]', isUser ? 'text-right' : '')}>
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed inline-block text-left',
          isUser
            ? 'bg-orange text-white rounded-br-md'
            : 'bg-bg-tertiary/70 border border-border-subtle text-white/90 rounded-bl-md'
        )}>
          {isUser ? <span className="whitespace-pre-wrap">{message.content}</span> : <Markdown>{message.content}</Markdown>}
        </div>
        <div className={cn('mt-1 text-[10px] text-white/40 flex gap-2', isUser ? 'justify-end' : '')}>
          <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
          {contextLabel && <><span className="text-white/20">·</span><span>on {contextLabel}</span></>}
        </div>
      </div>
    </div>
  );
}
