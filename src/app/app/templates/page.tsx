import { Badge } from "@/components/ui/badge";
import { StatePanel } from "@/components/feedback/state-panel";
import { getMessageTemplates } from "@/features/templates/data";

export default async function TemplatesPage() {
  const templates = (await getMessageTemplates()).filter(
    (template) => !template.archived,
  );
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Templates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Validated variables and human-approved drafts for each supported
          channel.
        </p>
      </div>
      {templates.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <article
              key={template.id}
              className="bg-card rounded-xl border p-5"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{template.name}</h2>
                  <p className="text-muted-foreground text-xs">
                    {template.category}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {template.channel}
                </Badge>
              </div>
              <p className="bg-muted/50 text-muted-foreground mt-4 rounded-lg p-3 font-mono text-xs leading-5">
                {template.body}
              </p>
              <p className="text-primary mt-3 text-xs">
                Variables are validated against stored business and lead evidence.
              </p>
            </article>
          ))}
        </div>
      ) : (
        <StatePanel
          variant="empty"
          title="No templates yet"
          description="Create provider templates from Integrations or use grounded campaign drafts."
          action={{ label: "Open integrations", href: "/app/integrations" }}
        />
      )}
    </div>
  );
}
