import type * as c from "@fitloom/application/master-contracts";
import {
  Control,
  FieldEditor,
  type Issues,
  move,
  newField,
  nodeId,
  Ordered,
} from "../editor-controls";

export function MeasurementsStep({
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
      <h3>02 · Sections and dimensions</h3>
      <p className="master-muted">
        Changing a dimension's type or measurement meaning starts a new
        dimension. Earlier versions remain readable.
      </p>
      {definition.sections.map((section, index) => (
        <fieldset
          key={section.id}
          data-schema-node-id={section.id}
          className="master-node"
          aria-label={`Section ${index + 1}`}
        >
          <legend>Section {index + 1}</legend>
          <Ordered
            label={section.label || "section"}
            index={index}
            total={definition.sections.length}
            onMove={(d) => {
              onChange({
                ...definition,
                sections: move(definition.sections, index, d),
              });
              announce(`${section.label} moved to position ${index + d + 1}`);
            }}
            removeDisabled={definition.fields.some(
              (f) => f.sectionId === section.id,
            )}
            onRemove={() =>
              onChange({
                ...definition,
                sections: definition.sections.filter(
                  (s) => s.id !== section.id,
                ),
              })
            }
          />
          <Control
            label="Section label"
            path={["definition", "sections", index, "label"]}
            issues={issues}
          >
            {(props) => (
              <input
                {...props}
                value={section.label}
                maxLength={100}
                onChange={(e) =>
                  onChange({
                    ...definition,
                    sections: definition.sections.map((s) =>
                      s.id === section.id ? { ...s, label: e.target.value } : s,
                    ),
                  })
                }
              />
            )}
          </Control>
          {definition.fields.some((f) => f.sectionId === section.id) && (
            <small>
              Move or remove this section's dimensions before removing it.
            </small>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        disabled={definition.sections.length >= 10}
        onClick={() =>
          onChange({
            ...definition,
            sections: [
              ...definition.sections,
              { id: nodeId(), label: "New section" },
            ],
          })
        }
      >
        Add section
      </button>
      {definition.fields.map((field, index) => (
        <FieldEditor
          key={field.id}
          field={field}
          index={index}
          definition={definition}
          issues={issues}
          announce={announce}
          onChange={(next) =>
            onChange({
              ...definition,
              fields: definition.fields.map((f) =>
                f.id === field.id ? next : f,
              ),
            })
          }
          onRemove={() =>
            onChange({
              ...definition,
              fields: definition.fields.filter((f) => f.id !== field.id),
            })
          }
          onMove={(d) => {
            onChange({
              ...definition,
              fields: move(definition.fields, index, d),
            });
            announce(`${field.label} moved to position ${index + d + 1}`);
          }}
        />
      ))}
      <button
        type="button"
        disabled={
          definition.fields.length >= 60 || definition.sections.length === 0
        }
        onClick={() => {
          const section = definition.sections[0];
          if (section)
            onChange({
              ...definition,
              fields: [...definition.fields, newField("length", section.id)],
            });
        }}
      >
        Add dimension
      </button>
      {definition.sections.length === 0 && (
        <small>
          Add a section before adding dimensions. An empty schema is also valid.
        </small>
      )}
    </div>
  );
}
