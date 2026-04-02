import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Ignore compiled output
  { ignores: ['dist/**'] },

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  {
    rules: {
      // Unused vars are bugs — underscore prefix opts out (e.g. _parent)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // `any` makes TypeScript useless — warn to keep it visible, not hard-block
      '@typescript-eslint/no-explicit-any': 'warn',

      // Empty catch blocks silently swallow errors — require a comment or rethrow
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  }
)
