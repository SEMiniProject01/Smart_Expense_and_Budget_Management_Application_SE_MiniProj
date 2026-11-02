/**
 * jest.config.js — Jest configuration for SmartBudget backend tests
 * Uses CommonJS modules (matching "type": "commonjs" in package.json)
 * mongodb-memory-server handles the in-memory MongoDB instance automatically.
 */

module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  // Each test file gets its own fresh module registry so MongoDB connections
  // from db.js do not bleed between test suites
  resetModules: true,
  // Timeout for beforeAll (MongoMemoryServer startup can take a few seconds)
  testTimeout: 30000,
  // Verbose output so each test case name appears in the terminal
  verbose: true,
};
