import { useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { Account, Template, Message } from "@/api/whatsapp";
import { card, input, button, consent, errorText } from "./shared";
import { Field, Bubble, TemplateSelect } from "./WhatsAppUi";
import { whatsappApi as api } from "@/api/whatsapp";
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
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        className={`${card} space-y-4 p-5`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!template || !consented) return;
          setBusy(true);
          const signature = JSON.stringify({
            templateId,
            destination,
            name,
            values,
          });
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
          change={(value) => {
            setTemplateId(value);
            setValues({});
            setSent(undefined);
          }}
        />
        <Field label="Student name">
          <input
            className={input}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSent(undefined);
            }}
          />
        </Field>
        <Field label="WhatsApp number">
          <input
            type="tel"
            required
            className={input}
            value={destination}
            placeholder="+91…"
            onChange={(e) => {
              setDestination(e.target.value);
              setSent(undefined);
            }}
          />
        </Field>
        {template?.variables.map((k) => (
          <Field key={k} label={`Value for {{${k}}}`}>
            <input
              required
              className={input}
              value={values[k] || ""}
              onChange={(e) => {
                setValues({ ...values, [k]: e.target.value });
                setSent(undefined);
              }}
            />
          </Field>
        ))}
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
          />
          {consent}
        </label>
        <button
          className={button}
          disabled={busy || !account.ready || !template || !consented || !!sent}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Send message
        </button>
        {sent && (
          <p role="status" className="text-sm text-emerald-600">
            Message queued for {sent.destination}.
          </p>
        )}
      </form>
      <section className={`${card} space-y-4 p-5`}>
        <h2 className="text-lg font-bold">Message preview</h2>
        <p className="text-sm text-slate-500">
          This is the personalized message your recipient will receive.
        </p>
        <Bubble
          body={(template?.body || "").replace(
            /{{(.*?)}}/g,
            (whole, key) => values[key] || whole,
          )}
        />
      </section>
    </div>
  );
}
