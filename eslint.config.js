import eslintConfigPrettier from "eslint-config-prettier";
import astro from "eslint-plugin-astro";
import perfectionist from "eslint-plugin-perfectionist";

export default [
  perfectionist.configs["recommended-natural"],
  ...astro.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".astro/",
      ".wrangler/",
      "drizzle/",
      "*.d.ts",
      "astro-auth.db",
      ".DS_Store"
    ]
  },
  {
    rules: {
      "perfectionist/sort-exports": [
        "error",
        {
          order: "asc",
          type: "natural"
        }
      ],
      "perfectionist/sort-imports": [
        "error",
        {
          customGroups: [],
          environment: "node",
          groups: [
            "type-import",
            ["value-builtin", "value-external"],
            "type-internal",
            "value-internal",
            ["type-parent", "type-sibling", "type-index"],
            ["value-parent", "value-sibling", "value-index"],
            "ts-equals-import",
            "unknown"
          ],
          internalPattern: ["^~/.+", "^@/.+"],
          newlinesBetween: "always",
          order: "asc",
          partitionByComment: false,
          partitionByNewLine: false,
          type: "natural"
        }
      ],
      "perfectionist/sort-interfaces": [
        "error",
        {
          order: "asc",
          type: "natural"
        }
      ],
      "perfectionist/sort-named-imports": [
        "error",
        {
          ignoreCase: true,
          order: "asc",
          type: "natural"
        }
      ],
      "perfectionist/sort-objects": [
        "error",
        {
          order: "asc",
          type: "natural"
        }
      ]
    },
    settings: {
      perfectionist: {
        partitionByComment: true,
        type: "natural"
      }
    }
  }
];
