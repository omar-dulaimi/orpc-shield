/**
 * Common test rules for oRPC Shield testing
 */
import { allow, deny, rule } from '../../src/rule.js';
import type { TestContext } from './setup.js';

/**
 * Rule that checks if user is authenticated
 */
export const isAuthenticated = rule<TestContext>()((params) => {
  return params.ctx.isAuthenticated;
});

/**
 * Rule that checks if user is an admin
 */
export const isAdmin = rule<TestContext>()((params) => {
  return params.ctx.user?.role === 'admin';
});

/**
 * Rule that checks if user is active
 */
export const isActiveUser = rule<TestContext>()((params) => {
  return params.ctx.user?.isActive === true;
});

/**
 * Rule that checks if user has a specific permission
 */
export function hasPermission(permission: string) {
  return rule<TestContext>()((params) => {
    return params.ctx.permissions?.includes(permission) === true;
  });
}

/**
 * Rule that checks if user owns a resource (based on userId in input)
 */
export const isOwner = rule<TestContext, { userId?: string }>()((params) => {
  const { ctx, input } = params;
  if (!ctx.user?.id || !input?.userId) {
    return new Error('Missing user ID or resource owner ID');
  }
  return ctx.user.id === input.userId;
});

/**
 * Rule that checks if user can access their own resource or is admin
 */
export const isOwnerOrAdmin = rule<TestContext, { userId?: string }>()((params) => {
  const { ctx, input } = params;

  // Admin can access everything
  if (ctx.user?.role === 'admin') {
    return true;
  }

  // User can access their own resources
  if (ctx.user?.id && input?.userId && ctx.user.id === input.userId) {
    return true;
  }

  return new Error('Access denied: not owner or admin');
});

/**
 * Rule that always throws an error (for testing error handling)
 */
export const throwsError = rule<TestContext>()(() => {
  throw new Error('Test error from rule');
});

/**
 * Rule that returns a string error message
 */
export const returnsStringError = rule<TestContext>()(() => {
  return 'String error message';
});

/**
 * Rule that returns false
 */
export const returnsFalse = rule<TestContext>()(() => {
  return false;
});

/**
 * Rule that returns an Error object
 */
export const returnsErrorObject = rule<TestContext>()(() => {
  return new Error('Error object message');
});

/**
 * Async rule that resolves to true after a delay
 */
export const asyncAllow = rule<TestContext>()(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  return true;
});

/**
 * Async rule that resolves to false after a delay
 */
export const asyncDeny = rule<TestContext>()(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  return false;
});

/**
 * Async rule that throws an error after a delay
 */
export const asyncThrowsError = rule<TestContext>()(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('Async error');
});

/**
 * Rule that checks path-specific permissions
 */
export const pathBasedRule = rule<TestContext>()((params) => {
  const { path, ctx } = params;

  // Admin can access admin paths
  if (path[0] === 'admin' && ctx.user?.role === 'admin') {
    return true;
  }

  // Authenticated users can access user paths
  if (path[0] === 'users' && ctx.isAuthenticated) {
    return true;
  }

  // Public access to posts list
  if (path[0] === 'posts' && path[1] === 'list') {
    return true;
  }

  return new Error(`Access denied for path: ${path.join('.')}`);
});

/**
 * Rule that validates input structure
 */
export const requiresValidInput = rule<TestContext, { id?: string; name?: string }>()((params) => {
  const { input } = params;

  if (!input) {
    return new Error('Input is required');
  }

  if (!input.id) {
    return new Error('Input must have an id field');
  }

  if (!input.name) {
    return new Error('Input must have a name field');
  }

  return true;
});

/**
 * Rule that checks rate limiting (mock implementation)
 */
export const rateLimited = rule<TestContext>()((params) => {
  const { ctx } = params;

  // Simple mock: deny if user made too many requests
  if (ctx.user?.id === 'rate-limited-user') {
    return new Error('Rate limit exceeded');
  }

  return true;
});

/**
 * Rule that depends on external service (mock)
 */
export const externalServiceCheck = rule<TestContext>()((params) => {
  const { ctx } = params;

  // Mock external service call
  if (ctx.user?.id === 'external-fail') {
    throw new Error('External service unavailable');
  }

  if (ctx.user?.id === 'external-deny') {
    return new Error('External service denied access');
  }

  return true;
});

/**
 * Rule that checks business hours (mock implementation)
 */
export const businessHours = rule<TestContext>()(() => {
  const hour = new Date().getHours();

  // Business hours: 9 AM to 5 PM
  if (hour >= 9 && hour < 17) {
    return true;
  }

  return new Error('Access only allowed during business hours (9 AM - 5 PM)');
});

/**
 * Rule that checks resource quota
 */
export const withinQuota = rule<TestContext>()((params) => {
  const { ctx, path } = params;

  // Mock quota check
  if (path[1] === 'create' && ctx.user?.id === 'over-quota') {
    return new Error('Resource quota exceeded');
  }

  return true;
});

/**
 * Conditional rule that behaves differently based on context
 */
export function conditionalRule(condition: boolean) {
  return rule<TestContext>()(() => {
    return condition;
  });
}

/**
 * Rule that logs access attempts (for testing side effects)
 */
export const loggingRule = rule<TestContext>()((params) => {
  const { ctx, path } = params;

  // In real implementation, this would log to a service
  console.log(`Access attempt: User ${ctx.user?.id} accessing ${path.join('.')}`);

  return true;
});

// Export commonly used rule combinations
export const TestRules = {
  allow,
  deny,
  isAuthenticated,
  isAdmin,
  isActiveUser,
  isOwner,
  isOwnerOrAdmin,
  throwsError,
  returnsStringError,
  returnsFalse,
  returnsErrorObject,
  asyncAllow,
  asyncDeny,
  asyncThrowsError,
  pathBasedRule,
  requiresValidInput,
  rateLimited,
  externalServiceCheck,
  businessHours,
  withinQuota,
  loggingRule,
  hasPermission,
  conditionalRule,
} as const;
