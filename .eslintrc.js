module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off',
    'no-debugger': 'warn'
  },
  overrides: [
    {
      files: ['client/src/**/*.js', 'client/src/**/*.jsx'],
      env: {
        browser: true,
        es6: true
      },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
      ],
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      plugins: [
        'react',
        'react-hooks'
      ],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off'
      },
      settings: {
        react: {
          version: 'detect'
        }
      }
    }
  ]
};