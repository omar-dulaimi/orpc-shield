/**
 * Path represents the procedure path as an array of strings.
 * For example: ['users', 'list'] or ['posts', 'update']
 */
export type Path = ReadonlyArray<string>;

/**
 * Result types for rule evaluation
 */
export type RuleResult = boolean | string | Error;

/**
 * Context type for oRPC middleware
 */
export type ORPCContext = import('@orpc/server').Context;

/**
 * Input type for oRPC procedures
 */
export type ORPCInput<T = unknown> = T;

type DefaultErrorMap = import('@orpc/server').ORPCErrorConstructorMap<Record<never, never>>;

/**
 * Rule resolver function signature for oRPC
 */
export type RuleResolver<TContext = ORPCContext, TInput = ORPCInput> = (params: {
  ctx: TContext;
  path: Path;
  input: TInput;
}) => Promise<RuleResult> | RuleResult;

/**
 * Base rule interface
 */
export interface IRule<TContext = ORPCContext, TInput = ORPCInput> {
  resolve(params: { ctx: TContext; path: Path; input: TInput }): Promise<RuleResult>;
}

/**
 * Rule tree type - can be nested for router structures
 */
export type IRules<TContext = ORPCContext, TInput = ORPCInput> = {
  [key: string]: IRule<TContext, TInput> | IRules<TContext, TInput>;
};

/**
 * Shield options interface
 */
export interface ShieldOptions<TContext = ORPCContext> {
  /**
   * Fallback rule when no rule is found for a path
   * @default allow (built-in rule that always returns true)
   */
  fallbackRule?: IRule<TContext>;

  /**
   * Whether to allow external errors to be thrown
   * @default true
   */
  allowExternalErrors?: boolean;

  /**
   * Enable debug mode for detailed logging
   * @default false
   */
  debug?: boolean;

  /**
   * Optional mapping to an ORPC error code when access is denied.
   * Example: 'FORBIDDEN' to surface HTTP 403 via adapters.
   */
  denyErrorCode?: ConstructorParameters<typeof import('@orpc/server').ORPCError>[0];
}

// Align middleware types with @orpc/server
export type MiddlewareOptions<
  TInContext extends import('@orpc/server').Context = import('@orpc/server').Context,
  TOutput = unknown,
  TErrorMap extends DefaultErrorMap = DefaultErrorMap,
  TMeta extends import('@orpc/server').Meta = import('@orpc/server').Meta,
> = import('@orpc/server').MiddlewareOptions<TInContext, TOutput, TErrorMap, TMeta>;

export type MiddlewareResult<
  TInContext extends import('@orpc/server').Context = import('@orpc/server').Context,
  TOutput = unknown,
> = import('@orpc/server').MiddlewareResult<TInContext, TOutput>;

export type ORPCMiddleware<
  TContext extends import('@orpc/server').Context = import('@orpc/server').Context,
  TInContext extends import('@orpc/server').Context = TContext,
  TInput = unknown,
  TOutput = unknown,
  TErrorMap extends DefaultErrorMap = DefaultErrorMap,
  TMeta extends import('@orpc/server').Meta = import('@orpc/server').Meta,
> = import('@orpc/server').Middleware<TContext, TInContext, TInput, TOutput, TErrorMap, TMeta>;

export type Context = ORPCContext;
