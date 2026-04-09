import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, MapPin, DollarSign, RefreshCw, ArrowRight, Lock } from "lucide-react";

const PURCHASE_URL = "https://sixfigurecouriers.com/products/open-contracts-list-only?selling_plan=692611514736&variant=51699556221296";

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<"landing" | "login">("landing");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: MapPin, label: "50 States", desc: "Nationwide route coverage" },
    { icon: Truck, label: "All Vehicles", desc: "Car, van, sprinter, box truck" },
    { icon: DollarSign, label: "Pay Data", desc: "Verified weekly pay rates" },
    { icon: RefreshCw, label: "Twice-Weekly Updates", desc: "Fresh routes every Mon & Thu" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

      <div className="flex flex-1">
        {/* Left panel — branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(30,10%,5%)] to-[hsl(30,8%,8%)] flex-col justify-center items-center p-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_40%_40%,hsl(42_92%_50%_/_0.06),transparent_65%)]" />
          <div className="relative z-10 max-w-md space-y-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 48 48" className="w-12 h-12 flex-shrink-0" fill="none">
                <rect x="4" y="8" width="40" height="32" rx="4" stroke="hsl(42, 92%, 50%)" strokeWidth="2.5"/>
                <path d="M4 16h40" stroke="hsl(42, 92%, 50%)" strokeWidth="2" opacity="0.4"/>
                <path d="M16 24l6 6 10-12" stroke="hsl(42, 92%, 50%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Route Runner</h1>
                <p className="text-xs text-primary font-semibold tracking-widest uppercase">by Six Figure Courier</p>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed text-base">
              The most comprehensive database of open courier and independent contractor routes across all 50 states — updated twice a week.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="p-4 rounded-lg border border-border/40 bg-white/[0.02] space-y-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                New listings added every Monday &amp; Thursday.
              </p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">

            {/* Mobile logo */}
            <div className="lg:hidden text-center">
              <h1 className="text-xl font-bold">Route Runner</h1>
              <p className="text-xs text-primary font-semibold tracking-widest uppercase mt-1">by Six Figure Courier</p>
            </div>

            {mode === "landing" ? (
              <div className="space-y-4">
                {/* Already a member */}
                <Card className="border-border/60">
                  <CardContent className="pt-6 pb-6 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold">Already a member?</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Sign in to access your courier routes dashboard.</p>
                    <Button
                      className="w-full"
                      onClick={() => setMode("login")}
                      data-testid="button-go-to-login"
                    >
                      Member Login <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Not a member yet */}
                <Card className="border-primary/30 bg-primary/[0.04]">
                  <CardContent className="pt-6 pb-6 space-y-3">
                    <div>
                      <h2 className="font-semibold text-primary">Not a member yet?</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get unlimited access to open courier and independent contractor routes across all 50 states for just <strong className="text-foreground">$19/month</strong>.
                      </p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✓ Direct links to every active listing</li>
                      <li>✓ Filter by state, vehicle type &amp; pay</li>
                      <li>✓ New routes added every week automatically</li>
                    </ul>
                    <a href={PURCHASE_URL} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-primary hover:bg-primary/90" data-testid="button-subscribe">
                        Get Route Runner — $19/mo <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </a>
                    <p className="text-xs text-muted-foreground text-center">Cancel anytime. Login details sent instantly after purchase.</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => { setMode("landing"); setError(""); }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  ← Back
                </button>
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold mb-1">Welcome back</h2>
                    <p className="text-sm text-muted-foreground mb-5">Sign in to access your routes</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          data-testid="input-login-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Your password"
                          required
                          data-testid="input-login-password"
                        />
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                        {loading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Not a member? <a href={PURCHASE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Subscribe for $19/mo</a>
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
