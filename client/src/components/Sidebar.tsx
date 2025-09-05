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
}

export default function Sidebar({ filters, onFiltersChange }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    industries: true,
    departments: true,
    containerTypes: true,
    accessLevels: true,
  });

  // Fetch filter options
  const { data: industries = [] } = useQuery<string[]>({
    queryKey: ['/api/filters/industries'],
    retry: false,
  });

  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/filters/departments'],
    retry: false,
  });

  const containerTypes = [
    { id: 'app', label: 'Web Resource' },
    { id: 'voice', label: 'Voice Model' },
    { id: 'workflow', label: 'Workflow' },
  ];

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
    <aside className="w-64 bg-card border-r border-border flex-shrink-0">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
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

        <ScrollArea className="sidebar-scroll max-h-[calc(100vh-200px)]">
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
                <div className="space-y-2">
                  {industries.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No industries found</div>
                  ) : (
                    industries.map((industry) => (
                      <div key={industry} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`industry-${industry}`}
                          checked={filters.industries.includes(industry)}
                          onCheckedChange={(checked) => handleFilterChange('industries', industry, !!checked)}
                          data-testid={`filter-industry-${industry}`}
                        />
                        <label 
                          htmlFor={`industry-${industry}`} 
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          {industry}
                        </label>
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
                <div className="space-y-2">
                  {departments.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No departments found</div>
                  ) : (
                    departments.map((department) => (
                      <div key={department} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`department-${department}`}
                          checked={filters.departments.includes(department)}
                          onCheckedChange={(checked) => handleFilterChange('departments', department, !!checked)}
                          data-testid={`filter-department-${department}`}
                        />
                        <label 
                          htmlFor={`department-${department}`} 
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          {department}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Container Types */}
            <div className="space-y-3">
              <button 
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection('containerTypes')}
              >
                <h4 className="text-sm font-medium text-foreground">Container Types</h4>
                <i className={`fas fa-chevron-${expandedSections.containerTypes ? 'up' : 'down'} text-xs text-muted-foreground`}></i>
              </button>
              {expandedSections.containerTypes && (
                <div className="space-y-2">
                  {containerTypes.map((type) => (
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
        </ScrollArea>
      </div>
    </aside>
  );
}
