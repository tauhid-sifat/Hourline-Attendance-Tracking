import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (err: any) {
      console.error("Error resetting password:", err);
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Check Your Email</CardTitle>
          <CardDescription className="text-muted-foreground text-center">
            We've sent a password reset link to <span className="text-foreground font-medium">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Click the link in the email to reset your password. The link will expire in 24 hours.
          </p>

          <Button
            onClick={() => setIsSubmitted(false)}
            variant="outline"
            className="w-full border-border hover:bg-secondary"
          >
            Send Again
          </Button>

          <Link to="/" className="block">
            <Button
              variant="ghost"
              className="w-full hover:bg-secondary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Forgot Password?</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your email and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-input-background border-border focus:ring-primary focus:border-primary"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>

          <Link to="/" className="block">
            <Button
              type="button"
              variant="ghost"
              className="w-full hover:bg-secondary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
