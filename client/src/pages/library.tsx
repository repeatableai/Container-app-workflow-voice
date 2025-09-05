import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/Header";
import AppCard from "@/components/AppCard";
import VoiceCard from "@/components/VoiceCard";
import WorkflowCard from "@/components/WorkflowCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Grid, List, ShoppingCart, Package } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Container } from "@shared/schema";

export default function Library() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'app' | 'voice' | 'workflow'>('app');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    industries: [] as string[],
    departments: [] as string[],
    containerTypes: [] as string[],
    accessLevels: [] as string[],
    savedOnly: false,
  });

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

  // Fetch containers for library browsing
  const { data: containers = [], isLoading: containersLoading } = useQuery<Container[]>({
    queryKey: ['/api/containers', activeTab, searchQuery, filters],
    enabled: isAuthenticated,
    retry: false,
  });

  const handleTabChange = (tab: 'app' | 'voice' | 'workflow') => {
    setActiveTab(tab);
  };

  const handleContainerView = async (id: string) => {
    try {
      await fetch(`/api/containers/${id}/view`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      // Silently fail for view tracking
    }
  };

  const handleAddToOrganization = async (containerId: string) => {
    try {
      // This would be the "purchase" or "add to organization" functionality
      toast({
        title: "Coming Soon",
        description: "Container purchasing functionality will be available soon.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add container to your organization.",
        variant: "destructive",
      });
    }
  };

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

  // Filter containers by type
  const apps = containers.filter(c => c.type === 'app');
  const voices = containers.filter(c => c.type === 'voice');
  const workflows = containers.filter(c => c.type === 'workflow');

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
          {/* Library Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
                  <Package className="w-8 h-8 mr-3 text-primary" />
                  Container Library
                </h1>
                <p className="text-lg text-muted-foreground">
                  Browse and add containers to your organization
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
              </div>
            </div>
          </div>

          {/* Container Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as 'app' | 'voice' | 'workflow')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="app" data-testid="tab-apps">
                <i className="fas fa-cube mr-2"></i>
                App Marketplace ({apps.length})
              </TabsTrigger>
              <TabsTrigger value="voice" data-testid="tab-voices">
                <i className="fas fa-microphone mr-2"></i>
                Voice Studio ({voices.length})
              </TabsTrigger>
              <TabsTrigger value="workflow" data-testid="tab-workflows">
                <i className="fas fa-project-diagram mr-2"></i>
                Automation Hub ({workflows.length})
              </TabsTrigger>
            </TabsList>

            {/* Apps Tab */}
            <TabsContent value="app" className="mt-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground mb-2">App Marketplace</h2>
                <p className="text-muted-foreground">Discover and add powerful applications to your organization</p>
              </div>
              
              {containersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading applications...</div>
                </div>
              ) : filterContainersBySearch(apps).length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-cube text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Applications Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "No applications match your search criteria." : "No applications are currently available in the marketplace."}
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
                      onDelete={() => {}}
                      canDelete={false}

                      data-testid={`app-card-${container.id}`}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Voices Tab */}
            <TabsContent value="voice" className="mt-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground mb-2">Voice Studio</h2>
                <p className="text-muted-foreground">Browse premium AI voices for your projects</p>
              </div>
              
              {containersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading voices...</div>
                </div>
              ) : filterContainersBySearch(voices).length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-microphone text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Voices Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "No voices match your search criteria." : "No AI voices are currently available in the studio."}
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
                      onDelete={() => {}}
                      canDelete={false}

                      data-testid={`voice-card-${container.id}`}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Workflows Tab */}
            <TabsContent value="workflow" className="mt-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground mb-2">Automation Hub</h2>
                <p className="text-muted-foreground">Streamline your processes with ready-made workflows</p>
              </div>
              
              {containersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading workflows...</div>
                </div>
              ) : filterContainersBySearch(workflows).length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-project-diagram text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Workflows Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "No workflows match your search criteria." : "No automation workflows are currently available in the hub."}
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
                      onDelete={() => {}}
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