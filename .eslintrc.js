module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: './tsconfig.json',
    sourceType: "module"
  },
  env: {
    commonjs: true,
    mocha: true
  },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
    "plugin:prettier/recommended"
  ],
  rules: {
    "prettier/prettier": ["error"],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  }
};
