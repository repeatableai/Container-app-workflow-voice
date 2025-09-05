import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import StatisticsCards from "@/components/StatisticsCards";
import ContainerCard from "@/components/ContainerCard";
import AppCard from "@/components/AppCard";
import VoiceCard from "@/components/VoiceCard";
import WorkflowCard from "@/components/WorkflowCard";
import CreateContainerModal from "@/components/CreateContainerModal";
import ImportModal from "@/components/ImportModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Upload } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Container, ContainerStats } from "@shared/schema";

export default function Dashboard() {
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMassImportModal, setShowMassImportModal] = useState(false);

  // Redirect to home if not authenticated
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

  // Fetch containers
  const { data: containers = [], isLoading: containersLoading } = useQuery<Container[]>({
    queryKey: ['/api/containers', activeTab, searchQuery, filters],
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

  const handleContainerDelete = async (id: string) => {
    try {
      await fetch(`/api/containers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/containers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      toast({
        title: "Success",
        description: "Container deleted successfully",
      });
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to delete container",
        variant: "destructive",
      });
    }
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
          <div className="bg-card border-b border-border sticky top-0 z-40">
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
                Apps
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
                AI Voices
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
                <i className="fas fa-cogs mr-2"></i>
                Automation Workflows
                <span className="ml-2 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  {stats?.workflows || 0}
                </span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {activeTab === 'app' && 'App Marketplace'}
                    {activeTab === 'voice' && 'AI Voice Studio'}
                    {activeTab === 'workflow' && 'Workflow Hub'}
                  </h1>
                  <p className="text-muted-foreground">
                    {activeTab === 'app' && 'Discover and install applications for your organization'}
                    {activeTab === 'voice' && 'Browse and preview AI voices for your projects'}
                    {activeTab === 'workflow' && 'Manage and execute automated business processes'}
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40" data-testid="sort-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recently Added">Recently Added</SelectItem>
                      <SelectItem value="Most Views">Most Views</SelectItem>
                      <SelectItem value="Alphabetical">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline"
                    onClick={() => setShowImportModal(true)}
                    data-testid="button-import"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    onClick={() => setShowMassImportModal(true)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    data-testid="button-mass-import"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Mass Import
                  </Button>
                  
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    data-testid="button-create-new"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New {activeTab === 'app' ? 'App' : activeTab === 'voice' ? 'Voice' : 'Workflow'}
                  </Button>
                </div>
              </div>

              <StatisticsCards stats={stats} />
            </div>

            {/* Container Grid */}
            {containersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading containers...</div>
              </div>
            ) : containers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">No containers found</div>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First {activeTab === 'app' ? 'App' : activeTab === 'voice' ? 'Voice' : 'Workflow'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {containers
                  .filter(container => container.type === activeTab)
                  .map((container) => {
                    if (activeTab === 'app') {
                      return (
                        <AppCard 
                          key={container.id}
                          container={container}
                          onDelete={handleContainerDelete}
                          onView={handleContainerView}
                        />
                      );
                    } else if (activeTab === 'voice') {
                      return (
                        <VoiceCard 
                          key={container.id}
                          container={container}
                          onDelete={handleContainerDelete}
                          onView={handleContainerView}
                        />
                      );
                    } else if (activeTab === 'workflow') {
                      return (
                        <WorkflowCard 
                          key={container.id}
                          container={container}
                          onDelete={handleContainerDelete}
                          onView={handleContainerView}
                        />
                      );
                    }
                    // Fallback to generic card
                    return (
                      <ContainerCard 
                        key={container.id}
                        container={container}
                        onDelete={handleContainerDelete}
                        onView={handleContainerView}
                      />
                    );
                  })}
              </div>
            )}

            {/* Load More Button */}
            {containers.length > 0 && (
              <div className="flex justify-center mt-8">
                <Button 
                  variant="outline"
                  className="px-6 py-3"
                  data-testid="button-load-more"
                >
                  <span>Load More Containers</span>
                  <i className="fas fa-chevron-down ml-2"></i>
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateContainerModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        activeTab={activeTab}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/containers'] });
          queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        }}
      />

      <ImportModal 
        open={showImportModal}
        onOpenChange={setShowImportModal}
        type="single"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/containers'] });
          queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        }}
      />

      <ImportModal 
        open={showMassImportModal}
        onOpenChange={setShowMassImportModal}
        type="mass"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/containers'] });
          queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        }}
      />
    </div>
  );
}
