/**
 * Tests for rule constructors and built-in rules
 */
import { describe, expect, it } from 'vitest';
import { allow, allowAll, deny, denyWithMessage, rule } from '../src/rule.js';
import { TestPaths, createTestContext } from './helpers/setup.js';
import type { TestContext } from './helpers/setup.js';

describe('rule constructor', () => {
  it('should create a rule from a resolver function', async () => {
    const testRule = rule<TestContext>()((params) => {
      return params.ctx.isAuthenticated;
    });

    expect(testRule).toBeDefined();
    expect(typeof testRule.resolve).toBe('function');
  });

  it('should handle sync resolver functions', async () => {
    const testRule = rule<TestContext>()(() => true);
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle async resolver functions', async () => {
    const testRule = rule<TestContext>()(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return true;
    });
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should pass correct parameters to resolver', async () => {
    let receivedParams: any;
    const testRule = rule<TestContext>()((params) => {
      receivedParams = params;
      return true;
    });

    const context = createTestContext({ isAuthenticated: true });
    const path = TestPaths.users.create;
    const input = { name: 'test' };

    await testRule.resolve({ ctx: context, path, input });

    expect(receivedParams).toEqual({
      ctx: context,
      path,
      input,
    });
  });

  it('should handle resolver that returns boolean true', async () => {
    const testRule = rule<TestContext>()(() => true);
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle resolver that returns boolean false', async () => {
    const testRule = rule<TestContext>()(() => false);
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(false);
  });

  it('should handle resolver that returns string error', async () => {
    const errorMessage = 'Custom error message';
    const testRule = rule<TestContext>()(() => errorMessage);
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(errorMessage);
  });

  it('should handle resolver that returns Error object', async () => {
    const error = new Error('Custom error');
    const testRule = rule<TestContext>()(() => error);
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(error);
  });

  it('should catch and convert thrown errors to Error objects', async () => {
    const testRule = rule<TestContext>()(() => {
      throw new Error('Thrown error');
    });
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Thrown error');
  });

  it('should convert thrown non-Error values to Error objects', async () => {
    const testRule = rule<TestContext>()(() => {
      throw 'String error';
    });
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('String error');
  });

  it('should catch async errors', async () => {
    const testRule = rule<TestContext>()(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error('Async error');
    });
    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Async error');
  });

  it('should handle complex context and input types', async () => {
    interface CustomInput {
      userId: string;
      action: string;
    }

    const testRule = rule<TestContext, CustomInput>()((params) => {
      return params.ctx.user?.id === params.input.userId;
    });

    const context = createTestContext({
      user: { id: 'user123', role: 'user', isActive: true },
      isAuthenticated: true,
    });

    const input: CustomInput = { userId: 'user123', action: 'update' };

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.update,
      input,
    });

    expect(result).toBe(true);
  });
});

describe('built-in rules', () => {
  describe('allow', () => {
    it('should always return true', async () => {
      const context = createTestContext();

      const result = await allow.resolve({
        ctx: context,
        path: TestPaths.users.list,
        input: {},
      });

      expect(result).toBe(true);
    });

    it('should work with any context type', async () => {
      const result = await allow.resolve({
        ctx: { custom: 'data' },
        path: ['any', 'path'],
        input: { any: 'input' },
      });

      expect(result).toBe(true);
    });
  });

  describe('deny', () => {
    it('should always return an Error', async () => {
      const context = createTestContext();

      const result = await deny.resolve({
        ctx: context,
        path: TestPaths.users.list,
        input: {},
      });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('Access denied');
    });

    it('should work with any context type', async () => {
      const result = await deny.resolve({
        ctx: { custom: 'data' },
        path: ['any', 'path'],
        input: { any: 'input' },
      });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('Access denied');
    });
  });

  describe('denyWithMessage', () => {
    it('should return an Error with custom message', async () => {
      const customMessage = 'Custom denial message';
      const customDeny = denyWithMessage(customMessage);
      const context = createTestContext();

      const result = await customDeny.resolve({
        ctx: context,
        path: TestPaths.users.list,
        input: {},
      });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe(customMessage);
    });

    it('should create different instances for different messages', async () => {
      const deny1 = denyWithMessage('Message 1');
      const deny2 = denyWithMessage('Message 2');

      expect(deny1).not.toBe(deny2);

      const context = createTestContext();

      const result1 = await deny1.resolve({
        ctx: context,
        path: TestPaths.users.list,
        input: {},
      });

      const result2 = await deny2.resolve({
        ctx: context,
        path: TestPaths.users.list,
        input: {},
      });

      expect((result1 as Error).message).toBe('Message 1');
      expect((result2 as Error).message).toBe('Message 2');
    });
  });

  describe('allowAll', () => {
    it('should return the same allow rule', () => {
      const allowAllRule = allowAll();
      expect(allowAllRule).toBe(allow);
    });

    it('should always return true when resolved', async () => {
      const allowAllRule = allowAll();
      const context = createTestContext();

      const result = await allowAllRule.resolve({
        ctx: context,
        path: TestPaths.users.list,
        input: {},
      });

      expect(result).toBe(true);
    });
  });
});

describe('rule type inference', () => {
  it('should infer context type correctly', async () => {
    interface CustomContext {
      userId: string;
      role: 'admin' | 'user';
    }

    const testRule = rule<CustomContext>()((params) => {
      // TypeScript should infer params.ctx as CustomContext
      return params.ctx.role === 'admin';
    });

    const context: CustomContext = { userId: '123', role: 'admin' };

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should infer input type correctly', async () => {
    interface CustomInput {
      resourceId: string;
      action: string;
    }

    const testRule = rule<TestContext, CustomInput>()((params) => {
      // TypeScript should infer params.input as CustomInput
      return params.input.action === 'read';
    });

    const context = createTestContext();
    const input: CustomInput = { resourceId: '123', action: 'read' };

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input,
    });

    expect(result).toBe(true);
  });
});

describe('rule edge cases', () => {
  it('should handle undefined input', async () => {
    const testRule = rule<TestContext>()((params) => {
      return params.input === undefined;
    });

    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: undefined,
    });

    expect(result).toBe(true);
  });

  it('should handle null input', async () => {
    const testRule = rule<TestContext>()((params) => {
      return params.input === null;
    });

    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: null,
    });

    expect(result).toBe(true);
  });

  it('should handle empty path', async () => {
    const testRule = rule<TestContext>()((params) => {
      return params.path.length === 0;
    });

    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: [],
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle very long paths', async () => {
    const longPath = Array(100).fill('segment');
    const testRule = rule<TestContext>()((params) => {
      return params.path.length === 100;
    });

    const context = createTestContext();

    const result = await testRule.resolve({
      ctx: context,
      path: longPath,
      input: {},
    });

    expect(result).toBe(true);
  });
});
