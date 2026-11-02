import type * as c from "@fitloom/application/master-contracts";
import { GroupEditor, type Issues, move, nodeId } from "../editor-controls";

export function ConstructionStep({
  definition,
  issues,
  onChange,
  announce,
}: {
  definition: c.GarmentDefinition;
  issues: Issues;
  onChange: (definition: c.GarmentDefinition) => void;
  announce: (message: string) => void;
}) {
  return (
    <div className="master-section">
      <h3>03 · Construction choices</h3>
      {definition.constructionGroups.map((group, index) => (
        <GroupEditor
          key={group.id}
          group={group}
          index={index}
          total={definition.constructionGroups.length}
          issues={issues}
          announce={announce}
          onChange={(next) =>
            onChange({
              ...definition,
              constructionGroups: definition.constructionGroups.map((g) =>
                g.id === group.id ? next : g,
              ),
            })
          }
          onRemove={() =>
            onChange({
              ...definition,
              constructionGroups: definition.constructionGroups.filter(
                (g) => g.id !== group.id,
              ),
            })
          }
          onMove={(d) => {
            onChange({
              ...definition,
              constructionGroups: move(definition.constructionGroups, index, d),
            });
            announce(`${group.label} moved to position ${index + d + 1}`);
          }}
        />
      ))}
      <button
        type="button"
        disabled={definition.constructionGroups.length >= 12}
        onClick={() =>
          onChange({
            ...definition,
            constructionGroups: [
              ...definition.constructionGroups,
              {
                id: nodeId(),
                kind: "single",
                label: "New construction group",
                required: false,
                help: "",
                illustrationId: null,
                choices: [
                  {
                    id: nodeId(),
                    label: "Plain",
                    illustrationId: null,
                    active: true,
                  },
                ],
              },
            ],
          })
        }
      >
        Add construction group
      </button>
    </div>
  );
}
