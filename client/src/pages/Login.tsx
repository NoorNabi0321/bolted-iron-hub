import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { HardHat, Shield, BarChart3, Users, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  const loginMutation = trpc.emailAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Logged in successfully!");
      window.location.href = "/";
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const registerMutation = trpc.emailAuth.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setMode("login");
      setName("");
      setCompanyName("");
      setPhone("");
      setPassword("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ name, email, password, companyName: companyName || undefined, phone: phone || undefined });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-red-600 to-red-700 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-2">
            Bolted Iron Hub
          </h1>
          <p className="text-red-200 text-sm">
            Structural & Miscellaneous Steel CRM
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Manage every bolt,
              <br />
              <span className="text-red-200">every beam,</span>
              <br />
              every project.
            </h2>
            <p className="text-red-100 text-lg leading-relaxed">
              A centralized command center for your NYC steel operations — with strict privacy
              isolation between subcontractors.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              {
                icon: Shield,
                title: "Privacy-First Portals",
                desc: "Each sub sees only their assigned jobs",
              },
              {
                icon: BarChart3,
                title: "Financial Tracking",
                desc: "Private billing data visible only to your team",
              },
              {
                icon: Users,
                title: "Role-Based Access",
                desc: "Admin and subcontractor views fully separated",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-xs text-red-200">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-red-300">
          &copy; 2026 Bolted Iron Inc. &middot; New York City
        </div>
      </div>

      {/* Right panel - login/register */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo and heading for form section */}
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="Bolted Iron" className="h-14 w-auto" />
          </div>

          {/* Mobile heading */}
          <div className="lg:hidden">
            <h1 className="text-2xl font-bold text-foreground mb-2">Bolted Iron Hub</h1>
            <p className="text-sm text-muted-foreground">Structural & Miscellaneous Steel CRM</p>
          </div>

          <div className="text-left lg:text-left">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "login"
                ? "Access your projects and team dashboard."
                : "Register to get started. Admin approval is required."}
            </p>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">Company Name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Your Steel Co."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === "register" ? "Min 6 characters" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 6 : 1}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-red-600 hover:bg-red-700 text-white"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === "login" ? (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Sign In
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Toggle login/register */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
            >
              {mode === "login"
                ? "Don't have an account? Register here"
                : "Already have an account? Sign in"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Manus OAuth option */}
          <a href={getLoginUrl()} className="block">
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-medium"
              size="lg"
            >
              Sign in with Manus Account
            </Button>
          </a>

          {mode === "register" && (
            <p className="text-center text-xs text-muted-foreground">
              After registering, an admin must approve your account before you can log in.
            </p>
          )}

          <div className="border-t border-border pt-6">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 sm:p-4 rounded-lg bg-red-50 border border-red-100">
                <p className="text-xs font-medium text-foreground mb-1">Admin Team</p>
                <p className="text-xs text-muted-foreground">Full project & financial access</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs font-medium text-foreground mb-1">Subcontractors</p>
                <p className="text-xs text-muted-foreground">Your assigned jobs only</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
