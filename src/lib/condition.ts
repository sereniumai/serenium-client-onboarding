import type { Submission, OrganizationService, ServiceKey } from '../types';

// Structured conditional expression used for both fields and modules.
// `field`         sibling within same module (requires a prefix resolved to "svc.mod")
// `path`          fully-qualified "svc.mod.field" or bare "field"
// `serviceEnabled` truthy when the given service is enabled for this org, used
//                 to hide modules that become redundant once a service is active
export type AtomCondition =
  | { field: string; op: 'eq' | 'neq' | 'includes'; value: string }
  | { path: string;  op: 'eq' | 'neq' | 'includes'; value: string }
  | { serviceEnabled: ServiceKey; expected: boolean };

export type Condition =
  | AtomCondition
  | { all: Condition[] }
  | { any: Condition[] };

export interface EvaluateContext {
  services?: OrganizationService[];
}

/**
 * Evaluate a condition against a set of submissions (+ optional context).
 *
 * Pass the caller's current submissions (usually via useSubmissions). Keeping
 * this pure makes it trivial to memoize and testable in isolation.
 */
export function evaluate(
  cond: Condition,
  submissions: Submission[],
  contextPrefix?: string,
  ctx?: EvaluateContext,
): boolean {
  if ('all' in cond) return cond.all.every(c => evaluate(c, submissions, contextPrefix, ctx));
  if ('any' in cond) return cond.any.some(c => evaluate(c, submissions, contextPrefix, ctx));

  if ('serviceEnabled' in cond) {
    const isEnabled = (ctx?.services ?? []).some(s => s.serviceKey === cond.serviceEnabled);
    return isEnabled === cond.expected;
  }

  let key: string;
  if ('field' in cond) {
    key = contextPrefix ? `${contextPrefix}.${cond.field}` : cond.field;
  } else {
    key = cond.path.includes('.') ? cond.path : (contextPrefix ? `${contextPrefix}.${cond.path}` : cond.path);
  }

  const sub = submissions.find(s => s.fieldKey === key);
  const value = sub?.value;
  switch (cond.op) {
    case 'eq':       return value === cond.value;
    case 'neq':      return value !== cond.value;
    case 'includes': return Array.isArray(value) && (value as unknown[]).includes(cond.value);
  }
}
