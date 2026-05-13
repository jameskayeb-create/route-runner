import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Users, MapPin, Plus, Trash2, ArrowLeft, Send, Route, Mail, Flag, CheckCircle, ExternalLink, Search, List } from "lucide-react";

interface Member {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"members" | "routes" | "manage" | "flagged">("members");
  const [routeSearch, setRouteSearch] = useState("");
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState("");

  // Add member form
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  // Notify members form
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");

  // Add route form
  const [routeCompany, setRouteCompany] = useState("");
  const [routeState, setRouteState] = useState("");
  const [routeCity, setRouteCity] = useState("");
  const [routeEquipment, setRouteEquipment] = useState("");
  const [routePayMin, setRoutePayMin] = useState("");
  const [routePayMax, setRoutePayMax] = useState("");
  const [routePayUnit, setRoutePayUnit] = useState("Per Week");
  const [routeUrl, setRouteUrl] = useState("");
  const [routeNotes, setRouteNotes] = useState("");

  // Fetch members
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/admin/members"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/members", undefined, token!);
      return res.json();
    },
    enabled: !!token && user?.role === "admin",
  });

  // Fetch route stats
  const { data: stats } = useQuery<{ totalRoutes: number; statesCovered: number; avgWeeklyPay: number }>({
    queryKey: ["/api/routes/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/routes/stats", undefined, token!);
      return res.json();
    },
    enabled: !!token,
  });

  // All routes for manage tab
  const { data: allRoutes = [] } = useQuery<any[]>({
    queryKey: ["/api/routes/all-admin"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/routes?limit=500", undefined, token!);
      return res.json();
    },
    enabled: !!token && user?.role === "admin" && tab === "manage",
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/routes/${id}`, undefined, token!); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes/all-admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/routes/stats"] });
      toast({ title: "Route removed" });
    },
  });

  const updateRouteUrl = useMutation({
    mutationFn: async ({ id, url }: { id: number; url: string }) => {
      await apiRequest("PATCH", `/api/routes/${id}`, { sourceUrl: url }, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes/all-admin"] });
      setEditingRouteId(null);
      toast({ title: "Link updated" });
    },
  });

  const filteredRoutes = allRoutes.filter((r: any) => {
    if (!routeSearch) return true;
    const q = routeSearch.toLowerCase();
    return (
      (r.company || "").toLowerCase().includes(q) ||
      (r.state || "").toLowerCase().includes(q) ||
      (r.metroCity || "").toLowerCase().includes(q)
    );
  });

  // Flagged routes
  const { data: flaggedRoutes = [], refetch: refetchFlagged } = useQuery<any[]>({
    queryKey: ["/api/admin/flagged-routes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/flagged-routes", undefined, token!);
      return res.json();
    },
    enabled: !!token && user?.role === "admin",
  });

  const removeRoute = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/routes/${id}`, undefined, token!); },
    onSuccess: () => { refetchFlagged(); queryClient.invalidateQueries({ queryKey: ["/api/routes"] }); toast({ title: "Route removed" }); },
  });

  const unflagRoute = useMutation({
    mutationFn: async (id: number) => { await apiRequest("PATCH", `/api/routes/${id}/unflag`, undefined, token!); },
    onSuccess: () => { refetchFlagged(); toast({ title: "Flag cleared" }); },
  });

  // Create member
  const createMember = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/create-member", { email: newEmail, name: newName }, token!);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Member created", description: `Welcome email sent to ${newEmail}` });
        setNewEmail("");
        setNewName("");
        queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete member
  const deleteMember = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/members/${id}`, undefined, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({ title: "Member removed" });
    },
  });

  const resetPassword = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/members/${id}/reset-password`, {}, token!);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.emailSent) {
        toast({ title: "Password reset", description: "New credentials emailed to the member." });
      } else {
        toast({
          title: "Password reset — email failed",
          description: `New password: ${data.newPassword} (copy this and send manually)`,
          variant: "destructive",
        });
      }
    },
    onError: () => toast({ title: "Reset failed", variant: "destructive" }),
  });

  // Notify members
  const notifyMembers = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/notify-members", {
        subject: notifySubject || undefined,
        message: notifyMessage || undefined,
      }, token!);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Emails sent", description: `Sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}${data.failed ? `, ${data.failed} failed` : ""}` });
        setNotifySubject("");
        setNotifyMessage("");
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Create route
  const createRoute = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/routes", {
        companyName: routeCompany,
        state: routeState,
        metroCity: routeCity,
        equipmentCategory: routeEquipment,
        payMin: routePayMin ? Number(routePayMin) : null,
        payMax: routePayMax ? Number(routePayMax) : null,
        payUnit: routePayUnit,
        sourceUrl: routeUrl,
        routeNotes: routeNotes,
        status: "Active",
        sourcePage: "Admin",
      }, token!);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Route added" });
      setRouteCompany(""); setRouteState(""); setRouteCity("");
      setRouteEquipment(""); setRoutePayMin(""); setRoutePayMax("");
      setRouteUrl(""); setRouteNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const memberCount = members.filter((m) => m.role === "member").length;
  const adminCount = members.filter((m) => m.role === "admin").length;

  if (user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/#/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">{user.name} (Admin)</p>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold text-primary" data-testid="stat-members">{memberCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{adminCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">Total Routes</p>
              <p className="text-2xl font-bold text-primary">{stats?.totalRoutes ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">States Covered</p>
              <p className="text-2xl font-bold">{stats?.statesCovered ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border/60 pb-0">
          <button
            onClick={() => setTab("members")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" /> Members
          </button>
          <button
            onClick={() => setTab("routes")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "routes"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Route className="w-4 h-4" /> Add Route
          </button>
          <button
            onClick={() => setTab("manage")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "manage"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" /> Manage Routes
          </button>
          <button
            onClick={() => setTab("flagged")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "flagged"
                ? "border-destructive text-destructive"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flag className="w-4 h-4" />
            Flagged
            {flaggedRoutes.length > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {flaggedRoutes.length}
              </span>
            )}
          </button>
        </div>

        {tab === "members" && (
          <div className="space-y-6">
            {/* Add member form */}
            <Card>
              <CardHeader className="pb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add New Member
                </h2>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => { e.preventDefault(); createMember.mutate(); }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="flex-1">
                    <Input
                      placeholder="Email address"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      data-testid="input-new-member-email"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Full name (optional)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      data-testid="input-new-member-name"
                    />
                  </div>
                  <Button type="submit" disabled={createMember.isPending} data-testid="button-add-member">
                    <Send className="w-4 h-4 mr-2" />
                    {createMember.isPending ? "Sending..." : "Add & Send Email"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Member list */}
            <Card>
              <CardContent className="pt-5">
                <div className="space-y-0 divide-y divide-border/50">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3" data-testid={`member-row-${m.id}`}>
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          m.role === "admin" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {m.role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}
                        </span>
                        {m.role !== "admin" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => { if (confirm(`Reset password for ${m.email}? They will receive a new password by email.`)) resetPassword.mutate(m.id); }}
                              disabled={resetPassword.isPending}
                              data-testid={`button-reset-password-${m.id}`}
                            >
                              Reset PW
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { if (confirm(`Remove ${m.email}?`)) deleteMember.mutate(m.id); }}
                              data-testid={`button-delete-member-${m.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Send Member Update */}
            <Card>
              <CardHeader className="pb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Send Member Update
                </h2>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => { e.preventDefault(); notifyMembers.mutate(); }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Subject (optional)</Label>
                    <Input
                      placeholder="New Routes Available — Route Runner"
                      value={notifySubject}
                      onChange={(e) => setNotifySubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message (optional)</Label>
                    <Textarea
                      placeholder="e.g. 5 new routes added in California and Texas this week!"
                      value={notifyMessage}
                      onChange={(e) => setNotifyMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" disabled={notifyMembers.isPending}>
                    <Mail className="w-4 h-4 mr-2" />
                    {notifyMembers.isPending ? "Sending..." : `Send Email to All Members (${memberCount})`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "routes" && (
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Add New Route
              </h2>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); createRoute.mutate(); }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={routeCompany} onChange={(e) => setRouteCompany(e.target.value)} required placeholder="e.g. Action Express" data-testid="input-route-company" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={routeState} onChange={(e) => setRouteState(e.target.value)} required placeholder="e.g. California" data-testid="input-route-state" />
                  </div>
                  <div className="space-y-2">
                    <Label>City / Metro</Label>
                    <Input value={routeCity} onChange={(e) => setRouteCity(e.target.value)} placeholder="e.g. Los Angeles" data-testid="input-route-city" />
                  </div>
                  <div className="space-y-2">
                    <Label>Equipment Type</Label>
                    <Input value={routeEquipment} onChange={(e) => setRouteEquipment(e.target.value)} placeholder="e.g. Cargo Van, Sprinter" data-testid="input-route-equipment" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pay Min ($)</Label>
                    <Input type="number" value={routePayMin} onChange={(e) => setRoutePayMin(e.target.value)} placeholder="e.g. 1500" data-testid="input-route-pay-min" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pay Max ($)</Label>
                    <Input type="number" value={routePayMax} onChange={(e) => setRoutePayMax(e.target.value)} placeholder="e.g. 2500" data-testid="input-route-pay-max" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pay Unit</Label>
                    <select
                      value={routePayUnit}
                      onChange={(e) => setRoutePayUnit(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      data-testid="select-route-pay-unit"
                    >
                      <option value="Per Week">Per Week</option>
                      <option value="Per Day">Per Day</option>
                      <option value="Per Month">Per Month</option>
                      <option value="Per Mile">Per Mile</option>
                      <option value="Per Delivery">Per Delivery</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source URL (direct link)</Label>
                    <Input value={routeUrl} onChange={(e) => setRouteUrl(e.target.value)} placeholder="https://..." data-testid="input-route-url" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes / Description</Label>
                  <Input value={routeNotes} onChange={(e) => setRouteNotes(e.target.value)} placeholder="Route details, requirements, etc." data-testid="input-route-notes" />
                </div>
                <Button type="submit" disabled={createRoute.isPending} data-testid="button-add-route">
                  <Plus className="w-4 h-4 mr-2" />
                  {createRoute.isPending ? "Adding..." : "Add Route"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {tab === "manage" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <List className="w-4 h-4" /> All Routes
                  <span className="text-xs text-muted-foreground font-normal">({filteredRoutes.length} shown)</span>
                </h2>
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search company, state, city…"
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    className="w-full pl-8 pr-3 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
                {filteredRoutes.map((r: any) => (
                  <div key={r.id} className="px-6 py-3 hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.company}</p>
                        <p className="text-xs text-muted-foreground">{r.metroCity && `${r.metroCity}, `}{r.state} · {r.equipmentCategory}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {r.sourceUrl && (
                          <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingRouteId(editingRouteId === r.id ? null : r.id); setEditUrl(r.sourceUrl || ""); }}
                        >
                          Edit Link
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 hover:text-destructive"
                          onClick={() => { if (confirm(`Remove "${r.company}" in ${r.state}?`)) deleteRoute.mutate(r.id); }}
                          disabled={deleteRoute.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {editingRouteId === r.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                        <Button
                          size="sm" className="h-8 text-xs"
                          onClick={() => updateRouteUrl.mutate({ id: r.id, url: editUrl })}
                          disabled={updateRouteUrl.isPending || !editUrl}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-8 text-xs"
                          onClick={() => setEditingRouteId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "flagged" && (
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Flag className="w-4 h-4 text-destructive" />
                Member-Reported Routes
                <span className="text-xs text-muted-foreground font-normal">— review and remove expired listings</span>
              </h2>
            </CardHeader>
            <CardContent>
              {flaggedRoutes.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No flagged routes — all listings look good.</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-border/50">
                  {flaggedRoutes.map((r: any) => (
                    <div key={r.id} className="py-4 flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{r.company || r.companyName}</p>
                          <span className="bg-destructive/20 text-destructive text-xs px-1.5 py-0.5 rounded-full">
                            {r.flag_count || r.flagCount} report{(r.flag_count || r.flagCount) > 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.metroCity}, {r.state}</p>
                        {r.sourceUrl && (
                          <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-xs">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" /> Check listing
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unflagRoute.mutate(r.id)}
                          disabled={unflagRoute.isPending}
                        >
                          Looks fine
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => { if (confirm(`Remove "${r.company || r.companyName}"?`)) removeRoute.mutate(r.id); }}
                          disabled={removeRoute.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
