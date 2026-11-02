import { z } from "zod";
import {
  type GarmentDefinition,
  garmentDefinition,
  garmentVersionId,
  MASTER_ILLUSTRATIONS,
  MASTER_REQUEST_BYTES,
  type SchemaNodeId,
  schemaNodeId,
} from "./master-contracts.js";

// Signatures contain immutable meaning only. Cosmetic edits keep their identities.
export function definitionIdentities(definition: GarmentDefinition) {
  const nodes: {
    id: SchemaNodeId;
    signature: string;
    path: (string | number)[];
  }[] = [];
  definition.sections.forEach((s, i) => {
    nodes.push({ id: s.id, signature: "section", path: ["sections", i, "id"] });
  });
  definition.fields.forEach((f, i) => {
    const signature = JSON.stringify([
      "field",
      f.kind,
      f.semanticId,
      f.kind === "length" ? f.basis : null,
      f.kind === "number" ? f.unit : null,
    ]);
    nodes.push({ id: f.id, signature, path: ["fields", i, "id"] });
    if (f.kind === "select")
      f.choices.forEach((c, n) => {
        nodes.push({
          id: c.id,
          signature: JSON.stringify(["option", "field", f.id]),
          path: ["fields", i, "choices", n, "id"],
        });
      });
  });
  definition.constructionGroups.forEach((g, i) => {
    nodes.push({
      id: g.id,
      signature: JSON.stringify(["group", g.kind]),
      path: ["constructionGroups", i, "id"],
    });
    g.choices.forEach((c, n) => {
      nodes.push({
        id: c.id,
        signature: JSON.stringify(["option", "group", g.id]),
        path: ["constructionGroups", i, "choices", n, "id"],
      });
    });
  });
  return nodes;
}
export const schemaIdentityRecord = z.strictObject({
  nodeId: schemaNodeId,
  signature: z.string().max(300),
  retiredRevision: z.int().positive().nullable(),
});
export type SchemaIdentityRecord = z.infer<typeof schemaIdentityRecord>;

// The persistence layer supplies the registry for this tenant and garment only.
// This check supplements the independent restricted SQL lineage validator.
export function identityIssues(
  definition: GarmentDefinition,
  registry: readonly SchemaIdentityRecord[],
) {
  const registered = new Map(registry.map((node) => [node.nodeId, node]));
  return definitionIdentities(definition)
    .flatMap((node) => {
      const previous = registered.get(node.id);
      if (
        previous?.retiredRevision !== null &&
        previous?.retiredRevision !== undefined
      )
        return [
          { path: node.path, message: "Retired identity requires a fresh ID" },
        ];
      if (previous && previous.signature !== node.signature)
        return [
          { path: node.path, message: "Changed meaning requires a fresh ID" },
        ];
      return [];
    })
    .slice(0, 30);
}

export function copyHistoricalDefinition(input: {
  definition: GarmentDefinition;
  sourceVersionId: string;
  registry: readonly SchemaIdentityRecord[];
  newId: () => string;
}): GarmentDefinition {
  const replacements = new Map<SchemaNodeId, SchemaNodeId>();
  for (const node of definitionIdentities(input.definition)) {
    const previous = input.registry.find((record) => record.nodeId === node.id);
    if (
      !previous ||
      previous.retiredRevision !== null ||
      previous.signature !== node.signature
    )
      replacements.set(node.id, schemaNodeId.parse(input.newId()));
  }
  // An option's owner is part of its meaning, so replacing its parent also replaces it.
  for (const field of input.definition.fields)
    if (field.kind === "select" && replacements.has(field.id))
      for (const choice of field.choices)
        if (!replacements.has(choice.id))
          replacements.set(choice.id, schemaNodeId.parse(input.newId()));
  for (const group of input.definition.constructionGroups)
    if (replacements.has(group.id))
      for (const choice of group.choices)
        if (!replacements.has(choice.id))
          replacements.set(choice.id, schemaNodeId.parse(input.newId()));
  const id = (original: SchemaNodeId) => replacements.get(original) ?? original;
  return garmentDefinition.parse({
    ...input.definition,
    sourceVersionId: garmentVersionId.parse(input.sourceVersionId),
    sections: input.definition.sections.map((s) => ({ ...s, id: id(s.id) })),
    fields: input.definition.fields.map((f) => ({
      ...f,
      id: id(f.id),
      sectionId: id(f.sectionId),
      ...(f.kind === "select"
        ? { choices: f.choices.map((c) => ({ ...c, id: id(c.id) })) }
        : {}),
    })),
    constructionGroups: input.definition.constructionGroups.map((g) => ({
      ...g,
      id: id(g.id),
      choices: g.choices.map((c) => ({ ...c, id: id(c.id) })),
    })),
  });
}

// This is an estimate, not the authoritative PostgreSQL JSONB text budget.
export function estimatedDefinitionBytes(
  definition: GarmentDefinition,
): number {
  return new TextEncoder().encode(JSON.stringify(definition)).byteLength;
}
export function masterRequestFits(request: unknown): boolean {
  return (
    new TextEncoder().encode(JSON.stringify(request)).byteLength <=
    MASTER_REQUEST_BYTES
  );
}
export function resolveGarmentRate(input: {
  baseRate: string | null;
  rateOverride: string | null;
}): string | null {
  return input.rateOverride ?? input.baseRate;
}
const illustration = (
  id: keyof typeof MASTER_ILLUSTRATIONS | null,
  label: string,
) => (id === null ? { src: null, alt: label } : MASTER_ILLUSTRATIONS[id]);

// Ordered, value-free rendering model shared by unsaved and historical previews.
// No wearer values, rates, current add-on prices, or permission decisions live here.
export function garmentPreview(input: unknown) {
  const definition = garmentDefinition.parse(input);
  return {
    label: definition.label,
    guidance: definition.help,
    illustration: illustration(definition.iconId, definition.label),
    guidanceIllustration: illustration(
      definition.illustrationId,
      definition.label,
    ),
    emptyMessage:
      definition.fields.length === 0 ? "No dimensions are required." : null,
    sections: definition.sections.map((section) => ({
      ...section,
      fields: definition.fields
        .filter((field) => field.sectionId === section.id)
        .map((field) => ({
          ...field,
          illustration: illustration(field.illustrationId, field.label),
          ...(field.kind === "select"
            ? {
                choices: field.choices.map((choice) => ({
                  ...choice,
                  illustration: illustration(
                    choice.illustrationId,
                    choice.label,
                  ),
                })),
              }
            : {}),
        })),
    })),
    constructionGroups: definition.constructionGroups.map((group) => ({
      ...group,
      illustration: illustration(group.illustrationId, group.label),
      choices: group.choices.map((choice) => ({
        ...choice,
        illustration: illustration(choice.illustrationId, choice.label),
      })),
    })),
  };
}
