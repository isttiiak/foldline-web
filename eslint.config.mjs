import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // CLAUDE.md hard rule 5: only src/lib/auth.ts may call supabase.auth.*
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/auth.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=auth][object.name=/^supabase/]",
          message:
            "Use the helpers in src/lib/auth.ts instead of supabase.auth.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
    "src/lib/supabase/database.types.ts",
  ]),
]);

export default eslintConfig;
