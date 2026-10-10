import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// eslint-config-next already registers the jsx-a11y plugin; we switch on its full
// recommended rule set without registering the plugin twice.
const a11yRecommended = jsxA11y.flatConfigs.recommended.rules;

const config = [
  ...nextVitals,
  ...nextTs,
  { files: ["**/*.{ts,tsx}"], rules: { ...a11yRecommended } },
  { ignores: [".next/**", "node_modules/**", "public/**", "src/data/generated/**", "coverage/**", "next-env.d.ts"] },
];

export default config;
