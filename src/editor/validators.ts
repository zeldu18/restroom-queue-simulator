import type { Layout } from '../engine/types'


export interface RuleViolation { id:string; message:string; severity:'error'|'warn' }


export function validateLayout(layout: Layout): RuleViolation[] {
// TODO: implement code-rule checks (aisle widths, ADA stall, etc.)
return []
}