import * as c from "@fitloom/application/master-contracts";
import { Control, Illustration, type Issues } from "../editor-controls";

export function IdentityStep({
  definition,
  issues,
  onChange,
}: {
  definition: c.GarmentDefinition;
  issues: Issues;
  onChange: (definition: c.GarmentDefinition) => void;
}) {
  return (
    <div className="master-section">
      <h3>01 · Garment identity</h3>
      <div className="master-grid">
        <Control
          label="Garment name"
          path={["definition", "label"]}
          issues={issues}
        >
          {(props) => (
            <input
              {...props}
              maxLength={100}
              value={definition.label}
              onChange={(e) =>
                onChange({ ...definition, label: e.target.value })
              }
            />
          )}
        </Control>
        <Control
          label="Category"
          path={["definition", "category"]}
          issues={issues}
        >
          {(props) => (
            <input
              {...props}
              maxLength={100}
              value={definition.category}
              onChange={(e) =>
                onChange({ ...definition, category: e.target.value })
              }
            />
          )}
        </Control>
        <label className="master-control">
          <span>Applicability</span>
          <select
            aria-label="Applicability"
            value={definition.applicability}
            onChange={(e) =>
              onChange({
                ...definition,
                applicability: c.applicability.parse(e.target.value),
              })
            }
          >
            {c.applicability.options.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <Illustration
          label="Garment icon"
          value={definition.iconId}
          onChange={(value) => onChange({ ...definition, iconId: value })}
        />
      </div>
      <Control
        label="Garment guidance"
        path={["definition", "help"]}
        issues={issues}
      >
        {(props) => (
          <textarea
            {...props}
            value={definition.help}
            maxLength={500}
            onChange={(e) => onChange({ ...definition, help: e.target.value })}
          />
        )}
      </Control>
      <Illustration
        label="Guidance illustration"
        value={definition.illustrationId}
        onChange={(value) => onChange({ ...definition, illustrationId: value })}
      />
    </div>
  );
}
