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
  const [typeFilter, setTypeFilter] = useState<'all' | 'app' | 'voice' | 'workflow'>('all');

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

  // Fetch company's assigned containers, fallback to all containers if no company
  const { data: containers = [], isLoading: containersLoading } = useQuery<Container[]>({
    queryKey: ['/api/company/containers', searchQuery],
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      // If company containers fail, try regular containers
      if (error?.message?.includes('not associated with a company')) {
        return false; // Don't retry, we'll use the fallback below
      }
      return failureCount < 3;
    },
  });

  // Fallback to regular containers if company containers fail
  const { data: fallbackContainers = [] } = useQuery<Container[]>({
    queryKey: ['/api/containers', searchQuery],
    enabled: isAuthenticated && containers.length === 0 && !containersLoading,
    retry: false,
  });

  // Use company containers if available, otherwise use fallback
  const displayContainers = containers.length > 0 ? containers : fallbackContainers;

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

  // Fetch company statistics, fallback to regular stats
  const { data: stats } = useQuery<ContainerStats>({
    queryKey: ['/api/company/stats'],
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('not associated with a company')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fallback stats
  const { data: fallbackStats } = useQuery<ContainerStats>({
    queryKey: ['/api/stats'],
    enabled: isAuthenticated && !stats,
    retry: false,
  });

  const displayStats = stats || fallbackStats;

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

  // Filter containers by search and type
  const filteredContainers = filterContainersBySearch(displayContainers);
  const allFilteredContainers = typeFilter === 'all' 
    ? filteredContainers 
    : filteredContainers.filter(container => container.type === typeFilter);

  // Count containers by type for filter buttons
  const containerCounts = {
    all: filteredContainers.length,
    app: filteredContainers.filter(c => c.type === 'app').length,
    voice: filteredContainers.filter(c => c.type === 'voice').length,
    workflow: filteredContainers.filter(c => c.type === 'workflow').length,
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
              <Link href="/dashboard">
                <Button variant="outline" size="sm" data-testid="manage-button">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              </Link>
            </div>
          </div>

          {/* Statistics Cards */}
          <StatisticsCards stats={displayStats} />
          
          {/* Container Type Filter */}
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-sm font-medium text-muted-foreground mr-2">Filter by type:</span>
            <div className="flex items-center space-x-1">
              <Button 
                variant={typeFilter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTypeFilter('all')}
                data-testid="filter-all"
              >
                All ({containerCounts.all})
              </Button>
              <Button 
                variant={typeFilter === 'app' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTypeFilter('app')}
                data-testid="filter-apps"
              >
                <i className="fas fa-cube mr-1"></i>
                Apps ({containerCounts.app})
              </Button>
              <Button 
                variant={typeFilter === 'voice' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTypeFilter('voice')}
                data-testid="filter-voices"
              >
                <i className="fas fa-microphone mr-1"></i>
                Voices ({containerCounts.voice})
              </Button>
              <Button 
                variant={typeFilter === 'workflow' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTypeFilter('workflow')}
                data-testid="filter-workflows"
              >
                <i className="fas fa-project-diagram mr-1"></i>
                Workflows ({containerCounts.workflow})
              </Button>
            </div>
          </div>
        </div>

        {/* All Containers Mixed View */}
        <div className="w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Your Containers</h2>
            <p className="text-muted-foreground">All your organization's apps, voices, and workflows in one place</p>
          </div>
          
          {containersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading containers...</div>
            </div>
          ) : allFilteredContainers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl text-muted-foreground mb-4">📦</div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Containers Available</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || typeFilter !== 'all' 
                  ? `No containers match your ${typeFilter !== 'all' ? typeFilter + ' ' : ''}${searchQuery ? 'search ' : ''}criteria.` 
                  : "No containers have been assigned to your organization yet."}
              </p>
              <Link href="/library">
                <Button variant="outline" data-testid="browse-library-button">
                  Browse Library
                </Button>
              </Link>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "space-y-4"
            }>
              {allFilteredContainers.map((container) => {
                // Render different card types based on container type
                if (container.type === 'app') {
                  return (
                    <AppCard 
                      key={container.id}
                      container={container}
                      onView={handleContainerView}
                      onDelete={() => {}}
                      canDelete={false}
                      data-testid={`app-card-${container.id}`}
                    />
                  );
                }
                if (container.type === 'voice') {
                  return (
                    <VoiceCard 
                      key={container.id}
                      container={container}
                      onView={handleContainerView}
                      onDelete={() => {}}
                      canDelete={false}
                      data-testid={`voice-card-${container.id}`}
                    />
                  );
                }
                if (container.type === 'workflow') {
                  return (
                    <WorkflowCard 
                      key={container.id}
                      container={container}
                      onView={handleContainerView}
                      onDelete={() => {}}
                      canDelete={false}
                      data-testid={`workflow-card-${container.id}`}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}