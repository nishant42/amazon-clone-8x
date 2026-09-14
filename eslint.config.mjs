// ESLint 9 flat config. Next 16 removed `next lint`, and eslint-config-next 16
// ships its exports as flat-config arrays (Linter.Config[]), so these are spread
// directly - no @eslint/eslintrc FlatCompat shim is needed.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "out/**", "build/**", "node_modules/**"],
  },
];

export default eslintConfig;
