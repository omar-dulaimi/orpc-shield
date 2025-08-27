export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enumeration
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'chore', // Maintenance tasks
        'ci', // CI/CD changes
        'build', // Build system changes
        'revert', // Reverting changes
      ],
    ],

    // Type case
    'type-case': [2, 'always', 'lower-case'],

    // Type empty
    'type-empty': [2, 'never'],

    // Subject case
    'subject-case': [2, 'always', 'lower-case'],

    // Subject empty
    'subject-empty': [2, 'never'],

    // Subject full stop
    'subject-full-stop': [2, 'never', '.'],

    // Subject max length
    'subject-max-length': [2, 'always', 72],

    // Subject min length
    'subject-min-length': [2, 'always', 3],

    // Body leading blank
    'body-leading-blank': [2, 'always'],

    // Body max line length
    'body-max-line-length': [2, 'always', 100],

    // Footer leading blank
    'footer-leading-blank': [2, 'always'],

    // Footer max line length
    'footer-max-line-length': [2, 'always', 100],

    // Header max length
    'header-max-length': [2, 'always', 72],

    // Scope case
    'scope-case': [2, 'always', 'lower-case'],

    // Scope max length
    'scope-max-length': [2, 'always', 20],

    // Custom rules for this project
    'scope-enum': [
      2,
      'always',
      [
        'core', // Core shield functionality
        'rule', // Rule-related changes
        'operators', // Logic operators
        'middleware', // Middleware functionality
        'types', // TypeScript types
        'test', // Test-related changes
        'example', // Example application
        'docs', // Documentation
        'config', // Configuration files
        'deps', // Dependencies
        'release', // Release-related changes
      ],
    ],
  },

  // Custom parsing options
  parserPreset: {
    parserOpts: {
      // Allow references to issues/PRs
      issuePrefixes: ['#', 'gh-'],
    },
  },

  // Ignore patterns for certain commits
  ignores: [
    // Ignore merge commits
    (message) => message.includes('Merge'),
    // Ignore revert commits (they have their own format)
    (message) => message.includes('Revert'),
    // Ignore release commits from semantic-release
    (message) => message.includes('chore(release)'),
  ],

  // Default ignore rules
  defaultIgnores: true,

  // Help URL for commit format
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',

  // Prompt configuration (if using commitizen)
  prompt: {
    settings: {},
    messages: {
      type: "Select the type of change that you're committing:",
      scope: 'What is the scope of this change (e.g. component or file name):',
      customScope: 'Denote the SCOPE of this change:',
      subject: 'Write a SHORT, IMPERATIVE tense description of the change:\n',
      body: 'Provide a LONGER description of the change (optional). Use "|" to break new line:\n',
      breaking: 'List any BREAKING CHANGES (optional). Use "|" to break new line:\n',
      footerPrefixSelect: "Select the type of change that you're committing (optional):",
      customFooterPrefix: 'Input ISSUES type:',
      footer: 'List any ISSUES by this change (optional). E.g.: #31, #34:\n',
      confirmCommit: 'Are you sure you want to proceed with the commit above?',
    },
    types: [
      { value: 'feat', name: 'feat:     A new feature', emoji: '✨' },
      { value: 'fix', name: 'fix:      A bug fix', emoji: '🐛' },
      { value: 'docs', name: 'docs:     Documentation only changes', emoji: '📚' },
      {
        value: 'style',
        name: 'style:    Changes that do not affect the meaning of the code',
        emoji: '💎',
      },
      {
        value: 'refactor',
        name: 'refactor: A code change that neither fixes a bug nor adds a feature',
        emoji: '📦',
      },
      { value: 'perf', name: 'perf:     A code change that improves performance', emoji: '🚀' },
      {
        value: 'test',
        name: 'test:     Adding missing tests or correcting existing tests',
        emoji: '🚨',
      },
      {
        value: 'chore',
        name: "chore:    Other changes that don't modify src or test files",
        emoji: '⚙️',
      },
      {
        value: 'ci',
        name: 'ci:       Changes to our CI configuration files and scripts',
        emoji: '🔧',
      },
      {
        value: 'build',
        name: 'build:    Changes that affect the build system or external dependencies',
        emoji: '🛠',
      },
      { value: 'revert', name: 'revert:   Reverts a previous commit', emoji: '🗑' },
    ],
    useEmoji: false,
    allowCustomScopes: true,
    allowEmptyScopes: true,
    customScopesAlign: 'bottom',
    allowBreakingChanges: ['feat', 'fix'],
    breaklineChar: '|',
    skipQuestions: [],
  },
};
