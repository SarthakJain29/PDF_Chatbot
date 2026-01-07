/** @type {import("eslint").Linter.Config} */
const baseConfig = require("./base.js");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...baseConfig,
  extends: [
    ...baseConfig.extends,
    "next/core-web-vitals",
    "prettier"
  ],
  env: {
    ...baseConfig.env,
    browser: true
  },
  parserOptions: {
    ...baseConfig.parserOptions,
    ecmaFeatures: {
      jsx: true
    }
  }
};
