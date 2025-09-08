import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import AppCard from "@/components/AppCard";
import VoiceCard from "@/components/VoiceCard";
import WorkflowCard from "@/components/WorkflowCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Grid, List, Package } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Container, ContainerStats } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Library() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'app' | 'voice' | 'workflow'>('app');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    industries: [] as string[],
    departments: [] as string[],
    containerTypes: [] as string[],
    accessLevels: [] as string[],
    savedOnly: false,
  });
  const [sortBy, setSortBy] = useState('Recently Added');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isReanalyzing, setIsReanalyzing] = useState(false);

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

  // Fetch containers for library browsing (marketplace only)
  const { data: containers = [], isLoading: containersLoading } = useQuery<Container[]>({
    queryKey: ['marketplace-containers', activeTab, searchQuery, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab) params.append('type', activeTab);
      if (searchQuery) params.append('search', searchQuery);
      if (filters.industries.length > 0) params.append('industry', filters.industries[0]);
      if (filters.departments.length > 0) params.append('department', filters.departments[0]);
      
      const url = `/api/containers/marketplace?${params.toString()}`;
      console.log('Fetching marketplace containers from:', url);
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Marketplace containers received:', data.length);
      return data;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch statistics
  const { data: stats } = useQuery<ContainerStats>({
    queryKey: ['/api/stats'],
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    } catch (error) {
      // Silently fail for view tracking
    }
  };

  const handleContainerEdit = async (id: string, updates: Partial<Container>) => {
    try {
      console.log(`Editing container ${id}:`, updates);
      const response = await fetch(`/api/containers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update container: ${response.statusText}`);
      }
      
      // Invalidate and refetch containers
      queryClient.invalidateQueries({ queryKey: ['marketplace-containers'] });
      
      toast({
        title: "Success",
        description: "Container updated successfully",
      });
    } catch (error) {
      console.error('Failed to update container:', error);
      toast({
        title: "Error",
        description: "Failed to update container. Please try again.",
        variant: "destructive",
      });
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

  const handleBulkReanalyze = async () => {
    try {
      setIsReanalyzing(true);
      const response = await apiRequest('POST', '/api/bulk-reanalyze');
      const result = await response.json();
      
      toast({
        title: "Re-analysis Complete!",
        description: `${result.updated} containers updated with proper titles. ${result.failed} failed.`,
        variant: "default",
      });
      
      // Refresh the containers list
      queryClient.invalidateQueries({ queryKey: ['marketplace-containers'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to re-analyze containers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReanalyzing(false);
    }
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
      
      <div className="flex h-screen">
        <Sidebar 
          filters={filters}
          onFiltersChange={setFilters}
          activeTab={activeTab}
        />
        
        <main className="flex-1 overflow-auto">
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-900 border-b border-border sticky top-0 z-40 backdrop-blur-lg shadow-sm">
            <div className="flex space-x-8 px-6">
              <button 
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'app' 
                    ? 'tab-active border-primary text-primary' 
                    : 'border-transparent hover:text-primary text-muted-foreground'
                }`}
                onClick={() => handleTabChange('app')}
                data-testid="tab-apps"
              >
                <i className="fas fa-cube mr-2"></i>
                App Marketplace
                <span className="ml-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                  {stats?.apps || 0}
                </span>
              </button>
              <button 
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'voice' 
                    ? 'tab-active border-primary text-primary' 
                    : 'border-transparent hover:text-primary text-muted-foreground'
                }`}
                onClick={() => handleTabChange('voice')}
                data-testid="tab-voices"
              >
                <i className="fas fa-microphone mr-2"></i>
                Voice Studio
                <span className="ml-2 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  {stats?.voices || 0}
                </span>
              </button>
              <button 
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'workflow' 
                    ? 'tab-active border-primary text-primary' 
                    : 'border-transparent hover:text-primary text-muted-foreground'
                }`}
                onClick={() => handleTabChange('workflow')}
                data-testid="tab-workflows"
              >
                <i className="fas fa-project-diagram mr-2"></i>
                Automation Hub
                <span className="ml-2 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  {stats?.workflows || 0}
                </span>
              </button>
            </div>
          </div>

          {/* Content Header */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center">
                  <Package className="w-6 h-6 mr-2 text-primary" />
                  {activeTab === 'app' && 'App Marketplace'}
                  {activeTab === 'voice' && 'Voice Studio'}
                  {activeTab === 'workflow' && 'Automation Hub'}
                </h1>
                <p className="text-muted-foreground">
                  {activeTab === 'app' && 'Discover and add powerful applications to your organization'}
                  {activeTab === 'voice' && 'Browse premium AI voices for your projects'}
                  {activeTab === 'workflow' && 'Streamline your processes with ready-made workflows'}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Bulk Re-analysis Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkReanalyze}
                  disabled={isReanalyzing}
                  data-testid="bulk-reanalyze-button"
                  className="text-xs"
                >
                  {isReanalyzing ? 'Re-analyzing...' : 'Fix App Titles'}
                </Button>
                
                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recently Added">Recently Added</SelectItem>
                    <SelectItem value="Most Popular">Most Popular</SelectItem>
                    <SelectItem value="Alphabetical">Alphabetical</SelectItem>
                    <SelectItem value="Most Viewed">Most Viewed</SelectItem>
                  </SelectContent>
                </Select>
                
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

            {/* Container Content */}
            {containersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading containers...</div>
              </div>
            ) : containers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl text-muted-foreground mb-4">📦</div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Containers Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? `No ${activeTab}s match your search criteria.` : `No ${activeTab}s are currently available in the library.`}
                </p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {containers.map((container) => {
                  // Render different card types based on container type
                  if (container.type === 'app') {
                    return (
                      <AppCard 
                        key={container.id}
                        container={container}
                        onView={handleContainerView}
                        onEdit={handleContainerEdit}
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
                        onEdit={handleContainerEdit}
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
                        onEdit={handleContainerEdit}
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
    </div>
  );
}