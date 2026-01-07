import { createRequire } from "module";
const require = createRequire(import.meta.url);
const baseConfig = require("./packages/eslint-config/base.js");

/** @type {import("eslint").Linter.Config[]} */
export default [
  baseConfig,
  {
    ignores: ["**/node_modules/**", "**/.dist/**", "**/.next/**", "**/.turbo/**"]
  }
];
