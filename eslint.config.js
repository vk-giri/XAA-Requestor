import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["node_modules/**", "web/dist/**", "package-lock.json"] },
  js.configs.recommended,
  {
    files: ["server/**/*.js", "*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ["web/**/*.{ts,tsx}"],
  })),
  {
    files: ["web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
