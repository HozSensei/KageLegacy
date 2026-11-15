module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
    'prefer-arrow-callback': 'warn',
    'arrow-body-style': ['warn', 'as-needed'],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-trailing-spaces': 'warn',
    'comma-dangle': ['warn', 'always-multiline'],
    semi: ['error', 'always'],
    quotes: ['warn', 'single', { avoidEscape: true }],
  },
};
