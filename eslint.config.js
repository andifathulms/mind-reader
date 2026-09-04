import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'No network at runtime (PRD 7.5).' },
      ],
    },
  },
  {
    // The engine is pure: no DOM, no React, no ambient clock (CLAUDE.md 5).
    files: ['src/engine/**/*.ts', 'src/stats/**/*.ts', 'src/strategies/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Seeded PRNG only (CLAUDE.md 4).' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'The engine is pure.' },
        { name: 'document', message: 'The engine is pure.' },
        { name: 'fetch', message: 'No network at runtime.' },
      ],
    },
  },
);
