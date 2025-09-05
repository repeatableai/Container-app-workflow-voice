import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Box, Users, Shield, Zap } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Box className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">ContainerHub</span>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="login-button"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">
            Manage Your Digital Containers with Ease
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Organize and access your Apps, AI Voices, and Automation Workflows in one centralized platform. 
            Built for teams that need secure, role-based container management.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg"
            data-testid="hero-cta-button"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Box className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Three Container Types
              </h3>
              <p className="text-muted-foreground">
                Organize your Apps, AI Voices, and Automation Workflows in dedicated categories with powerful filtering.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Role-Based Access
              </h3>
              <p className="text-muted-foreground">
                Granular permission controls for different user roles with admin oversight and viewer restrictions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-chart-2" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Import & Export
              </h3>
              <p className="text-muted-foreground">
                Easily import individual containers or perform mass imports to quickly populate your library.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Organize Your Containers?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join teams already using ContainerHub to streamline their digital workflows 
              and improve collaboration across departments.
            </p>
            <Button 
              onClick={handleLogin}
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="bottom-cta-button"
            >
              Start Managing Containers
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Box className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">ContainerHub</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 ContainerHub. Streamline your digital container management.
          </p>
        </div>
      </footer>
    </div>
  );
}
