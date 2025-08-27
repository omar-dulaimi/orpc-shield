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
export type ORPCContext<T = any> = T;

/**
 * Input type for oRPC procedures
 */
export type ORPCInput<T = any> = T;

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
}

/**
 * oRPC Middleware function type
 */
export type ORPCMiddleware<TContext = ORPCContext> = (params: {
  context: TContext;
  next: (params: { context: TContext }) => Promise<any>;
  path: Path;
  input?: any;
}) => Promise<any>;
