import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginAstro from "eslint-plugin-astro";
import pluginReact from "eslint-plugin-react";

export default [
  {
    ignores: ["dist/", ".astro/"],
  },
  {
    ...pluginJs.configs.recommended,
    files: ["**/*.{js,mjs,cjs,jsx}"],
  },
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: {
      react: pluginReact,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReact.configs.flat["jsx-runtime"].rules,
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "no-unused-vars": "warn",
      "no-undef": "warn",
    },
  },
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          globalReturn: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
];
