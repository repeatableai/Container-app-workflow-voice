import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/Header";
import StatisticsCards from "@/components/StatisticsCards";
import AppCard from "@/components/AppCard";
import VoiceCard from "@/components/VoiceCard";
import WorkflowCard from "@/components/WorkflowCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Grid, List, Settings } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Container, ContainerStats } from "@shared/schema";
import { Link } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch company's assigned containers
  const { data: containers = [], isLoading: containersLoading } = useQuery<Container[]>({
    queryKey: ['/api/company/containers', searchQuery],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch company statistics
  const { data: stats } = useQuery<ContainerStats>({
    queryKey: ['/api/company/stats'],
    enabled: isAuthenticated,
    retry: false,
  });

  const handleContainerView = async (id: string) => {
    try {
      await fetch(`/api/containers/${id}/view`, {
        method: 'POST',
        credentials: 'include',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company/stats'] });
    } catch (error) {
      // Silently fail for view tracking
    }
  };

  // Filter containers by type
  const apps = containers.filter(c => c.type === 'app');
  const voices = containers.filter(c => c.type === 'voice');
  const workflows = containers.filter(c => c.type === 'workflow');

  // Filter containers by search query
  const filterContainersBySearch = (containers: Container[]) => {
    if (!searchQuery.trim()) return containers;
    return containers.filter(container =>
      container.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome{user?.firstName ? `, ${user.firstName}` : ''}
              </h1>
              <p className="text-lg text-muted-foreground">
                Access your organization's apps, voices, and workflows
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button 
                  variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                  data-testid="view-mode-grid"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                  data-testid="view-mode-list"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Admin/Management Links */}
              {user?.role === 'admin' && (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" data-testid="manage-button">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Statistics Cards */}
          <StatisticsCards stats={stats} />
        </div>

        {/* Container Tabs */}
        <Tabs defaultValue="apps" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="apps" data-testid="tab-apps">
              <i className="fas fa-cube mr-2"></i>
              Apps ({apps.length})
            </TabsTrigger>
            <TabsTrigger value="voices" data-testid="tab-voices">
              <i className="fas fa-microphone mr-2"></i>
              AI Voices ({voices.length})
            </TabsTrigger>
            <TabsTrigger value="workflows" data-testid="tab-workflows">
              <i className="fas fa-project-diagram mr-2"></i>
              Workflows ({workflows.length})
            </TabsTrigger>
          </TabsList>

          {/* Apps Tab */}
          <TabsContent value="apps" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground mb-2">Your Applications</h2>
              <p className="text-muted-foreground">Launch and access your organization's applications</p>
            </div>
            
            {containersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading applications...</div>
              </div>
            ) : filterContainersBySearch(apps).length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-cube text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-medium text-foreground mb-2">No Applications Available</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "No applications match your search criteria." : "No applications have been assigned to your organization yet."}
                </p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {filterContainersBySearch(apps).map((container) => (
                  <AppCard 
                    key={container.id}
                    container={container}
                    onView={handleContainerView}
                    onDelete={() => {}} // No-op function since users can't delete company containers
                    canDelete={false}
                    data-testid={`app-card-${container.id}`}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Voices Tab */}
          <TabsContent value="voices" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground mb-2">AI Voice Library</h2>
              <p className="text-muted-foreground">Browse and use your organization's AI voices</p>
            </div>
            
            {containersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading voices...</div>
              </div>
            ) : filterContainersBySearch(voices).length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-microphone text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-medium text-foreground mb-2">No AI Voices Available</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "No voices match your search criteria." : "No AI voices have been assigned to your organization yet."}
                </p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {filterContainersBySearch(voices).map((container) => (
                  <VoiceCard 
                    key={container.id}
                    container={container}
                    onView={handleContainerView}
                    onDelete={() => {}} // No-op function since users can't delete company containers
                    canDelete={false}
                    data-testid={`voice-card-${container.id}`}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground mb-2">Automation Workflows</h2>
              <p className="text-muted-foreground">Execute and monitor your organization's automated processes</p>
            </div>
            
            {containersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading workflows...</div>
              </div>
            ) : filterContainersBySearch(workflows).length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-project-diagram text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-medium text-foreground mb-2">No Workflows Available</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "No workflows match your search criteria." : "No workflows have been assigned to your organization yet."}
                </p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {filterContainersBySearch(workflows).map((container) => (
                  <WorkflowCard 
                    key={container.id}
                    container={container}
                    onView={handleContainerView}
                    onDelete={() => {}} // No-op function since users can't delete company containers
                    canDelete={false}
                    data-testid={`workflow-card-${container.id}`}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}