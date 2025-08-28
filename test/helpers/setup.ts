/**
 * Test setup utilities and helpers for oRPC Shield tests
 */
import type {
  MiddlewareOptions,
  MiddlewareResult,
  ORPCContext,
  ORPCInput,
  ORPCMiddleware,
  Path,
} from '../../src/types.js';

/**
 * Mock context for testing
 */
export interface TestContext {
  user?: {
    id: string;
    role: 'super-admin' | 'admin' | 'moderator' | 'user' | 'guest';
    isActive: boolean;
  };
  isAuthenticated: boolean;
  permissions?: string[];
}

/**
 * Creates a test context with default values
 */
export function createTestContext(overrides: Partial<TestContext> = {}): TestContext {
  return {
    isAuthenticated: false,
    ...overrides,
  };
}

/**
 * Creates an authenticated user context
 */
export function createAuthenticatedContext(
  user: TestContext['user'] = { id: '1', role: 'user', isActive: true },
  permissions: string[] = []
): TestContext {
  return {
    user,
    isAuthenticated: true,
    permissions,
  };
}

/**
 * Creates an admin context
 */
export function createAdminContext(
  userId = 'admin-1',
  permissions: string[] = ['admin', 'read', 'write']
): TestContext {
  return {
    user: { id: userId, role: 'admin', isActive: true },
    isAuthenticated: true,
    permissions,
  };
}

/**
 * Mock oRPC middleware executor for testing
 */
export class MockMiddlewareExecutor<TContext = ORPCContext> {
  private middlewares: ORPCMiddleware<TContext>[] = [];

  /**
   * Adds a middleware to the execution chain
   */
  use(middleware: ORPCMiddleware<TContext>): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Executes all middlewares in sequence
   */
  async execute(params: {
    context: TContext;
    path: Path;
    input?: ORPCInput;
  }): Promise<{ success: boolean; result?: any; error?: Error }> {
    const { context, path, input = {} } = params;

    try {
      let currentContext = context;
      let result: any = { success: true, data: 'mock-result' };

      // Create the next function chain
      const createNext = (index: number) => {
        return ({ context: nextContext }: { context?: TContext } = {}) => {
          currentContext = nextContext ?? currentContext;
          if (index < this.middlewares.length - 1) {
            const nextOptions: MiddlewareOptions<TContext> = {
              context: currentContext,
              path,
              next: createNext(index + 1),
            };

            const _outputFn = (output: any): MiddlewareResult<TContext> => ({
              output,
              context: currentContext,
            });
            const result = this.middlewares[index + 1](nextOptions, input);
            return result instanceof Promise ? { output: result, context: currentContext } : result;
          }
          return { output: result, context: currentContext };
        };
      };

      // Create output function for final result

      const _outputFn = (output: any): MiddlewareResult<TContext> => ({
        output,
        context: currentContext,
      });

      if (this.middlewares.length > 0) {
        const options: MiddlewareOptions<TContext> = {
          context: currentContext,
          path,
          next: createNext(0),
        };
        const middlewareResult = await this.middlewares[0](options, input);
        result = middlewareResult.output;
        currentContext = middlewareResult.context;
      }

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}

/**
 * Creates a simple test procedure that returns success
 */
export function createTestProcedure(result: any = { success: true }) {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async () => result;
}

/**
 * Mock path utilities for testing
 */
export const TestPaths = {
  users: {
    list: ['users', 'list'] as Path,
    get: ['users', 'get'] as Path,
    create: ['users', 'create'] as Path,
    update: ['users', 'update'] as Path,
    delete: ['users', 'delete'] as Path,
  },
  posts: {
    list: ['posts', 'list'] as Path,
    get: ['posts', 'get'] as Path,
    create: ['posts', 'create'] as Path,
    update: ['posts', 'update'] as Path,
    delete: ['posts', 'delete'] as Path,
  },
  admin: {
    stats: ['admin', 'stats'] as Path,
    users: ['admin', 'users'] as Path,
  },
  nested: {
    deep: {
      path: ['nested', 'deep', 'path'] as Path,
    },
  },
} as const;

/**
 * Test inputs for various scenarios
 */
export const TestInputs = {
  user: {
    create: { name: 'John Doe', email: 'john@example.com' },
    update: { id: '1', name: 'Jane Doe' },
    delete: { id: '1' },
  },
  post: {
    create: { title: 'Test Post', content: 'Test content', authorId: '1' },
    update: { id: '1', title: 'Updated Post' },
    delete: { id: '1' },
  },
} as const;

/**
 * Utility to create a delay for testing async rules
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assertion helpers for test results
 */
export const TestAssertions = {
  /**
   * Asserts that a middleware execution was successful
   */
  expectSuccess(result: { success: boolean; result?: any; error?: Error }): void {
    if (!result.success) {
      throw new Error(`Expected success but got error: ${result.error?.message}`);
    }
  },

  /**
   * Asserts that a middleware execution failed with expected error
   */
  expectError(
    result: { success: boolean; result?: any; error?: Error },
    expectedMessage?: string
  ): void {
    if (result.success) {
      throw new Error('Expected error but middleware succeeded');
    }
    if (expectedMessage && result.error?.message !== expectedMessage) {
      throw new Error(
        `Expected error message "${expectedMessage}" but got "${result.error?.message}"`
      );
    }
  },

  /**
   * Asserts that an error has a specific type
   */
  expectErrorType(error: Error, expectedType: string): void {
    if (error.constructor.name !== expectedType) {
      throw new Error(`Expected error type ${expectedType} but got ${error.constructor.name}`);
    }
  },
};
