import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Phone, ExternalLink, Building2, Smartphone, Shield,
  Rocket, Network, ArrowLeft, MapPin,
} from "lucide-react";

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

type TabKey = "companies" | "apps" | "insurance" | "getting-started" | "networks";

// Group an array of items by a key, falling back to a label for empty/null values.
function groupBy<T>(items: T[], key: (item: T) => string | null | undefined, fallback: string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const g = (key(item) || fallback).trim() || fallback;
    (groups[g] ||= []).push(item);
  }
  return groups;
}

function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-sm text-muted-foreground">
      Nothing added yet — check back soon.
    </div>
  );
}

export default function ResourcesPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<TabKey>("companies");
  const [companySearch, setCompanySearch] = useState("");

  const companiesQuery = useQuery<ResourceCompany[]>({
    queryKey: ["/api/resources/companies"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/resources/companies", undefined, token!);
      return res.json();
    },
    enabled: !!token,
  });

  const appsQuery = useQuery<ResourceApp[]>({
    queryKey: ["/api/resources/apps"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/resources/apps", undefined, token!);
      return res.json();
    },
    enabled: !!token,
  });

  const linksQuery = useQuery<ResourceLink[]>({
    queryKey: ["/api/resources/links"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/resources/links", undefined, token!);
      return res.json();
    },
    enabled: !!token,
  });

  const filteredCompanies = useMemo(() => {
    const all = companiesQuery.data ?? [];
    if (!companySearch.trim()) return all;
    const q = companySearch.toLowerCase();
    return all.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.state || "").toLowerCase().includes(q)
    );
  }, [companiesQuery.data, companySearch]);

  const companyGroups = useMemo(
    () => groupBy(filteredCompanies, (c) => c.state, "Other"),
    [filteredCompanies]
  );
  const appGroups = useMemo(
    () => groupBy(appsQuery.data ?? [], (a) => a.category, "General"),
    [appsQuery.data]
  );
  const linkGroups = useMemo(
    () => groupBy(linksQuery.data ?? [], (l) => l.category, "General"),
    [linksQuery.data]
  );

  const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
    { key: "companies", label: "Company Directory", icon: Building2 },
    { key: "apps", label: "On-Demand Apps", icon: Smartphone },
    { key: "insurance", label: "Insurance & Business", icon: Shield },
    { key: "getting-started", label: "Getting Started", icon: Rocket },
    { key: "networks", label: "National Networks", icon: Network },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/#/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <h1 className="text-sm font-bold leading-none tracking-tight">Resources</h1>
              <p className="text-[10px] text-primary font-semibold tracking-widest uppercase">Six Figure Courier</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/#/">
              <Button variant="outline" size="sm">Routes</Button>
            </a>
            {user?.role === "admin" && (
              <a href="/#/admin">
                <Button variant="ghost" size="sm">Admin</Button>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Company Directory */}
        {tab === "companies" && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by state or company name..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="pl-9"
                data-testid="input-company-search"
              />
            </div>

            {companiesQuery.isLoading ? (
              <ListSkeleton />
            ) : filteredCompanies.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {Object.keys(companyGroups).sort().map((state) => (
                  <div key={state} className="space-y-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="w-4 h-4 text-primary" /> {state}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({companyGroups[state].length})
                      </span>
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {companyGroups[state].map((c) => (
                        <Card key={c.id} className="border-border/50" data-testid={`company-${c.id}`}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold">{c.name}</p>
                              {c.category && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                                  {c.category}
                                </span>
                              )}
                            </div>
                            {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                            <div className="flex flex-col gap-1 pt-1">
                              {c.phone && (
                                <a
                                  href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
                                  className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary"
                                >
                                  <Phone className="w-3 h-3" /> {c.phone}
                                </a>
                              )}
                              {c.website && (
                                <a
                                  href={ensureHttp(c.website)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" /> Website
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* On-Demand Apps */}
        {tab === "apps" && (
          <div className="space-y-4">
            {appsQuery.isLoading ? (
              <ListSkeleton />
            ) : (appsQuery.data ?? []).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {Object.keys(appGroups).sort().map((category) => (
                  <div key={category} className="space-y-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      {category}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({appGroups[category].length})
                      </span>
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {appGroups[category].map((a) => (
                        <Card key={a.id} className="border-border/50" data-testid={`app-${a.id}`}>
                          <CardContent className="p-4 space-y-2">
                            <p className="text-sm font-semibold">{a.name}</p>
                            {a.description && (
                              <p className="text-xs text-muted-foreground">{a.description}</p>
                            )}
                            {a.website && (
                              <a
                                href={ensureHttp(a.website)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" /> Website
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Insurance & Business */}
        {tab === "insurance" && (
          <div className="space-y-4">
            {linksQuery.isLoading ? (
              <ListSkeleton />
            ) : (linksQuery.data ?? []).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {Object.keys(linkGroups).sort().map((category) => (
                  <div key={category} className="space-y-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      {category}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({linkGroups[category].length})
                      </span>
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {linkGroups[category].map((l) => (
                        <Card key={l.id} className="border-border/50" data-testid={`link-${l.id}`}>
                          <CardContent className="p-4 space-y-2">
                            <p className="text-sm font-semibold">{l.name}</p>
                            {l.description && (
                              <p className="text-xs text-muted-foreground">{l.description}</p>
                            )}
                            {l.url && (
                              <a
                                href={ensureHttp(l.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
                              >
                                <ExternalLink className="w-3 h-3 flex-shrink-0" /> {l.url}
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Getting Started (static) */}
        {tab === "getting-started" && (
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                title: "1. Form Your Business",
                body: "Register an LLC in your state, get an EIN from the IRS, and open a dedicated business bank account.",
              },
              {
                title: "2. Get Insured",
                body: "Most contracts require commercial auto and general liability coverage. See the Insurance & Business tab for providers.",
              },
              {
                title: "3. Set Up Your Equipment",
                body: "Choose the right vehicle for the routes you want — cargo van, sprinter, or box truck — and keep maintenance records.",
              },
              {
                title: "4. Apply to Routes",
                body: "Browse the route board, apply directly through the source links, and follow up with the companies in the directory.",
              },
            ].map((card) => (
              <Card key={card.title} className="border-border/50">
                <CardContent className="p-4 space-y-1.5">
                  <p className="text-sm font-semibold text-primary">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* National Networks (static) */}
        {tab === "networks" && (
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                name: "Amazon DSP",
                body: "Delivery Service Partner program for last-mile package delivery in branded vans.",
              },
              {
                name: "FedEx Ground (ISP)",
                body: "Independent Service Provider routes for parcel pickup and delivery.",
              },
              {
                name: "Final Mile / Courier Brokers",
                body: "National brokers that contract independent couriers for medical, auto-parts, and on-demand work.",
              },
              {
                name: "Medical & Lab Couriers",
                body: "Recurring routes moving specimens and supplies between clinics and labs — often steady weekly pay.",
              },
            ].map((card) => (
              <Card key={card.name} className="border-border/50">
                <CardContent className="p-4 space-y-1.5">
                  <p className="text-sm font-semibold">{card.name}</p>
                  <p className="text-xs text-muted-foreground">{card.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
