export default {
  // Line width
  printWidth: 100,

  // Semicolons
  semi: true,

  // Quotes
  singleQuote: true,

  // Trailing commas
  trailingComma: 'es5',

  // Tabs vs spaces
  useTabs: false,
  tabWidth: 2,

  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow function parentheses
  arrowParens: 'always',

  // End of line
  endOfLine: 'lf',

  // Quote props
  quoteProps: 'as-needed',

  // JSX quotes
  jsxSingleQuote: true,

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // File specific overrides
  overrides: [
    {
      files: '*.{md,yaml,yml}',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
        printWidth: 120,
      },
    },
    {
      files: '*.{ts,tsx}',
      options: {
        parser: 'typescript',
      },
    },
  ],
};
