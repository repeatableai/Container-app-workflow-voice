import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    containerTypes: true,
    accessLevels: true,
    categories: true,
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

  // Dynamic filter categories based on active tab
  const getFilterCategories = () => {
    switch (activeTab) {
      case 'app':
        return {
          types: [
            { id: 'web', label: 'Web Application' },
            { id: 'mobile', label: 'Mobile App' },
            { id: 'desktop', label: 'Desktop Software' },
            { id: 'api', label: 'API Service' },
          ],
          categories: [
            { id: 'productivity', label: 'Productivity' },
            { id: 'communication', label: 'Communication' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'security', label: 'Security' },
          ]
        };
      case 'voice':
        return {
          types: [
            { id: 'healthcare', label: 'Healthcare' },
            { id: 'finance', label: 'Finance' },
            { id: 'education', label: 'Education' },
            { id: 'retail', label: 'Retail' },
            { id: 'technology', label: 'Technology' },
          ],
          categories: [
            { id: 'sales', label: 'Sales' },
            { id: 'marketing', label: 'Marketing' },
            { id: 'support', label: 'Customer Support' },
            { id: 'training', label: 'Training' },
            { id: 'hr', label: 'Human Resources' },
          ],
          useCases: [
            { id: 'ivr', label: 'IVR Systems' },
            { id: 'appointment', label: 'Appointment Booking' },
            { id: 'survey', label: 'Survey & Feedback' },
            { id: 'sales-demo', label: 'Sales Demo' },
            { id: 'onboarding', label: 'Employee Onboarding' },
          ]
        };
      default:
        return {
          types: [
            { id: 'automation', label: 'Automation' },
            { id: 'integration', label: 'Integration' },
            { id: 'data-processing', label: 'Data Processing' },
            { id: 'notification', label: 'Notification' },
          ],
          categories: [
            { id: 'operations', label: 'Operations' },
            { id: 'hr', label: 'Human Resources' },
            { id: 'finance', label: 'Finance' },
            { id: 'marketing', label: 'Marketing' },
          ]
        };
    }
  };

  const filterCategories = getFilterCategories();
  
  const accessLevels = [
    { id: 'public', label: 'Public' },
    { id: 'restricted', label: 'Restricted' },
    { id: 'admin_only', label: 'Admin Only' },
  ];

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
              <h4 className="text-sm font-medium text-foreground">Industries</h4>
              <i className={`fas fa-chevron-${expandedSections.industries ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
            </button>
            {expandedSections.industries && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {industries.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No industries found</div>
                ) : (
                  industries.map((industry) => (
                    <div key={industry.name} className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`industry-${industry.name}`}
                          checked={filters.industries.includes(industry.name)}
                          onCheckedChange={(checked) => handleFilterChange('industries', industry.name, !!checked)}
                          data-testid={`filter-industry-${industry.name}`}
                        />
                        <label 
                          htmlFor={`industry-${industry.name}`} 
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          {industry.name}
                        </label>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
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
              <h4 className="text-sm font-medium text-foreground">Departments</h4>
              <i className={`fas fa-chevron-${expandedSections.departments ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
            </button>
            {expandedSections.departments && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {departments.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No departments found</div>
                ) : (
                  departments.map((department) => (
                    <div key={department.name} className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`department-${department.name}`}
                          checked={filters.departments.includes(department.name)}
                          onCheckedChange={(checked) => handleFilterChange('departments', department.name, !!checked)}
                          data-testid={`filter-department-${department.name}`}
                        />
                        <label 
                          htmlFor={`department-${department.name}`} 
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          {department.name}
                        </label>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {department.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Dynamic Types */}
          <div className="space-y-3">
            <button 
              className="flex items-center justify-between w-full text-left"
              onClick={() => toggleSection('containerTypes')}
            >
              <h4 className="text-sm font-medium text-foreground">
                {activeTab === 'app' ? 'App Type' : activeTab === 'voice' ? 'Industry' : 'Workflow Type'}
              </h4>
              <i className={`fas fa-chevron-${expandedSections.containerTypes ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
            </button>
            {expandedSections.containerTypes && (
              <div className="space-y-2">
                {filterCategories.types.map((type: { id: string; label: string }) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`type-${type.id}`}
                      checked={filters.containerTypes.includes(type.id)}
                      onCheckedChange={(checked) => handleFilterChange('containerTypes', type.id, !!checked)}
                      data-testid={`filter-type-${type.id}`}
                    />
                    <label 
                      htmlFor={`type-${type.id}`} 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      {type.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Categories */}
          <div className="space-y-3">
            <button 
              className="flex items-center justify-between w-full text-left"
              onClick={() => toggleSection('categories')}
            >
              <h4 className="text-sm font-medium text-foreground">Categories</h4>
              <i className={`fas fa-chevron-${expandedSections.categories ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
            </button>
            {expandedSections.categories && (
              <div className="space-y-2">
                {filterCategories.categories.map((category: { id: string; label: string }) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`category-${category.id}`}
                      checked={filters.containerTypes.includes(category.id)}
                      onCheckedChange={(checked) => handleFilterChange('containerTypes', category.id, !!checked)}
                      data-testid={`filter-category-${category.id}`}
                    />
                    <label 
                      htmlFor={`category-${category.id}`} 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      {category.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Use Cases (Voice only) */}
          {activeTab === 'voice' && filterCategories.useCases && (
            <div className="space-y-3">
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('useCases')}
              >
                <h4 className="text-sm font-medium text-foreground">Use Cases</h4>
                <i className={`fas fa-chevron-${expandedSections.useCases ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
              </button>
              {expandedSections.useCases && (
                <div className="space-y-2">
                  {filterCategories.useCases?.map((useCase: { id: string; label: string }) => (
                    <div key={useCase.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`usecase-${useCase.id}`}
                        checked={filters.containerTypes.includes(useCase.id)}
                        onCheckedChange={(checked) => handleFilterChange('containerTypes', useCase.id, !!checked)}
                        data-testid={`filter-usecase-${useCase.id}`}
                      />
                      <label 
                        htmlFor={`usecase-${useCase.id}`} 
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        {useCase.label}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Access Levels */}
          <div className="space-y-3">
            <button 
              className="flex items-center justify-between w-full text-left"
              onClick={() => toggleSection('accessLevels')}
            >
              <h4 className="text-sm font-medium text-foreground">Access Level</h4>
              <i className={`fas fa-chevron-${expandedSections.accessLevels ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
            </button>
            {expandedSections.accessLevels && (
              <div className="space-y-2">
                {accessLevels.map((level) => (
                  <div key={level.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`access-${level.id}`}
                      checked={filters.accessLevels.includes(level.id)}
                      onCheckedChange={(checked) => handleFilterChange('accessLevels', level.id, !!checked)}
                      data-testid={`filter-access-${level.id}`}
                    />
                    <label 
                      htmlFor={`access-${level.id}`} 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      {level.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}