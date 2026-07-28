import { describe, expect, it } from 'vitest';

import { rule, shield } from '../src/index.js';

type Ctx = { user?: { role: string }; permissions?: readonly string[] };

/**
 * The README documents returning `{ ctx }` from a rule to enrich the context for downstream
 * procedures, with two worked examples.
 *
 * Nothing implemented it. `RuleResult` did not admit the shape, and `processRuleResult` allowed only
 * `true`, so an object fell past every branch to `throw new ShieldError('Access denied')`. Following
 * the documentation denied the request rather than extending anything, and `next({ context })`
 * forwarded the original context regardless.
 */

/** Minimal stand-in for the oRPC middleware options; only these three fields are read. */
type MiddlewareOptions = {
  context: Ctx;
  path: readonly string[];
  next: (opts?: { context?: unknown }) => unknown;
};
type Invokable = (options: MiddlewareOptions) => Promise<unknown>;

async function runShield(
  permissions: Parameters<typeof shield<Ctx>>[0],
  context: Ctx
): Promise<unknown> {
  const middleware = shield<Ctx>(permissions) as unknown as Invokable;
  let seenContext: unknown;

  await middleware({
    context,
    path: ['post', 'list'],
    next: (opts) => {
      seenContext = opts?.context;
      return { output: undefined, context: opts?.context };
    },
  });

  return seenContext;
}

describe('context extension, as the README documents it', () => {
  const enrich = rule<Ctx>()(({ ctx }) => ({
    ctx: { ...ctx, permissions: ['read', 'write'] },
  }));

  it('allows the call rather than denying it', async () => {
    await expect(
      runShield({ post: { list: enrich } }, { user: { role: 'admin' } })
    ).resolves.toBeDefined();
  });

  it('passes the enriched context to the next middleware', async () => {
    const seen = (await runShield({ post: { list: enrich } }, { user: { role: 'admin' } })) as Ctx;

    expect(seen.permissions).toEqual(['read', 'write']);
  });

  it('leaves the context alone when a rule simply allows', async () => {
    const permit = rule<Ctx>()(() => true);
    const seen = (await runShield({ post: { list: permit } }, { user: { role: 'admin' } })) as Ctx;

    expect(seen.user?.role).toBe('admin');
    expect(seen.permissions).toBeUndefined();
  });

  it('still denies when a rule returns false', async () => {
    const deny = rule<Ctx>()(() => false);

    await expect(runShield({ post: { list: deny } }, {})).rejects.toThrow(/denied/i);
  });
});
