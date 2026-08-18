/**
 * Config ESLint base (API e pacotes TS). O app web usa `next lint`
 * (apps/web/.eslintrc.json). `prettier` desativa regras de formatação
 * conflitantes — a formatação fica a cargo do Prettier.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: { node: true, es2022: true, jest: true },
  ignorePatterns: ['dist', '.next', 'node_modules', 'coverage', '**/*.js', '**/*.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': 'off',
  },
};
