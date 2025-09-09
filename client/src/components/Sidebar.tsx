import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  filters: {
    industries: string[];
    departments: string[];
    containerTypes: string[];
    accessLevels: string[];
    savedOnly: boolean;
  };
  onFiltersChange: (filters: any) => void;
  activeTab?: 'app' | 'voice' | 'workflow';
}

export default function Sidebar({ filters, onFiltersChange, activeTab = 'app' }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    industries: true,
    departments: true,
    useCases: true,
  });

  // Fetch filter options with tab-specific results and counts
  const { data: industries = [] } = useQuery<{ name: string; count: number }[]>({
    queryKey: ['/api/filters/industries', activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/filters/industries?type=${activeTab}`, {
        credentials: 'include'
      });
      return response.json();
    },
    retry: false,
  });

  const { data: departments = [] } = useQuery<{ name: string; count: number }[]>({
    queryKey: ['/api/filters/departments', activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/filters/departments?type=${activeTab}`, {
        credentials: 'include'
      });
      return response.json();
    },
    retry: false,
  });

  const { data: useCases = [] } = useQuery<{ name: string; count: number }[]>({
    queryKey: ['/api/filters/usecases', activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/filters/usecases?type=${activeTab}`, {
        credentials: 'include'
      });
      return response.json();
    },
    retry: false,
  });

  const handleClearAll = () => {
    onFiltersChange({
      industries: [],
      departments: [],
      containerTypes: [],
      accessLevels: [],
      savedOnly: false,
    });
  };

  const handleFilterChange = (category: string, value: string, checked: boolean) => {
    const newFilters = { ...filters };
    const categoryKey = category as keyof Pick<typeof filters, 'industries' | 'departments' | 'containerTypes' | 'accessLevels'>;
    
    if (checked) {
      newFilters[categoryKey] = [
        ...(newFilters[categoryKey]),
        value
      ];
    } else {
      newFilters[categoryKey] = (
        newFilters[categoryKey]
      ).filter(item => item !== value);
    }
    onFiltersChange(newFilters);
  };

  const handleSavedOnlyChange = (checked: boolean) => {
    onFiltersChange({ ...filters, savedOnly: checked });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-border flex-shrink-0 h-screen flex flex-col">
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-foreground">
            {activeTab === 'app' ? 'App Filters' : activeTab === 'voice' ? 'Voice Filters' : 'Workflow Filters'}
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearAll}
            className="text-xs text-primary hover:text-primary/80"
            data-testid="clear-all-filters"
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-6">
          {/* Saved Only Filter */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="saved-only"
                checked={filters.savedOnly}
                onCheckedChange={handleSavedOnlyChange}
                data-testid="filter-saved-only"
              />
              <label htmlFor="saved-only" className="text-sm text-foreground cursor-pointer">
                Saved Only
              </label>
            </div>
          </div>

          {/* Industries */}
          <div className="space-y-3">
            <button 
              className="flex items-center justify-between w-full text-left"
              onClick={() => toggleSection('industries')}
            >
              <h4 className="text-sm font-medium text-foreground">Industry</h4>
              <i className={`fas fa-chevron-${expandedSections.industries ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
            </button>
            {expandedSections.industries && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {industries.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No industries found</div>
                ) : (
                  industries.map((industry) => (
                    <div key={industry.name} className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <Checkbox 
                          id={`industry-${industry.name}`}
                          checked={filters.industries.includes(industry.name)}
                          onCheckedChange={(checked) => handleFilterChange('industries', industry.name, !!checked)}
                          data-testid={`filter-industry-${industry.name}`}
                        />
                        <label 
                          htmlFor={`industry-${industry.name}`} 
                          className="text-sm text-muted-foreground cursor-pointer truncate"
                        >
                          {industry.name}
                        </label>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex-shrink-0">
                        {industry.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Departments */}
          <div className="space-y-3">
            <button 
              className="flex items-center justify-between w-full text-left"
              onClick={() => toggleSection('departments')}
            >
              <h4 className="text-sm font-medium text-foreground">Department</h4>
              <i className={`fas fa-chevron-${expandedSections.departments ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
            </button>
            {expandedSections.departments && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {departments.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No departments found</div>
                ) : (
                  departments.map((department) => (
                    <div key={department.name} className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <Checkbox 
                          id={`department-${department.name}`}
                          checked={filters.departments.includes(department.name)}
                          onCheckedChange={(checked) => handleFilterChange('departments', department.name, !!checked)}
                          data-testid={`filter-department-${department.name}`}
                        />
                        <label 
                          htmlFor={`department-${department.name}`} 
                          className="text-sm text-muted-foreground cursor-pointer truncate"
                        >
                          {department.name}
                        </label>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex-shrink-0">
                        {department.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Use Cases */}
          <div className="space-y-3">
            <button 
              className="flex items-center justify-between w-full text-left"
              onClick={() => toggleSection('useCases')}
            >
              <h4 className="text-sm font-medium text-foreground">Use Case</h4>
              <i className={`fas fa-chevron-${expandedSections.useCases ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
            </button>
            {expandedSections.useCases && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {useCases.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No use cases found</div>
                ) : (
                  useCases.map((useCase) => (
                    <div key={useCase.name} className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <Checkbox 
                          id={`usecase-${useCase.name}`}
                          checked={filters.containerTypes.includes(useCase.name)}
                          onCheckedChange={(checked) => handleFilterChange('containerTypes', useCase.name, !!checked)}
                          data-testid={`filter-usecase-${useCase.name}`}
                        />
                        <label 
                          htmlFor={`usecase-${useCase.name}`} 
                          className="text-sm text-muted-foreground cursor-pointer truncate"
                        >
                          {useCase.name}
                        </label>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex-shrink-0">
                        {useCase.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}