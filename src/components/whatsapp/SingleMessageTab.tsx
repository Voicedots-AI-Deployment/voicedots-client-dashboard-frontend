import { useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { Account, Template, Message } from "@/api/whatsapp";
import { card, input, button, consent, errorText } from "./shared";
import { Field, TemplateSelect } from "./WhatsAppUi";
import { whatsappApi as api } from "@/api/whatsapp";
import SlotInputs from "./SlotInputs";
import { previewOf } from "./templateRules";
import TemplatePreview from "./TemplatePreview";

/** Send an approved template: select, fill whatever the template declares,
 *  preview the exact message, confirm consent, send. Used standalone and from
 *  inside a conversation, where the recipient is prefilled. */
export default function Single({
  account,
  templates,
  notify,
  initialDestination = "",
  initialName = "",
}: {
  account: Account;
  templates: Template[];
  notify: (s: string) => void;
  initialDestination?: string;
  initialName?: string;
}) {
  const [templateId, setTemplateId] = useState(""),
    [destination, setDestination] = useState(initialDestination),
    [name, setName] = useState(initialName),
    [values, setValues] = useState<Record<string, string>>({});
  const [consented, setConsented] = useState(false),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState<Message>();
  const attempt = useRef({ signature: "", key: "" });
  const template = templates.find((t) => t.id === templateId);
  // Only the slots this template declares are required; a template with none
  // is ready as soon as a recipient is entered.
  const missing = (template?.slot_fields || []).filter(
    (f) => !(values[f.slot] || "").trim(),
  );
  const ready =
    !!template && !missing.length && !!destination.trim() && consented;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        className={`${card} space-y-4 p-5`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ready) return;
          setBusy(true);
          const signature = JSON.stringify({
            templateId,
            destination,
            name,
            values,
          });
          // Retrying identical content reuses the key so a timeout cannot double-send.
          if (attempt.current.signature !== signature)
            attempt.current = { signature, key: crypto.randomUUID() };
          try {
            const message = await api.send({
              account_id: account.id,
              template_id: templateId,
              destination,
              contact_name: name,
              variables: values,
              consent_confirmed: true,
              consent_declaration: consent,
              idempotency_key: attempt.current.key,
            });
            setSent(message);
            notify("Message queued. Open Inbox to follow its delivery.");
          } catch (error) {
            notify(errorText(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-lg font-bold">Send a template message</h2>
        <TemplateSelect
          templates={templates}
          value={templateId}
          change={(id) => {
            setTemplateId(id);
            // Values belong to the previous template's slots; start clean.
            setValues({});
            setSent(undefined);
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="WhatsApp number">
            <input
              required
              className={input}
              placeholder="+919876543210"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </Field>
          <Field label="Contact name (optional)">
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>
        {template && (
          <SlotInputs
            account={account}
            template={template}
            values={values}
            change={(slot, value) =>
              setValues((current) => ({ ...current, [slot]: value }))
            }
          />
        )}
        <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
          />
          {consent}
        </label>
        <button disabled={busy || !ready || !account.ready} className={button}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          <Send size={16} />
          Send message
        </button>
        {template && missing.length > 0 && (
          <p className="text-xs text-slate-500">
            {missing.length} field{missing.length > 1 ? "s" : ""} still needed:{" "}
            {missing.map((f) => f.label).join(", ")}
          </p>
        )}
        {sent && (
          <p
            role="status"
            className="text-sm text-emerald-700 dark:text-emerald-400"
          >
            Queued as {sent.status}. Delivery updates arrive from WhatsApp.
          </p>
        )}
      </form>
      <div className={`${card} p-4`}>
        {template ? (
          <TemplatePreview
            draft={previewOf(template, values)}
            templateId={template.id}
          />
        ) : (
          <p className="p-6 text-center text-sm text-slate-500">
            Select an approved template to preview the exact message.
          </p>
        )}
      </div>
    </div>
  );
}
