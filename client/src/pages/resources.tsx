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

        {/* Getting Started */}
        {tab === "getting-started" && (
          <div className="space-y-8">

            {/* Mindset */}
            <div className="border border-primary/30 bg-primary/5 rounded-xl p-5 space-y-2">
              <p className="text-primary font-bold text-sm uppercase tracking-wide">Mindset First</p>
              <p className="text-sm text-foreground font-medium">Execution is key. Give yourself reasonable daily goals and check at least one off every day. Do not sit around reading course information without taking action.</p>
              <p className="text-sm text-primary font-bold">Apply. Apply. Apply.</p>
              <p className="text-xs text-muted-foreground">You may start with one route and want to try others. Do that. Learn what type of freight you like to move and keep reaching for more. Never stop learning.</p>
            </div>

            {/* Quick Start Steps */}
            <div className="space-y-3">
              <h3 className="font-bold text-base">Quick Start Guide</h3>
              {[
                {
                  step: 1,
                  title: "Form the Company & Meet the Requirements",
                  body: "LLC or Corp, EIN, DOT number, MC number (if needed), FMCSA registration, and Commercial Insurance. These must be completed BEFORE registering for contracts.",
                  links: [
                    { label: "Form LLC — LegalZoom", url: "https://www.legalzoom.com" },
                    { label: "Free EIN — IRS.gov", url: "https://www.irs.gov" },
                    { label: "DOT & MC # — FMCSA", url: "https://www.fmcsa.dot.gov" },
                  ],
                },
                {
                  step: 2,
                  title: "Know the Business & Do the Math",
                  body: "Understand Dedicated vs Load Boards. Find stability in an unstable market by calculating your cost per mile for profit. Know your numbers before you start — if you don't know your costs, you will fail.",
                  links: [],
                },
                {
                  step: 3,
                  title: "Research Companies That Contract",
                  body: "Use the Company Directory tab to find companies in your state. Call first, then follow up by email or LinkedIn. Send 3-4 follow-up messages max and connect with at least 2-4 companies simultaneously.",
                  links: [],
                },
                {
                  step: 4,
                  title: "Leasing, Renting or Purchasing a Vehicle",
                  body: "Whether you rent, lease, or purchase is up to your budget. Many companies on our list accept rentals or leases (some require no decals on rentals). You will still need commercial insurance even with a rental.",
                  links: [],
                },
                {
                  step: 5,
                  title: "Get Registered & Start with Your First Company",
                  body: "Connect with at least 2-4 companies. When contacting companies, ask about: type of freight, requirements, advertised rate, length of contract, and possibility of adding additional vehicles.",
                  links: [],
                },
                {
                  step: 6,
                  title: "Bonuses: Maximize Your Income",
                  body: "Amazon Relay for Box Trucks, Dispatching (earn without driving), and Business Credit (access capital to scale). App Stacking: mix dedicated freight routes with on-demand apps to double your income.",
                  links: [
                    { label: "Amazon Relay", url: "https://relay.amazon.com" },
                  ],
                },
              ].map(({ step, title, body, links }) => (
                <Card key={step} className="border-border/60">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{step}</div>
                      <div className="flex-1 space-y-1.5">
                        <p className="font-semibold text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground">{body}</p>
                        {links.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {links.map((link) => (
                              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline border border-primary/30 rounded px-2 py-0.5">
                                ↗ {link.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Company Setup Checklist */}
            <div className="space-y-3">
              <h3 className="font-bold text-base">Company Setup Checklist</h3>
              <Card className="border-border/60">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {[
                      "Business Name", "Business Address", "Telephone Number", "DBA (Doing Business As)",
                      "TIN / EIN (Tax ID)", "Licenses & Permits", "Business Structure (LLC/Corp)",
                      "Business Checking Account", "Business Email", "DNB (Dun & Bradstreet) Number",
                      "Register with 411", "USDOT & MC Number", "Commercial Insurance",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-4 h-4 rounded border border-border flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insurance & Fees */}
            <div className="space-y-3">
              <h3 className="font-bold text-base">Insurance & Startup Costs</h3>
              <Card className="border-border/60">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <p className="text-xs text-muted-foreground">Being in the freight game requires a financial commitment upfront. Insurance is expensive — be prepared to put ~$3,000 down and pay ~$1,800/month. Shop around; every state has different prices.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: "Motor Carrier Permit", cost: "$300" },
                      { label: "Insurance Downpayment", cost: "~$3,000" },
                      { label: "Truck Rental/Lease Down", cost: "~$2,000" },
                      { label: "Company Incorporation", cost: "Varies by state" },
                    ].map(({ label, cost }) => (
                      <div key={label} className="flex justify-between text-xs border border-border/50 rounded-lg px-3 py-2">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{cost}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dedicated vs Load Board */}
            <div className="space-y-3">
              <h3 className="font-bold text-base">Dedicated Freight vs Load Board</h3>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-3">Dedicated freight is always the goal. You can mix dedicated routes with on-demand apps, but on-demand alone can leave you working more for less money.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { label: "Consistent", desc: "At least one load per week per shipping lane" },
                      { label: "Stable Rates", desc: "Rates stay fixed for the duration of the contract" },
                      { label: "Long-Term", desc: "Agreements are typically annual" },
                      { label: "Efficient", desc: "Usually drop trailer — reduces driver detention" },
                    ].map(({ label, desc }) => (
                      <div key={label} className="text-xs space-y-0.5">
                        <p className="font-semibold text-primary">{label}</p>
                        <p className="text-muted-foreground">{desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Know Your Numbers */}
            <div className="space-y-3">
              <h3 className="font-bold text-base">Know Your Numbers (CPM)</h3>
              <Card className="border-border/60">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <p className="text-xs font-semibold text-destructive">If you do not know how much it costs to operate your business, you will fail.</p>
                  <p className="text-xs text-muted-foreground">Calculate your Cost Per Mile (CPM) by adding up all monthly costs, then dividing by total miles driven.</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Example Monthly Costs:</p>
                    {[
                      ["Truck Payment", "$1,000"],
                      ["Insurance", "$1,800"],
                      ["Driver Pay (yourself)", "$4,000"],
                      ["Maintenance Fund", "$1,200"],
                      ["Business Savings", "$1,500"],
                      ["Estimated Fuel", "~$3,000"],
                      ["Monthly Break-Even", "$12,500"],
                      ["Weekly Break-Even", "~$3,125"],
                    ].map(([label, val]) => (
                      <div key={label} className={`flex justify-between text-xs px-3 py-1.5 rounded ${
                        label.includes("Break-Even") ? "bg-primary/10 border border-primary/30 font-semibold" : "border border-border/40"
                      }`}>
                        <span className="text-muted-foreground">{label}</span>
                        <span className={label.includes("Break-Even") ? "text-primary" : ""}>{val}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* On-Demand Apps */}
            <div className="space-y-3">
              <h3 className="font-bold text-base">On-Demand & Load Board Apps</h3>
              <p className="text-xs text-muted-foreground">Use these to supplement income between dedicated routes or while getting started. See the On-Demand Apps tab for full details.</p>
              <div className="flex flex-wrap gap-2">
                {["Dispatch It","Rapid US","Roadie","Uber Eats","DoorDash","Lugg","Pickup","Part Runner","Curri","Shipt","Senpex","Medzoomer","Try Hungry","Metro Speedy","Dolly","Bungii","Boomerang","uShip","Go Share","Veho","Frayt","Metrobi","Mothership","Dropoff","Shiply","Veyo","CBDriver"].map((app) => (
                  <span key={app} className="text-xs bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full border border-border/50">{app}</span>
                ))}
              </div>
            </div>

            {/* Contact info */}
            <div className="border border-border/40 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Need help? Contact Six Figure Courier support at{" "}
                <a href="mailto:info@pushlimitsdaily.com" className="text-primary hover:underline">info@pushlimitsdaily.com</a>
              </p>
            </div>
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
