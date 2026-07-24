"use client";

import { useState } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldOff,
  Tag,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LeadEditor } from "@/components/leads/lead-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { bulkLeadAction } from "@/features/leads/actions";
import type { LeadListData } from "@/features/leads/data";
import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  return score >= 80
    ? "border-success/30 bg-success/10 text-success"
    : score >= 60
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-warning/30 bg-warning/10 text-foreground";
}

export function LeadsTable({
  data,
  canCreate,
  canUpdate,
  canExport,
}: {
  data: LeadListData;
  canCreate: boolean;
  canUpdate: boolean;
  canExport: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const allSelected =
    data.leads.length > 0 && selected.length === data.leads.length;

  async function bulk(
    action: "archive" | "suppress" | "assign" | "tag" | "recalculate",
  ) {
    const value =
      action === "suppress"
        ? "Bulk suppression"
        : action === "tag"
          ? (window.prompt("Tag name") ?? "")
          : action === "assign"
            ? (window.prompt("Teammate ID") ?? "")
            : "";
    if ((action === "tag" || action === "assign") && !value) return;
    const result = await bulkLeadAction({ leadIds: selected, action, value });
    setMessage(result.message);
    if (result.ok) {
      setSelected([]);
      router.refresh();
    }
  }

  function exportSelected() {
    const rows = data.leads.filter(
      (lead) => !selected.length || selected.includes(lead.id),
    );
    const csv = [
      [
        "Business",
        "Score",
        "Industry",
        "Country",
        "City",
        "Email",
        "Phone",
        "Status",
      ],
      ...rows.map((lead) => [
        lead.businessName,
        lead.qualificationScore,
        lead.industry,
        lead.country,
        lead.city,
        lead.email,
        lead.phone,
        lead.status,
      ]),
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "orliqo-leads.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <>
      <div className="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" role="status">
          {selected.length
            ? `${selected.length} selected`
            : `${data.total} leads`}
          {message ? ` · ${message}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {selected.length && canUpdate ? (
            <>
              <Button size="sm" variant="outline" onClick={() => bulk("tag")}>
                <Tag />
                Tag
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulk("assign")}
              >
                <UserRoundPlus />
                Assign
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulk("recalculate")}
              >
                <RefreshCw />
                Score
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulk("archive")}
              >
                <Archive />
                Archive
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => bulk("suppress")}
              >
                <ShieldOff />
                Suppress
              </Button>
            </>
          ) : null}
          {canExport ? (
            <Button size="sm" variant="outline" onClick={exportSelected}>
              <Download />
              Export
            </Button>
          ) : null}
          {canCreate ? (
            <Button size="sm" onClick={() => setEditorOpen(true)}>
              <Plus />
              Create lead
            </Button>
          ) : null}
        </div>
      </div>
      <div className="bg-card surface-shadow w-full max-w-full min-w-0 overflow-hidden rounded-xl border [contain:layout_inline-size_paint]">
        <div
          data-testid="leads-scroll"
          className="hidden w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain xl:block"
        >
          <table className="w-full min-w-[1180px] text-sm">
            <caption className="sr-only">
              Workspace leads and qualification details
            </caption>
            <thead className="bg-muted/45 text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
              <tr>
                <th scope="col" className="w-12 p-3">
                  <Checkbox
                    aria-label="Select all leads"
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked ? data.leads.map((lead) => lead.id) : [],
                      )
                    }
                  />
                </th>
                <th scope="col" className="p-3">
                  Business
                </th>
                <th scope="col" className="p-3">
                  Score
                </th>
                <th scope="col" className="p-3">
                  Industry
                </th>
                <th scope="col" className="p-3">
                  Location
                </th>
                <th scope="col" className="p-3">
                  Website
                </th>
                <th scope="col" className="p-3">
                  Email
                </th>
                <th scope="col" className="p-3">
                  Phone
                </th>
                <th scope="col" className="p-3">
                  Instagram
                </th>
                <th scope="col" className="p-3">
                  Status
                </th>
                <th scope="col" className="p-3">
                  Assigned
                </th>
                <th scope="col" className="p-3">
                  Last activity
                </th>
                <th scope="col" className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={cn(
                    "hover:bg-muted/25",
                    lead.doNotContact && "bg-destructive/[0.025]",
                  )}
                >
                  <td className="p-3">
                    <Checkbox
                      aria-label={`Select ${lead.businessName}`}
                      checked={selected.includes(lead.id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked
                            ? [...current, lead.id]
                            : current.filter((id) => id !== lead.id),
                        )
                      }
                    />
                  </td>
                  <td className="p-3">
                    <Link
                      className="hover:text-primary font-semibold"
                      href={`/app/leads/${lead.id}`}
                    >
                      {lead.businessName}
                    </Link>
                    <p className="text-muted-foreground max-w-44 truncate text-xs">
                      {lead.tags.join(" · ")}
                    </p>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={scoreTone(lead.qualificationScore)}
                    >
                      {lead.qualificationScore}
                    </Badge>
                  </td>
                  <td className="p-3">{lead.industry || "—"}</td>
                  <td className="p-3">
                    {[lead.city, lead.country].filter(Boolean).join(", ") ||
                      "—"}
                  </td>
                  <td className="p-3 capitalize">
                    {lead.websiteStatus.replaceAll("_", " ")}
                  </td>
                  <td className="p-3">
                    <span className="block max-w-40 truncate">
                      {lead.email || "—"}
                    </span>
                    <span className="text-muted-foreground text-[11px] capitalize">
                      {lead.emailVerification}
                    </span>
                  </td>
                  <td className="p-3">{lead.phone || "—"}</td>
                  <td className="p-3">{lead.instagramUrl ? "Yes" : "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize">
                      {lead.status.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-3">{lead.assignedName}</td>
                  <td className="text-muted-foreground p-3 text-xs">
                    {new Date(lead.lastActivityAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/app/leads/${lead.id}`}>
                        <MoreHorizontal />
                        <span className="sr-only">
                          Open {lead.businessName}
                        </span>
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y xl:hidden">
          {data.leads.map((lead) => (
            <article key={lead.id} className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  aria-label={`Select ${lead.businessName}`}
                  checked={selected.includes(lead.id)}
                  onCheckedChange={(checked) =>
                    setSelected((current) =>
                      checked
                        ? [...current, lead.id]
                        : current.filter((id) => id !== lead.id),
                    )
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      data-testid="mobile-lead-link"
                      className="hover:text-primary truncate font-semibold"
                      href={`/app/leads/${lead.id}`}
                    >
                      {lead.businessName}
                    </Link>
                    <Badge
                      variant="outline"
                      className={scoreTone(lead.qualificationScore)}
                    >
                      {lead.qualificationScore}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {[lead.industry, lead.city, lead.country]
                      .filter(Boolean)
                      .join(" · ") || "No location recorded"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="capitalize">
                      {lead.status.replaceAll("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {lead.websiteStatus.replaceAll("_", " ")}
                    </Badge>
                    {lead.doNotContact ? (
                      <Badge variant="destructive">Do not contact</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-3 truncate text-xs">
                    {lead.email || lead.phone || "No contact recorded"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!data.leads.length ? (
          <div className="p-12 text-center">
            <h2 className="font-semibold">No leads match these filters</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Clear filters or create a lead to continue.
            </p>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span>
            Page {data.page} of{" "}
            {Math.max(1, Math.ceil(data.total / data.pageSize))}
          </span>
          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              disabled={data.page <= 1}
            >
              <Link
                aria-disabled={data.page <= 1}
                href={`?page=${Math.max(1, data.page - 1)}`}
              >
                <ChevronLeft />
                Previous
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              disabled={data.page * data.pageSize >= data.total}
            >
              <Link
                aria-disabled={data.page * data.pageSize >= data.total}
                href={`?page=${data.page + 1}`}
              >
                Next
                <ChevronRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      {editorOpen ? (
        <LeadEditor
          teammates={data.teammates}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </>
  );
}
