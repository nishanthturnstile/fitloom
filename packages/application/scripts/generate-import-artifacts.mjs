import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { importJSONSchemas } from "../dist/import-contracts.js";
import {
  createImportManifest,
  importTemplate,
} from "../dist/import-formats.js";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";

const directory = new URL("../../../apps/web/public/imports/", import.meta.url);
await mkdir(directory, { recursive: true });
const manifest = createImportManifest(
  "body_v1",
  { kind: "body", bundleVersion: "body-core-v1" },
  bodyCoreV1(),
);
for (const [name, schema] of Object.entries(importJSONSchemas()))
  await writeFile(
    new URL(`${name}.schema.json`, directory),
    JSON.stringify(schema, null, 2) + "\n",
  );
await writeFile(
  new URL("body-core-v1.manifest.json", directory),
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  new URL("fitloom-customers-v1.csv", directory),
  importTemplate("customers"),
);
await writeFile(
  new URL("fitloom-measurements-v1.csv", directory),
  importTemplate("measurements", manifest),
);
console.log(
  "Generated closed JSON Schemas, both CSV templates and the pinned body manifest.",
);

execFileSync(
  "pnpm",
  ["exec", "biome", "format", "--write", fileURLToPath(directory)],
  { stdio: "inherit" },
);
