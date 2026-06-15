import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, X, Building2, Smartphone, Shield } from "lucide-react";

interface ResourceCompany {
  id: number;
  name: string;
  website: string | null;
  phone: string | null;
  state: string | null;
  category: string | null;
  notes: string | null;
}
interface ResourceApp {
  id: number;
  name: string;
  website: string | null;
  category: string | null;
  description: string | null;
}
interface ResourceLink {
  id: number;
  name: string;
  url: string | null;
  category: string | null;
  description: string | null;
}

// A field descriptor drives both the add form and the inline edit form.
interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
}

const COMPANY_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", placeholder: "Company name" },
  { key: "website", label: "Website", placeholder: "https://..." },
  { key: "phone", label: "Phone", placeholder: "(555) 555-5555" },
  { key: "state", label: "State", placeholder: "e.g. California" },
  { key: "category", label: "Category", placeholder: "e.g. Medical Courier" },
  { key: "notes", label: "Notes", placeholder: "Anything members should know" },
];

const APP_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", placeholder: "App name" },
  { key: "website", label: "Website", placeholder: "https://..." },
  { key: "category", label: "Category", placeholder: "e.g. Grocery, Parcel" },
  { key: "description", label: "Description", placeholder: "Short description" },
];

const LINK_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", placeholder: "Provider / resource name" },
  { key: "url", label: "URL", placeholder: "https://..." },
  { key: "category", label: "Category", placeholder: "e.g. Insurance, Legal" },
  { key: "description", label: "Description", placeholder: "Short description" },
];

function emptyValues(fields: FieldDef[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.key, ""]));
}

// A generic CRUD section: add form + list with inline edit/delete, all wired to one API path.
function ResourceSection<T extends { id: number }>({
  title,
  icon: Icon,
  apiPath,
  queryKey,
  fields,
  primaryLabel,
  renderSummary,
}: {
  title: string;
  icon: typeof Building2;
  apiPath: string;
  queryKey: string;
  fields: FieldDef[];
  primaryLabel: string;
  renderSummary: (item: T) => React.ReactNode;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [addValues, setAddValues] = useState<Record<string, string>>(emptyValues(fields));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>(emptyValues(fields));

  const { data: items = [] } = useQuery<T[]>({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await apiRequest("GET", apiPath, undefined, token!);
      return res.json();
    },
    enabled: !!token,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const create = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const res = await apiRequest("POST", apiPath, values, token!);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      return data;
    },
    onSuccess: () => {
      invalidate();
      setAddValues(emptyValues(fields));
      toast({ title: `${title} added` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: Record<string, string> }) => {
      const res = await apiRequest("PATCH", `${apiPath}/${id}`, values, token!);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      return data;
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast({ title: "Saved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${apiPath}/${id}`, undefined, token!);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Removed" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditValues(Object.fromEntries(fields.map((f) => [f.key, item[f.key] ?? ""])));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
        </h2>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(addValues);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  value={addValues[f.key]}
                  onChange={(e) => setAddValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  required={f.key === "name"}
                  data-testid={`input-add-${queryKey.split("/").pop()}-${f.key}`}
                />
              </div>
            ))}
          </div>
          <Button type="submit" size="sm" disabled={create.isPending} data-testid={`button-add-${queryKey.split("/").pop()}`}>
            <Plus className="w-4 h-4 mr-2" />
            {create.isPending ? "Adding..." : primaryLabel}
          </Button>
        </form>

        {/* List */}
        <div className="divide-y divide-border/50">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground py-3">Nothing added yet.</p>
          )}
          {(items as any[]).map((item) => (
            <div key={item.id} className="py-3" data-testid={`row-${queryKey.split("/").pop()}-${item.id}`}>
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          value={editValues[f.key]}
                          onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => update.mutate({ id: item.id, values: editValues })}
                      disabled={update.isPending}
                    >
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">{renderSummary(item)}</div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startEdit(item)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remove "${item.name}"?`)) remove.mutate(item.id);
                      }}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResourcesAdmin() {
  return (
    <div className="space-y-6">
      <ResourceSection<ResourceCompany>
        title="Companies"
        icon={Building2}
        apiPath="/api/resources/companies"
        queryKey="/api/resources/companies"
        fields={COMPANY_FIELDS}
        primaryLabel="Add Company"
        renderSummary={(c) => (
          <>
            <p className="text-sm font-medium truncate">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {[c.state, c.category].filter(Boolean).join(" · ")}
              {c.phone ? ` · ${c.phone}` : ""}
            </p>
            {c.notes && <p className="text-xs text-muted-foreground/80 truncate">{c.notes}</p>}
          </>
        )}
      />
      <ResourceSection<ResourceApp>
        title="On-Demand Apps"
        icon={Smartphone}
        apiPath="/api/resources/apps"
        queryKey="/api/resources/apps"
        fields={APP_FIELDS}
        primaryLabel="Add App"
        renderSummary={(a) => (
          <>
            <p className="text-sm font-medium truncate">{a.name}</p>
            <p className="text-xs text-muted-foreground">{a.category}</p>
            {a.description && <p className="text-xs text-muted-foreground/80 truncate">{a.description}</p>}
          </>
        )}
      />
      <ResourceSection<ResourceLink>
        title="Insurance / Business Links"
        icon={Shield}
        apiPath="/api/resources/links"
        queryKey="/api/resources/links"
        fields={LINK_FIELDS}
        primaryLabel="Add Link"
        renderSummary={(l) => (
          <>
            <p className="text-sm font-medium truncate">{l.name}</p>
            <p className="text-xs text-muted-foreground">{l.category}</p>
            {l.description && <p className="text-xs text-muted-foreground/80 truncate">{l.description}</p>}
          </>
        )}
      />
    </div>
  );
}
