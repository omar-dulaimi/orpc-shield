/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Test patterns
    include: ['test/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules/**', 'dist/**', 'package/**', 'example/**', '**/*.d.ts'],

    // Global setup
    globals: true,
    clearMocks: true,
    restoreMocks: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts}',
        'src/**/*.spec.{js,ts}',
        'test/**',
        'dist/**',
        'node_modules/**',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },

    // Test timeout (useful for async rule testing)
    testTimeout: 10000,

    // Retry configuration for flaky async tests
    retry: 1,

    // Reporter configuration
    reporters: ['verbose'],

    // Watch configuration
    watch: false,

    // Pool options for parallel testing
    pool: 'forks',
    poolOptions: {
      forks: {
        // Use available CPU cores for testing
        minForks: 1,
        maxForks: 4,
      },
    },

    // TypeScript configuration
    typecheck: {
      enabled: false, // We use tsc for type checking separately
    },

    // Server configuration
    server: {
      deps: {
        // Allow mocking of node modules
        external: [],
      },
    },

    // Setup files
    setupFiles: [],
  },

  // Resolve configuration for imports
  resolve: {
    alias: {
      '@': './src',
      '@test': './test',
    },
  },

  // Define configuration for constants
  define: {
    __TEST__: true,
  },

  // ESBuild configuration for faster transpilation
  esbuild: {
    target: 'node18',
    format: 'esm',
  },
});
