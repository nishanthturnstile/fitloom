import { garmentPreview } from "@fitloom/application/garment-definition";
import {
  garmentDefinition,
  MASTER_ILLUSTRATIONS,
} from "@fitloom/application/master-contracts";
import Image from "next/image";
export function GarmentPreview({ definition }: { definition: unknown }) {
  const parsed = garmentDefinition.safeParse(definition);
  if (!parsed.success)
    return (
      <p className="master-muted">
        Complete the configuration to show its form preview.
      </p>
    );
  const model = garmentPreview(parsed.data);
  return (
    <section className="master-preview" aria-label="Garment form preview">
      <h3>{model.label}</h3>
      <p className="master-muted">Preview only. No wearer values are saved.</p>
      {model.illustration.src && (
        <Image
          src={model.illustration.src}
          alt={model.illustration.alt}
          width={96}
          height={96}
        />
      )}
      <p>{model.guidance}</p>
      {model.guidanceIllustration.src && (
        <Image
          src={model.guidanceIllustration.src}
          alt={model.guidanceIllustration.alt}
          width={64}
          height={64}
        />
      )}
      {model.emptyMessage && (
        <p className="master-empty">{model.emptyMessage}</p>
      )}
      <fieldset disabled>
        {model.sections.map((section) => (
          <section key={section.id}>
            <h4>{section.label}</h4>
            {section.fields.map((field) => (
              <div className="master-preview-field" key={field.id}>
                {field.illustration.src && (
                  <Image
                    src={field.illustration.src}
                    alt={field.illustration.alt}
                    width={56}
                    height={56}
                  />
                )}
                <label htmlFor={`preview-${field.id}`}>
                  {field.label}
                  {field.required ? " *" : ""}
                  {field.kind === "length" ? ` (${field.displayUnit})` : ""}
                </label>
                {field.kind === "boolean" ? (
                  <input id={`preview-${field.id}`} type="checkbox" />
                ) : field.kind === "select" ? (
                  <select id={`preview-${field.id}`} defaultValue="">
                    <option value="">Choose an option</option>
                    {field.choices.map((choice) => (
                      <option
                        key={choice.id}
                        value={choice.id}
                        disabled={!choice.active}
                      >
                        {choice.label}
                        {!choice.active ? " (retired)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`preview-${field.id}`}
                    type={field.kind === "text" ? "text" : "number"}
                    maxLength={
                      field.kind === "text" ? field.maxLength : undefined
                    }
                  />
                )}
                <small>{field.help}</small>
                {field.kind === "select" &&
                  field.choices.map((choice) => {
                    const picture = choice.illustrationId
                      ? MASTER_ILLUSTRATIONS[choice.illustrationId]
                      : null;
                    return picture ? (
                      <figure key={choice.id} className="master-preview-option">
                        <Image
                          src={picture.src}
                          alt={picture.alt}
                          width={42}
                          height={42}
                        />
                        <figcaption>{choice.label}</figcaption>
                      </figure>
                    ) : null;
                  })}
              </div>
            ))}
          </section>
        ))}
        {model.constructionGroups.map((group) => (
          <section key={group.id}>
            <h4>
              {group.label}
              {group.required ? " *" : ""}
            </h4>
            <p>{group.help}</p>
            {group.illustration.src && (
              <Image
                src={group.illustration.src}
                alt={group.illustration.alt}
                width={64}
                height={64}
              />
            )}
            {group.choices.map((choice) => (
              <label className="master-preview-option" key={choice.id}>
                <input
                  type={group.kind === "multiple" ? "checkbox" : "radio"}
                  name={`preview-${group.id}`}
                />
                {choice.label}
                {choice.illustration.src && (
                  <Image
                    src={choice.illustration.src}
                    alt={choice.illustration.alt}
                    width={42}
                    height={42}
                  />
                )}
              </label>
            ))}
          </section>
        ))}
      </fieldset>
    </section>
  );
}
