// Rule constructor and built-in rules
export { rule, allow, deny, denyWithMessage, allowAll } from './rule.js';

// Logic operators
export { and, or, not, chain, race } from './operators.js';

// Shield middleware
export { shield, shieldDebug, shieldForORPC, ShieldError } from './shield.js';

// Types
export type {
  IRule,
  IRules,
  Path,
  RuleResolver,
  RuleResult,
  ORPCContext,
  ORPCInput,
  ORPCMiddleware,
  ShieldOptions,
} from './types.js';
