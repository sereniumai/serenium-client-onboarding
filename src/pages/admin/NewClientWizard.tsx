import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Megaphone, MessageSquare, Globe, Building2, Headphones, Check, ChevronDown } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { db } from '../../lib/mockDb';
import { SERVICES, SELECTABLE_SERVICES, getService } from '../../config/modules';
import { toast } from 'sonner';
import type { ServiceKey } from '../../types';
import { cn } from '../../lib/cn';

type UserRow = { fullName: string; email: string; role: 'owner' | 'member' };

const SERVICE_ICON: Record<ServiceKey, typeof Megaphone> = {
  business_profile: Building2,
  facebook_ads: Megaphone,
  ai_sms: MessageSquare,
  ai_receptionist: Headphones,
  website: Globe,
};

export function NewClientWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [businessName, setBusinessName] = useState('');
  const [primaryName, setPrimaryName] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');

  const [services, setServices] = useState<ServiceKey[]>(['facebook_ads', 'ai_sms', 'ai_receptionist']);
  // Modules NOT included, per service (opt-out). Empty/absent = all included.
  const [disabledModules, setDisabledModules] = useState<Partial<Record<ServiceKey, string[]>>>({});
  const [users, setUsers] = useState<UserRow[]>([{ fullName: '', email: '', role: 'owner' }]);

  const toggleSvc = (k: ServiceKey) => setServices(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  const toggleModule = (svcKey: ServiceKey, modKey: string, on: boolean) => {
    setDisabledModules(prev => {
      const current = new Set(prev[svcKey] ?? []);
      if (on) current.delete(modKey);
      else current.add(modKey);
      return { ...prev, [svcKey]: Array.from(current) };
    });
  };
  const setAllModules = (svcKey: ServiceKey, enabled: boolean) => {
    const svc = SERVICES.find(s => s.key === svcKey);
    if (!svc) return;
    setDisabledModules(prev => ({ ...prev, [svcKey]: enabled ? [] : svc.modules.map(m => m.key) }));
  };

  const step1Valid = businessName.trim() && primaryName.trim() && primaryEmail.trim();
  const step2Valid = services.length > 0;

  const submit = () => {
    const validUsers = users.filter(u => u.email.trim());
    const final = validUsers.length > 0 ? validUsers : [{ fullName: primaryName, email: primaryEmail, role: 'owner' as const }];
    const org = db.createOrganization({
      businessName: businessName.trim(),
      primaryContactName: primaryName.trim(),
      primaryContactEmail: primaryEmail.trim(),
      primaryContactPhone: primaryPhone.trim() || undefined,
      services,
      serviceModules: disabledModules,
      users: final,
    });
    toast.success(`${org.businessName} created`, {
      description: `${services.length} ${services.length === 1 ? 'service' : 'services'} · ${final.length} ${final.length === 1 ? 'user' : 'users'} invited`,
    });
    navigate(`/admin/clients/${org.slug}`);
  };

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6 pt-6 md:pt-10 pb-16 md:pb-24">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> Back to admin
          </Link>

          <p className="eyebrow mb-3">New client · step {step} of 3</p>
          <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-6 md:mb-8">
            {step === 1 && <>Business <span className="text-orange">info</span></>}
            {step === 2 && <>Choose services and <span className="text-orange">steps</span></>}
            {step === 3 && <>Invite <span className="text-orange">users</span></>}
          </h1>

          <div className="flex items-center gap-2 mb-10">
            {[1, 2, 3].map(n => (
              <div key={n} className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                step >= n ? 'bg-orange' : 'bg-bg-tertiary'
              )} />
            ))}
          </div>

          {step === 1 && (
            <div className="card space-y-5">
              <Field label="Business name" required>
                <input className="input" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Sure West Roofing" />
              </Field>
              <Field label="Primary contact name" required>
                <input className="input" value={primaryName} onChange={e => setPrimaryName(e.target.value)} placeholder="Craig Johnson" />
              </Field>
              <Field label="Primary contact email" required>
                <input className="input" type="email" value={primaryEmail} onChange={e => setPrimaryEmail(e.target.value)} placeholder="craig@surewest.ca" />
              </Field>
              <Field label="Primary contact phone">
                <input className="input" type="tel" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value)} placeholder="403-555-0199" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-white/60 mb-2">Business Profile is always included for every client. For each service you enable, pick only the steps you actually need from them — unchecked steps won't appear in their portal.</p>

              {/* Business Profile — mandatory, per-field toggle */}
              <BusinessProfilePicker disabled={disabledModules.business_profile ?? []} onToggle={(modKey, on) => toggleModule('business_profile', modKey, on)} />

              {SELECTABLE_SERVICES.map(s => {
                const on = services.includes(s.key);
                const Icon = SERVICE_ICON[s.key];
                const svc = getService(s.key)!;
                const disabledSet = new Set(disabledModules[s.key] ?? []);
                const activeCount = svc.modules.length - disabledSet.size;
                return (
                  <div key={s.key} className={cn(
                    'card p-0 overflow-hidden transition-colors',
                    on ? 'border-orange/40' : 'border-border-subtle'
                  )}>
                    <button
                      type="button"
                      onClick={() => toggleSvc(s.key)}
                      className="w-full flex items-center gap-4 p-5 text-left hover:bg-bg-tertiary/30 transition-colors"
                    >
                      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
                        on ? 'bg-orange text-white' : 'bg-bg-tertiary text-white/60')}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{s.label}</p>
                        <p className="text-xs text-white/60">{s.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {on && <span className="text-xs text-white/50 tabular-nums">{activeCount} / {svc.modules.length} steps</span>}
                        <div className={cn(
                          'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0',
                          on ? 'bg-orange border-orange' : 'border-white/30'
                        )}>
                          {on && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                    </button>

                    {on && (
                      <div className="border-t border-border-subtle">
                        <div className="flex items-center justify-between px-5 py-2.5 bg-bg-tertiary/20">
                          <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                            <ChevronDown className="h-3.5 w-3.5" /> Steps included
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <button type="button" onClick={() => setAllModules(s.key, true)} className="text-orange hover:text-orange-hover">Select all</button>
                            <span className="text-white/20">·</span>
                            <button type="button" onClick={() => setAllModules(s.key, false)} className="text-white/50 hover:text-white">Clear</button>
                          </div>
                        </div>
                        <ul className="divide-y divide-border-subtle">
                          {svc.modules.map((m, i) => {
                            const included = !disabledSet.has(m.key);
                            return (
                              <li key={m.key}>
                                <label className={cn(
                                  'flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-bg-tertiary/20 transition-colors',
                                  !included && 'opacity-50'
                                )}>
                                  <input
                                    type="checkbox"
                                    checked={included}
                                    onChange={e => toggleModule(s.key, m.key, e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-white/30 accent-orange cursor-pointer"
                                  />
                                  <span className="text-xs text-white/40 tabular-nums w-6 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{m.title}</p>
                                    <p className="text-xs text-white/50">{m.description}</p>
                                  </div>
                                  <span className="text-[11px] text-white/30 whitespace-nowrap">~{m.estimatedMinutes}m</span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="card space-y-4">
              <p className="text-sm text-white/60">Add the users who'll log in. The primary contact is the default owner. In local mode, accounts are created instantly — real email invites get wired up when Supabase is connected.</p>
              {users.map((u, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-2">
                  <input className="input md:w-1/3" placeholder="Full name"
                    value={u.fullName} onChange={e => setUsers(arr => arr.map((x, j) => j === i ? { ...x, fullName: e.target.value } : x))} />
                  <input className="input flex-1" type="email" placeholder="name@company.com"
                    value={u.email} onChange={e => setUsers(arr => arr.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
                  <select className="input md:w-32"
                    value={u.role} onChange={e => setUsers(arr => arr.map((x, j) => j === i ? { ...x, role: e.target.value as 'owner' | 'member' } : x))}>
                    <option value="owner">Owner</option>
                    <option value="member">Member</option>
                  </select>
                  {users.length > 1 && (
                    <button type="button" onClick={() => setUsers(arr => arr.filter((_, j) => j !== i))}
                      className="px-3 rounded-lg border border-border-subtle text-white/50 hover:text-error hover:border-error/40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setUsers(u => [...u, { fullName: '', email: '', role: 'member' }])}
                className="inline-flex items-center gap-1.5 text-sm text-orange hover:text-orange-hover font-medium">
                <Plus className="h-4 w-4" /> Add another user
              </button>

              {/* Summary */}
              <div className="pt-5 mt-5 border-t border-border-subtle">
                <p className="eyebrow mb-3">Review</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <SummaryRow label="Business" value={businessName || '—'} />
                  <SummaryRow label="Primary contact" value={primaryName || '—'} />
                  <SummaryRow label="Services" value={services.length === 0 ? 'Business Profile only' : ['Business Profile', ...services.map(k => SELECTABLE_SERVICES.find(o => o.key === k)?.label).filter(Boolean)].join(', ')} />
                  <SummaryRow label="Total steps" value={totalSteps(services, disabledModules).toString()} />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-subtle">
            {step > 1 ? (
              <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="btn-secondary">Back</button>
            ) : <span />}

            {step < 3 ? (
              <button onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)} disabled={step === 1 ? !step1Valid : !step2Valid} className="btn-primary">
                Continue
              </button>
            ) : (
              <button onClick={submit} className="btn-primary">Create client</button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-orange ml-1">*</span>}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">{label}</span>
      <span className="text-white/90 truncate">{value}</span>
    </div>
  );
}

function totalSteps(services: ServiceKey[], disabled: Partial<Record<ServiceKey, string[]>>): number {
  const bp = getService('business_profile');
  const bpCount = bp ? bp.modules.length - (disabled.business_profile?.length ?? 0) : 0;
  return bpCount + services.reduce((sum, key) => {
    const svc = SERVICES.find(s => s.key === key);
    if (!svc) return sum;
    return sum + svc.modules.length - (disabled[key]?.length ?? 0);
  }, 0);
}

function BusinessProfilePicker({ disabled, onToggle }: { disabled: string[]; onToggle: (modKey: string, on: boolean) => void }) {
  const svc = getService('business_profile')!;
  const disabledSet = new Set(disabled);
  const activeCount = svc.modules.length - disabledSet.size;

  return (
    <div className="card p-0 overflow-hidden border-orange/40">
      <div className="flex items-center gap-4 p-5 bg-orange/5">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-orange text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold">Business Profile</p>
            <span className="text-[10px] uppercase tracking-wider text-orange font-semibold px-1.5 py-0.5 rounded bg-orange/10">Always on</span>
          </div>
          <p className="text-xs text-white/60">Core info used across every service. Pick which fields you need.</p>
        </div>
        <span className="text-xs text-white/50 tabular-nums shrink-0">{activeCount} / {svc.modules.length}</span>
      </div>
      <div className="border-t border-border-subtle">
        <div className="flex items-center justify-between px-5 py-2.5 bg-bg-tertiary/20">
          <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
            <ChevronDown className="h-3.5 w-3.5" /> Fields included
          </span>
          <div className="flex items-center gap-3 text-xs">
            <button type="button" onClick={() => svc.modules.forEach(m => onToggle(m.key, true))} className="text-orange hover:text-orange-hover">Select all</button>
            <span className="text-white/20">·</span>
            <button type="button" onClick={() => svc.modules.forEach(m => onToggle(m.key, false))} className="text-white/50 hover:text-white">Clear</button>
          </div>
        </div>
        <ul className="divide-y divide-border-subtle max-h-[340px] overflow-y-auto">
          {svc.modules.map(m => {
            const included = !disabledSet.has(m.key);
            return (
              <li key={m.key}>
                <label className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-bg-tertiary/20 transition-colors ${!included ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={e => onToggle(m.key, e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 accent-orange cursor-pointer shrink-0"
                  />
                  <span className="text-sm flex-1">{m.title}</span>
                  {m.estimatedMinutes && <span className="text-[11px] text-white/30">~{m.estimatedMinutes}m</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
