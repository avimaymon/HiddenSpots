import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // react-hook-form and TanStack Virtual are known to be incompatible with
      // React Compiler memoization — cannot fix without replacing the libraries.
      "react-hooks/incompatible-library": "off",
      // shadcn/ui generated files use empty interface extensions.
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
]);

export default eslintConfig;
