import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, MapPin, DollarSign, Shield } from "lucide-react";

export default function AuthPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(30,10%,6%)] via-[hsl(30,8%,9%)] to-[hsl(30,10%,6%)] flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Gold gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(42_92%_50%_/_0.04),transparent_70%)]" />
        
        <div className="relative z-10 max-w-md text-center space-y-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center">
            <svg viewBox="0 0 48 48" className="w-16 h-16" fill="none">
              <rect x="4" y="8" width="40" height="32" rx="4" stroke="hsl(42, 92%, 50%)" strokeWidth="2.5" />
              <path d="M4 16h40" stroke="hsl(42, 92%, 50%)" strokeWidth="2" opacity="0.4" />
              <path d="M16 24l6 6 10-12" stroke="hsl(42, 92%, 50%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Route Runner
            </h1>
            <p className="text-sm text-primary font-semibold tracking-widest uppercase mt-1">
              by Six Figure Courier
            </p>
          </div>
          
          <p className="text-muted-foreground leading-relaxed">
            The most comprehensive database of open courier and independent contractor routes across all 50 states. Updated weekly.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: MapPin, label: "50 States", desc: "Nationwide coverage" },
              { icon: Truck, label: "All Vehicles", desc: "Car to box truck" },
              { icon: DollarSign, label: "Pay Data", desc: "Verified rates" },
              { icon: Shield, label: "Weekly Updates", desc: "Fresh every Monday" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-left p-3 rounded-md border border-border/50 bg-card/30">
                <Icon className="w-4 h-4 text-primary mb-2" />
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-xl font-bold tracking-tight">Route Runner</h1>
            <p className="text-xs text-primary font-semibold tracking-widest uppercase mt-1">
              by Six Figure Courier
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <h2 className="text-lg font-semibold">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to access your routes</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
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
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Min 6 characters"
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
                Don't have an account? <a href="https://www.sixfigurecouriers.com" className="text-primary hover:underline">Subscribe here</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
