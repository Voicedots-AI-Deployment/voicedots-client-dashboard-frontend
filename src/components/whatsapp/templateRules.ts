import type {
  ButtonType,
  HeaderFormat,
  Template,
  TemplateStructure,
} from "@/api/whatsapp";

/** Meta's published component limits. The backend enforces the same numbers;
 *  these exist so the builder can warn before a round trip. */
export const HEADER_TEXT_MAX = 60;
export const FOOTER_MAX = 60;
export const BODY_MAX = 1024;
export const BUTTON_TEXT_MAX = 25;
export const BUTTONS_MAX = 10;
export const BUTTON_LIMITS: Record<ButtonType, number> = {
  QUICK_REPLY: 10,
  URL: 2,
  PHONE_NUMBER: 1,
};
export const BUTTON_LABEL: Record<ButtonType, string> = {
  QUICK_REPLY: "Quick reply",
  URL: "Visit website",
  PHONE_NUMBER: "Call phone number",
};
export const MEDIA_FORMATS: HeaderFormat[] = ["IMAGE", "VIDEO", "DOCUMENT"];

export const emptyDraft = (): TemplateStructure => ({
  header: { format: "NONE", text: "", example: "", handle: "" },
  body: "",
  examples: [],
  footer: "",
  buttons: [],
});

export const bodyKeys = (body: string) =>
  [...new Set([...body.matchAll(/{{(\d+)}}/g)].map((m) => Number(m[1])))].sort(
    (a, b) => a - b,
  );

/** Substitute {{n}} with the author's example values, leaving unfilled ones
 *  visible so the preview shows which variable still has no example. */
export function fill(text: string, values: string[]) {
  return text.replace(/{{(\d+)}}/g, (whole, key) => {
    const value = values[Number(key) - 1];
    return value && value.trim() ? value : whole;
  });
}

/** Mirrors the backend's Meta-derived rules so problems surface before saving.
 *  Keys map to a field in the builder; the backend remains the final authority. */
export function validate(
  name: string,
  draft: TemplateStructure,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^[a-z][a-z0-9_]*$/.test(name))
    errors.name = "Use lowercase letters, numbers and underscores.";
  const { header, body, examples, footer, buttons } = draft;
  if (header.format === "TEXT") {
    if (!header.text.trim()) errors.header = "Enter the header text.";
    else if ((header.text.match(/{{.*?}}/g) || []).length > 1)
      errors.header = "A header can contain at most one variable.";
    else if (/{{.*?}}/.test(header.text) && !/{{1}}/.test(header.text))
      errors.header = "The header variable must be {{1}}.";
    else if (/{{1}}/.test(header.text) && !header.example.trim())
      errors.header = "The header variable is missing an example value.";
  }
  if (MEDIA_FORMATS.includes(header.format) && !header.handle.trim())
    errors.header = "Upload the header media before saving this template.";
  if (!body.trim()) errors.body = "Enter the message body.";
  const keys = bodyKeys(body);
  if (keys.length && keys[keys.length - 1] !== keys.length)
    errors.body = "Variables must start at {{1}} without gaps.";
  keys.forEach((k) => {
    if (!(examples[k - 1] || "").trim())
      errors[`example-${k}`] = `Variable {{${k}}} is missing an example value.`;
  });
  if (/{{.*?}}/.test(footer))
    errors.footer = "The footer cannot contain variables.";
  const counts: Record<string, number> = {};
  buttons.forEach((b, i) => {
    counts[b.type] = (counts[b.type] || 0) + 1;
    if (!b.text.trim()) errors[`button-${i}`] = "Enter the button label.";
    else if (
      buttons.some(
        (other, j) =>
          j !== i &&
          other.text.trim().toLowerCase() === b.text.trim().toLowerCase(),
      )
    )
      errors[`button-${i}`] = "Each button needs a different label.";
    else if (b.type === "URL") {
      if (!/^https?:\/\/\S+$/.test(b.url))
        errors[`button-${i}`] = "Please enter a valid URL.";
      else if ((b.url.match(/{{.*?}}/g) || []).length > 1)
        errors[`button-${i}`] = "A link can contain at most one variable.";
      else if (/{{.*?}}/.test(b.url) && !b.url.endsWith("{{1}}"))
        errors[`button-${i}`] = "A link variable must be {{1}} at the end.";
      else if (/{{1}}/.test(b.url) && !b.url_example.trim())
        errors[`button-${i}`] = "Provide an example link for this button.";
    } else if (
      b.type === "PHONE_NUMBER" &&
      !/^\+[1-9]\d{6,14}$/.test(b.phone_number)
    )
      errors[`button-${i}`] =
        "Enter the number in international format, e.g. +919999999999.";
  });
  (Object.keys(BUTTON_LIMITS) as ButtonType[]).forEach((kind) => {
    if ((counts[kind] || 0) > BUTTON_LIMITS[kind])
      errors.buttons = `WhatsApp allows at most ${BUTTON_LIMITS[kind]} ${BUTTON_LABEL[kind].toLowerCase()} button(s).`;
  });
  return errors;
}

/** The builder shape for a template, tolerating a backend that predates it.
 *
 *  Frontend and backend deploy separately, so a dashboard can briefly talk to an
 *  API that does not send `structure` yet. Falling back to the flat body keeps
 *  the templates page readable instead of crashing on an undefined header. */
export function structureOf(template: Template): TemplateStructure {
  if (template.structure?.header) return template.structure;
  const examples =
    template.components?.find((c) => c.type === "BODY")?.example
      ?.body_text?.[0] || [];
  return {
    ...emptyDraft(),
    body: template.body || "",
    examples: [...examples],
  };
}

/** Substitute supplied values into the template's own structure so the preview,
 *  the single send and the bulk campaign all render the same message. */
export function previewOf(
  template: Template,
  values: Record<string, string>,
): TemplateStructure {
  const base = structureOf(template);
  const body = (template.slot_fields || [])
    .filter((f) => f.section === "body")
    .map((f) => values[f.slot] || "");
  return {
    ...base,
    header: { ...base.header, example: values.header || base.header.example },
    examples: body.length ? body : base.examples,
  };
}
