import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, DollarSign, Repeat, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  listLinesForOrg,
  createRevenueLine,
  updateRevenueLine,
  deleteRevenueLine,
} from '../../lib/db/revenue';
import type { ServiceKey, RevenueLine, RevenueType } from '../../types';
import { cn } from '../../lib/cn';

interface Props {
  orgId: string;
  serviceKey: ServiceKey;
  serviceLabel: string;
  open: boolean;
  onClose: () => void;
}

function fmtCAD(cents: number): string {
  return (cents / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
}

export function ServiceRevenueEditor({ orgId, serviceKey, serviceLabel, open, onClose }: Props) {
  const qc = useQueryClient();
  const { data: lines = [] } = useQuery({
    queryKey: ['revenue', orgId],
    queryFn: () => listLinesForOrg(orgId),
    enabled: open,
  });
  const serviceLines = lines.filter(l => l.serviceKey === serviceKey);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['revenue', orgId] });
    qc.invalidateQueries({ queryKey: ['revenue', 'all'] });
  };

  const create = useMutation({
    mutationFn: (input: { type: RevenueType; amountCents: number; startedAt: string }) =>
      createRevenueLine({ organizationId: orgId, serviceKey, ...input }),
    onSuccess: () => { invalidate(); toast.success('Line added'); },
    onError: (e: Error) => toast.error('Could not add', { description: e.message }),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateRevenueLine>[1] }) =>
      updateRevenueLine(id, patch),
    onSuccess: () => { invalidate(); toast.success('Saved'); },
    onError: (e: Error) => toast.error('Save failed', { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRevenueLine(id),
    onSuccess: () => { invalidate(); toast.success('Removed'); },
    onError: (e: Error) => toast.error('Could not remove', { description: e.message }),
  });

  // Local "draft" line state (only saved on commit)
  const [draftType, setDraftType] = useState<RevenueType>('monthly');
  const [draftAmount, setDraftAmount] = useState('');
  const [draftStart, setDraftStart] = useState(() => new Date().toISOString().slice(0, 10));
  const addDraft = () => {
    const amt = Math.round(Number(draftAmount.replace(/[^0-9.]/g, '')) * 100);
    if (!amt || amt < 0) {
      toast.error('Enter a positive amount');
      return;
    }
    create.mutate({ type: draftType, amountCents: amt, startedAt: draftStart });
    setDraftAmount('');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-xl bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-border-subtle flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange/15 text-orange flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow mb-0.5">Revenue · {serviceLabel}</p>
              <p className="text-sm text-white/55">One-time payments and monthly retainers, with their start and end dates.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-tertiary text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {serviceLines.length === 0 && (
              <div className="text-sm text-white/55 px-3 py-2.5 rounded-lg bg-bg-tertiary/40 border border-border-subtle">
                No revenue logged for this service yet.
              </div>
            )}

            {serviceLines.length > 0 && (
              <ul className="space-y-2">
                {serviceLines.map(line => (
                  <LineRow
                    key={line.id}
                    line={line}
                    onSave={(patch) => update.mutate({ id: line.id, patch })}
                    onRemove={() => remove.mutate(line.id)}
                  />
                ))}
              </ul>
            )}

            <div className="rounded-xl border border-orange/30 bg-orange/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange mb-3">+ Add line</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setDraftType('monthly')}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                    draftType === 'monthly' ? 'bg-orange/15 text-orange border-orange/40' : 'bg-bg-tertiary/40 text-white/65 border-border-subtle hover:border-white/30',
                  )}
                >
                  <Repeat className="h-3.5 w-3.5" /> Monthly retainer
                </button>
                <button
                  onClick={() => setDraftType('one_time')}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                    draftType === 'one_time' ? 'bg-orange/15 text-orange border-orange/40' : 'bg-bg-tertiary/40 text-white/65 border-border-subtle hover:border-white/30',
                  )}
                >
                  <DollarSign className="h-3.5 w-3.5" /> One-time
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-1 block">Amount (CAD)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="2500"
                    value={draftAmount}
                    onChange={e => setDraftAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addDraft()}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-1 block">
                    {draftType === 'monthly' ? 'Starts' : 'Billed'}
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={draftStart}
                    onChange={e => setDraftStart(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={addDraft}
                disabled={create.isPending}
                className="btn-primary w-full mt-3 !py-2"
              >
                <Plus className="h-3.5 w-3.5" /> Add {draftType === 'monthly' ? 'retainer' : 'one-time'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function LineRow({ line, onSave, onRemove }: {
  line: RevenueLine;
  onSave: (patch: { amountCents?: number; startedAt?: string; endedAt?: string | null }) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(line.amountCents / 100));
  const [start, setStart] = useState(line.startedAt);
  const [end, setEnd] = useState(line.endedAt ?? '');

  useEffect(() => {
    setAmount(String(line.amountCents / 100));
    setStart(line.startedAt);
    setEnd(line.endedAt ?? '');
  }, [line]);

  const isActive = !line.endedAt || line.endedAt > new Date().toISOString().slice(0, 10);
  const isFuture = line.startedAt > new Date().toISOString().slice(0, 10);

  if (!editing) {
    return (
      <li className="rounded-lg border border-border-subtle bg-bg-tertiary/30 px-3 py-2.5 flex items-center gap-3">
        <div className={cn(
          'h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
          line.type === 'monthly' ? 'bg-orange/15 text-orange' : 'bg-success/15 text-success',
        )}>
          {line.type === 'monthly' ? <Repeat className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tabular-nums">
            {fmtCAD(line.amountCents)}{line.type === 'monthly' ? <span className="text-white/45 font-normal">/mo</span> : null}
          </p>
          <p className="text-xs text-white/50 inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {line.type === 'monthly' ? `Starts ${line.startedAt}` : `Billed ${line.startedAt}`}
            {line.endedAt && <> · ended {line.endedAt}</>}
            {isFuture && <span className="ml-1 text-orange/85 font-semibold">future</span>}
            {!isActive && !isFuture && <span className="ml-1 text-white/35">inactive</span>}
          </p>
        </div>
        <button onClick={() => setEditing(true)} className="text-xs text-white/55 hover:text-white px-2 py-1">Edit</button>
        <button onClick={onRemove} className="text-white/40 hover:text-error p-1.5" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </li>
    );
  }

  const commit = () => {
    const amt = Math.round(Number(amount.replace(/[^0-9.]/g, '')) * 100);
    onSave({
      amountCents: amt,
      startedAt: start,
      endedAt: end || null,
    });
    setEditing(false);
  };

  return (
    <li className="rounded-lg border border-orange/40 bg-orange/[0.04] px-3 py-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
        <input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} />
        <input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} placeholder="End (optional)" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setEditing(false)} className="text-xs text-white/55 hover:text-white px-3 py-1.5">Cancel</button>
        <button onClick={commit} className="btn-primary !py-1.5 !px-3 text-xs">Save</button>
      </div>
    </li>
  );
}
