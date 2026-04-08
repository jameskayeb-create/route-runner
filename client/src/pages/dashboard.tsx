import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, MapPin, Truck, DollarSign, TrendingUp, ExternalLink,
  ChevronLeft, ChevronRight, SlidersHorizontal, X, Sparkles, Building2
} from "lucide-react";
import type { Route } from "@shared/schema";

const EQUIPMENT_CATEGORIES = ["Car/SUV", "Cargo Van", "Sprinter", "Box Truck", "Pickup", "Multiple"];
const PAY_UNITS = ["Per Week", "Per Day", "Per Hour", "Per Mile", "Per Route", "Per Shift", "Per Month"];

const ALL_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
  "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming"
];

function formatPay(route: Route): string {
  if (route.payRaw) return route.payRaw;
  if (route.payMin && route.payMax) return `$${route.payMin.toLocaleString()} - $${route.payMax.toLocaleString()}`;
  if (route.payMax) return `Up to $${route.payMax.toLocaleString()}`;
  if (route.payMin) return `From $${route.payMin.toLocaleString()}`;
  return "Contact for pay";
}

function equipmentColor(cat: string): string {
  switch (cat) {
    case "Car/SUV": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Cargo Van": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Sprinter": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "Box Truck": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "Pickup": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [equipFilter, setEquipFilter] = useState<string>("");
  const [payUnitFilter, setPayUnitFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState("pay");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 25;

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (stateFilter) p.set("state", stateFilter);
    if (equipFilter) p.set("equipmentCategory", equipFilter);
    if (payUnitFilter) p.set("payUnit", payUnitFilter);
    if (search) p.set("search", search);
    p.set("sortBy", sortBy);
    p.set("sortDir", sortDir);
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(page * PAGE_SIZE));
    return p.toString();
  }, [stateFilter, equipFilter, payUnitFilter, search, sortBy, sortDir, page]);

  const { data: routes, isLoading } = useQuery<Route[]>({
    queryKey: ["/api/routes", queryParams],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/routes?${queryParams}`, undefined, token!);
      return res.json();
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/routes/stats"],
  });

  const { data: stateBreakdown } = useQuery<any[]>({
    queryKey: ["/api/routes/states"],
  });

  const activeFilterCount = [stateFilter, equipFilter, payUnitFilter].filter(Boolean).length;

  const clearFilters = () => {
    setStateFilter("");
    setEquipFilter("");
    setPayUnitFilter("");
    setSearch("");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 32 32" className="w-7 h-7 flex-shrink-0" fill="none">
              <rect x="2" y="5" width="28" height="22" rx="3" stroke="hsl(42, 92%, 50%)" strokeWidth="2" />
              <path d="M2 11h28" stroke="hsl(42, 92%, 50%)" strokeWidth="1.5" opacity="0.4" />
              <path d="M11 16l4 4 7-8" stroke="hsl(42, 92%, 50%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h1 className="text-sm font-bold leading-none tracking-tight">Route Runner</h1>
              <p className="text-[10px] text-primary font-semibold tracking-widest uppercase">Six Figure Courier</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout} data-testid="button-logout">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Routes", value: stats?.totalRoutes ?? "—", icon: MapPin, color: "text-primary" },
            { label: "States Covered", value: stats?.statesCovered ?? "—", icon: TrendingUp, color: "text-emerald-400" },
            { label: "New This Week", value: stats?.newThisWeek ?? "—", icon: Sparkles, color: "text-blue-400" },
            { label: "Avg Weekly Pay", value: stats?.avgPayWeekly ? `$${stats.avgPayWeekly.toLocaleString()}` : "—", icon: DollarSign, color: "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-xl font-bold tabular-nums mt-0.5 ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
                      {value}
                    </p>
                  </div>
                  <Icon className={`w-5 h-5 ${color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search routes, companies, cities..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-primary/10 border-primary/30" : ""}
              data-testid="button-filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                <X className="w-3 h-3" /> Clear ({activeFilterCount})
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-md border border-border bg-card">
              <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger data-testid="select-state">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {ALL_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={equipFilter} onValueChange={(v) => { setEquipFilter(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger data-testid="select-equipment">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {EQUIPMENT_CATEGORIES.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={payUnitFilter} onValueChange={(v) => { setPayUnitFilter(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger data-testid="select-payunit">
                  <SelectValue placeholder="All Pay Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pay Types</SelectItem>
                  {PAY_UNITS.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={`${sortBy}-${sortDir}`} onValueChange={(v) => {
                const [by, dir] = v.split("-");
                setSortBy(by);
                setSortDir(dir);
                setPage(0);
              }}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pay-desc">Highest Pay</SelectItem>
                  <SelectItem value="pay-asc">Lowest Pay</SelectItem>
                  <SelectItem value="state-asc">State A-Z</SelectItem>
                  <SelectItem value="company-asc">Company A-Z</SelectItem>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* State Quick-Pick */}
        {stateBreakdown && stateBreakdown.length > 0 && !stateFilter && (
          <div className="flex gap-2 flex-wrap">
            {stateBreakdown.slice(0, 10).map(({ state, count }: any) => (
              <Button
                key={state}
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 h-7"
                onClick={() => { setStateFilter(state); setPage(0); setShowFilters(true); }}
                data-testid={`quick-state-${state}`}
              >
                <MapPin className="w-3 h-3 text-primary" />
                {state}
                <span className="text-muted-foreground">({count})</span>
              </Button>
            ))}
          </div>
        )}

        {/* Route Cards */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-md" />
            ))
          ) : routes && routes.length > 0 ? (
            routes.map((route) => (
              <Card
                key={route.id}
                className="border-border/50 hover:border-primary/20 transition-colors"
                data-testid={`card-route-${route.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Main info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{route.company}</h3>
                        {route.isNew && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5">
                            NEW
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] h-5 ${equipmentColor(route.equipmentCategory)}`}>
                          <Truck className="w-2.5 h-2.5 mr-1" />
                          {route.equipmentCategory}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {route.metroCity ? `${route.metroCity}, ${route.state}` : route.state}
                        </span>
                        {route.payUnit && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {route.payUnit}
                          </span>
                        )}
                        {route.sourcePage && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {route.sourcePage}
                          </span>
                        )}
                      </div>

                      {route.routeNotes && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{route.routeNotes}</p>
                      )}
                    </div>

                    {/* Right: Pay + Apply */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm tabular-nums text-primary">
                          {formatPay(route)}
                        </p>
                        {route.payUnit && (
                          <p className="text-[10px] text-muted-foreground">{route.payUnit}</p>
                        )}
                      </div>
                      {route.sourceUrl && (
                        <a
                          href={route.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="text-xs gap-1 h-7" data-testid={`button-apply-${route.id}`}>
                            Apply <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-16 space-y-3">
              <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">No routes found matching your filters</p>
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {routes && routes.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + routes.length} routes
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={routes.length < PAGE_SIZE}
                onClick={() => setPage(p => p + 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
