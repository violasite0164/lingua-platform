import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "coverage/**",
      "supabase/**",
      "public/**",
      ".npm-cache/**",
      "*.mdgit",
      "tsconfig.tsbuildinfo",
    ],
  },
];

export default config;
