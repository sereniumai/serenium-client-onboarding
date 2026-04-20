import { db } from './mockDb';

// Structured conditional expression used for both fields and modules.
// `field` = sibling within same module (requires a prefix resolved to "svc.mod")
// `path`  = fully-qualified "svc.mod.field" or bare "field"
export type AtomCondition =
  | { field: string; op: 'eq' | 'neq' | 'includes'; value: string }
  | { path: string;  op: 'eq' | 'neq' | 'includes'; value: string };

export type Condition =
  | AtomCondition
  | { all: Condition[] }
  | { any: Condition[] };

/** Evaluate a condition against the org's saved submissions. `contextPrefix` is "svc.mod" for sibling refs. */
export function evaluate(cond: Condition, orgId: string, contextPrefix?: string): boolean {
  if ('all' in cond) return cond.all.every(c => evaluate(c, orgId, contextPrefix));
  if ('any' in cond) return cond.any.some(c => evaluate(c, orgId, contextPrefix));

  let key: string;
  if ('field' in cond) {
    key = contextPrefix ? `${contextPrefix}.${cond.field}` : cond.field;
  } else {
    // Full path — if it's just "field", prefix it; otherwise use as-is.
    key = cond.path.includes('.') ? cond.path : (contextPrefix ? `${contextPrefix}.${cond.path}` : cond.path);
  }

  const sub = db.getSubmission(orgId, key);
  const value = sub?.value;
  switch (cond.op) {
    case 'eq':       return value === cond.value;
    case 'neq':      return value !== cond.value;
    case 'includes': return Array.isArray(value) && (value as unknown[]).includes(cond.value);
  }
}
