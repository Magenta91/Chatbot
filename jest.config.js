module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/node_modules/**',
    '!server/tests/**',
    '!server/server.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/server/tests/setup.js'],
  testTimeout: 30000,
  verbose: true
};