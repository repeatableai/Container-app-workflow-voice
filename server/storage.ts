import {
  users,
  companies,
  containers,
  companyContainerAssignments,
  userPermissions,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Container,
  type InsertContainer,
  type CompanyContainerAssignment,
  type InsertCompanyContainerAssignment,
  type UserPermission,
  type InsertUserPermission,
  type UpdateUserPermission,
  type ContainerStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, inArray, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Company operations
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Container operations
  getContainers(filters?: {
    type?: string;
    industry?: string;
    department?: string;
    visibility?: string;
    search?: string;
    isMarketplace?: boolean;
    userId?: string;
  }): Promise<Container[]>;
  getContainerById(id: string): Promise<Container | undefined>;
  createContainer(container: InsertContainer): Promise<Container>;
  updateContainer(id: string, updates: Partial<InsertContainer>): Promise<Container>;
  deleteContainer(id: string): Promise<void>;
  incrementContainerViews(id: string): Promise<void>;
  
  // Company container operations
  getCompanyContainers(companyId: string): Promise<Container[]>;
  assignContainerToCompany(assignment: InsertCompanyContainerAssignment): Promise<CompanyContainerAssignment>;
  getCompanyStats(companyId: string): Promise<ContainerStats>;
  
  // Permission operations
  getUserPermissions(userId: string): Promise<UserPermission | undefined>;
  upsertUserPermissions(permissions: InsertUserPermission): Promise<UserPermission>;
  updateUserPermissions(updates: UpdateUserPermission): Promise<UserPermission>;
  
  // Statistics
  getContainerStats(): Promise<ContainerStats>;
  
  // Filter options
  getIndustries(): Promise<string[]>;
  getDepartments(): Promise<string[]>;
  
  // URL Health Monitoring
  getContainersForHealthCheck(lastCheckedBefore: Date): Promise<Container[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
      
    // Create default permissions for new users
    await this.upsertUserPermissions({
      userId: user.id,
      canAccessApps: true,
      canAccessVoices: true,
      canAccessWorkflows: true,
    });
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getContainers(filters?: {
    type?: string;
    industry?: string;
    department?: string;
    visibility?: string;
    search?: string;
    isMarketplace?: boolean;
    userId?: string;
  }): Promise<Container[]> {
    // For workflows with industry/department filters, handle JSON parsing
    if (filters?.type === 'workflow' && (filters?.industry || filters?.department)) {
      // Get all workflows first, then filter in memory based on JSON data
      let query = db.select().from(containers);
      const conditions: any[] = [];

      conditions.push(eq(containers.type, 'workflow'));
      
      if (filters?.visibility) {
        conditions.push(eq(containers.visibility, filters.visibility as any));
      }
      
      if (filters?.isMarketplace !== undefined) {
        conditions.push(eq(containers.isMarketplace, filters.isMarketplace));
      }
      
      if (filters?.search) {
        conditions.push(
          sql`(${containers.title} ILIKE ${`%${filters.search}%`} OR ${containers.description} ILIKE ${`%${filters.search}%`})`
        );
      }

      query = query.where(and(...conditions)) as any;
      const allWorkflows = await query.orderBy(desc(containers.createdAt));
      
      // Filter workflows based on JSON data
      const filteredWorkflows = allWorkflows.filter(container => {
        try {
          if (!container.fullInstructions) return false;
          
          const parsed = JSON.parse(container.fullInstructions);
          const workflowJSON = parsed.Workflow_JSON ? JSON.parse(parsed.Workflow_JSON) : parsed;
          
          // Extract actual industry/department from JSON
          let actualIndustry = 'Business';
          let actualDepartment = 'General Business';
          
          // Industry extraction
          if (workflowJSON.department) {
            actualIndustry = workflowJSON.department;
          } else if (parsed.Department) {
            actualIndustry = parsed.Department;
          } else if (workflowJSON.industry) {
            actualIndustry = workflowJSON.industry;
          } else {
            // Fallback to title analysis
            const title = (container.title || '').toLowerCase();
            if (title.includes('healthcare') || title.includes('medical')) {
              actualIndustry = 'Healthcare';
            } else if (title.includes('finance') || title.includes('bank')) {
              actualIndustry = 'Finance';
            } else if (title.includes('education') || title.includes('school')) {
              actualIndustry = 'Education';
            } else if (title.includes('retail') || title.includes('sales')) {
              actualIndustry = 'Retail';
            } else if (title.includes('technology') || title.includes('software')) {
              actualIndustry = 'Technology';
            }
          }
          
          // Department extraction  
          if (workflowJSON.role) {
            actualDepartment = workflowJSON.role;
          } else if (parsed.Role) {
            actualDepartment = parsed.Role;
          } else if (workflowJSON.department) {
            actualDepartment = workflowJSON.department;
          } else if (parsed.Department) {
            actualDepartment = parsed.Department;
          } else {
            // Fallback to title analysis
            const title = container.title?.toLowerCase() || '';
            if (title.includes('administrative assistant') || title.includes('admin')) {
              actualDepartment = 'Administration';
            } else if (title.includes('executive assistant')) {
              actualDepartment = 'Executive Office';
            } else if (title.includes('human resources') || title.includes('hr')) {
              actualDepartment = 'Human Resources';
            } else if (title.includes('facilities')) {
              actualDepartment = 'Facilities';
            } else if (title.includes('marketing')) {
              actualDepartment = 'Marketing';
            } else if (title.includes('finance') || title.includes('accounting')) {
              actualDepartment = 'Finance';
            } else if (title.includes('sales')) {
              actualDepartment = 'Sales';
            } else if (title.includes('operations') || title.includes('management')) {
              actualDepartment = 'Operations';
            }
          }
          
          // Apply filters
          if (filters?.industry && actualIndustry !== filters.industry) {
            return false;
          }
          
          if (filters?.department && actualDepartment !== filters.department) {
            return false;
          }
          
          return true;
        } catch (error) {
          // If JSON parsing fails, exclude from results for workflow filters
          return false;
        }
      });
      
      return filteredWorkflows;
    }
    
    // For non-workflow types or workflows without industry/department filters, use original logic
    let query = db.select().from(containers);
    const conditions: any[] = [];

    if (filters?.type) {
      conditions.push(eq(containers.type, filters.type as any));
    }
    
    if (filters?.industry) {
      conditions.push(eq(containers.industry, filters.industry));
    }
    
    if (filters?.department) {
      conditions.push(eq(containers.department, filters.department));
    }
    
    if (filters?.visibility) {
      conditions.push(eq(containers.visibility, filters.visibility as any));
    }
    
    if (filters?.isMarketplace !== undefined) {
      conditions.push(eq(containers.isMarketplace, filters.isMarketplace));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`(${containers.title} ILIKE ${`%${filters.search}%`} OR ${containers.description} ILIKE ${`%${filters.search}%`})`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(containers.createdAt));
  }

  async getContainerById(id: string): Promise<Container | undefined> {
    const [container] = await db.select().from(containers).where(eq(containers.id, id));
    return container;
  }

  async createContainer(container: InsertContainer): Promise<Container> {
    const [newContainer] = await db
      .insert(containers)
      .values(container)
      .returning();
    return newContainer;
  }

  async createContainersBulk(containerDataList: InsertContainer[]): Promise<Container[]> {
    if (containerDataList.length === 0) {
      return [];
    }
    
    console.log(`[BULK CREATE] Processing ${containerDataList.length} containers`);
    const startTime = Date.now();
    
    // Use Drizzle's bulk insert for optimal performance
    const createdContainers = await db
      .insert(containers)
      .values(containerDataList)
      .returning();
    
    const endTime = Date.now();
    console.log(`[BULK CREATE] Created ${createdContainers.length} containers in ${endTime - startTime}ms`);
    
    return createdContainers;
  }

  async updateContainer(id: string, updates: Partial<InsertContainer>): Promise<Container> {
    const [updatedContainer] = await db
      .update(containers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(containers.id, id))
      .returning();
    return updatedContainer;
  }

  async deleteContainer(id: string): Promise<void> {
    await db.delete(containers).where(eq(containers.id, id));
  }

  async incrementContainerViews(id: string): Promise<void> {
    await db
      .update(containers)
      .set({ views: sql`${containers.views} + 1` })
      .where(eq(containers.id, id));
  }

  async getUserPermissions(userId: string): Promise<UserPermission | undefined> {
    const [permissions] = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));
    return permissions;
  }

  async upsertUserPermissions(permissions: InsertUserPermission): Promise<UserPermission> {
    const [upsertedPermissions] = await db
      .insert(userPermissions)
      .values(permissions)
      .onConflictDoUpdate({
        target: userPermissions.userId,
        set: {
          ...permissions,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedPermissions;
  }

  async updateUserPermissions(updates: UpdateUserPermission): Promise<UserPermission> {
    const [updatedPermissions] = await db
      .update(userPermissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPermissions.userId, updates.userId))
      .returning();
    return updatedPermissions;
  }

  async getContainerStats(): Promise<ContainerStats> {
    const [totalContainersResult] = await db
      .select({ count: count() })
      .from(containers);
    
    const [totalViewsResult] = await db
      .select({ totalViews: sql<number>`sum(${containers.views})` })
      .from(containers);
    
    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(users);

    const [appsResult] = await db
      .select({ count: count() })
      .from(containers)
      .where(eq(containers.type, 'app'));

    const [voicesResult] = await db
      .select({ count: count() })
      .from(containers)
      .where(eq(containers.type, 'voice'));

    const [workflowsResult] = await db
      .select({ count: count() })
      .from(containers)
      .where(eq(containers.type, 'workflow'));

    return {
      totalContainers: totalContainersResult.count,
      totalViews: totalViewsResult.totalViews || 0,
      activeUsers: activeUsersResult.count,
      apps: appsResult.count,
      voices: voicesResult.count,
      workflows: workflowsResult.count,
    };
  }

  async getIndustries(): Promise<string[]> {
    const result = await db
      .selectDistinct({ industry: containers.industry })
      .from(containers)
      .where(sql`${containers.industry} IS NOT NULL`);
    
    return result.map(r => r.industry).filter(Boolean) as string[];
  }

  async getDepartments(): Promise<string[]> {
    const result = await db
      .selectDistinct({ department: containers.department })
      .from(containers)
      .where(sql`${containers.department} IS NOT NULL`);
    
    return result.map(r => r.department).filter(Boolean) as string[];
  }

  async getIndustriesWithCounts(type?: string): Promise<{ name: string; count: number }[]> {
    if (type === 'workflow') {
      // For workflows, extract industries from JSON fullInstructions
      const result = await db
        .select({
          fullInstructions: containers.fullInstructions,
          title: containers.title,
          description: containers.description,
        })
        .from(containers)
        .where(and(
          eq(containers.type, 'workflow'),
          eq(containers.isMarketplace, true)
        ));
      
      const industries = new Map<string, number>();
      
      result.forEach(r => {
        let industry = 'Business'; // fallback
        
        try {
          if (r.fullInstructions) {
            const parsed = JSON.parse(r.fullInstructions);
            const workflowJSON = parsed.Workflow_JSON ? JSON.parse(parsed.Workflow_JSON) : parsed;
            
            // Extract industry from JSON structure
            if (workflowJSON.department) {
              industry = workflowJSON.department;
            } else if (parsed.Department) {
              industry = parsed.Department;
            } else if (workflowJSON.industry) {
              industry = workflowJSON.industry;
            } else {
              // Intelligent industry extraction from titles
              const title = (r.title || '').toLowerCase();
              if (title.includes('healthcare') || title.includes('medical')) {
                industry = 'Healthcare';
              } else if (title.includes('finance') || title.includes('bank') || title.includes('investment')) {
                industry = 'Finance';
              } else if (title.includes('education') || title.includes('school') || title.includes('university')) {
                industry = 'Education';
              } else if (title.includes('retail') || title.includes('sales') || title.includes('customer')) {
                industry = 'Retail';
              } else if (title.includes('manufacturing') || title.includes('production')) {
                industry = 'Manufacturing';
              } else if (title.includes('technology') || title.includes('software') || title.includes('it')) {
                industry = 'Technology';
              } else if (title.includes('legal') || title.includes('law')) {
                industry = 'Legal';
              } else {
                industry = 'Business';
              }
            }
          }
        } catch (error) {
          industry = 'Business';
        }
        
        industries.set(industry, (industries.get(industry) || 0) + 1);
      });
      
      return Array.from(industries.entries()).map(([name, count]) => ({ name, count }));
    }
    
    // For non-workflow types, use original logic
    let whereConditions = [sql`${containers.industry} IS NOT NULL`, eq(containers.isMarketplace, true)];
    
    if (type) {
      whereConditions.push(eq(containers.type, type as 'app' | 'voice' | 'workflow'));
    }
    
    const result = await db
      .select({
        industry: containers.industry,
        count: sql<number>`count(*)`
      })
      .from(containers)
      .where(and(...whereConditions))
      .groupBy(containers.industry);
    
    return result.map(r => ({ name: r.industry!, count: r.count })).filter(item => item.name);
  }

  async getDepartmentsWithCounts(type?: string): Promise<{ name: string; count: number }[]> {
    if (type === 'workflow') {
      // For workflows, extract departments from JSON fullInstructions first, then fallback to text analysis
      const result = await db
        .select({
          fullInstructions: containers.fullInstructions,
          title: containers.title,
          description: containers.description,
        })
        .from(containers)
        .where(and(
          eq(containers.type, 'workflow'),
          eq(containers.isMarketplace, true)
        ));
      
      const departments = new Map<string, number>();
      
      result.forEach(r => {
        let department = 'General Business'; // fallback
        
        try {
          if (r.fullInstructions) {
            const parsed = JSON.parse(r.fullInstructions);
            const workflowJSON = parsed.Workflow_JSON ? JSON.parse(parsed.Workflow_JSON) : parsed;
            
            // First try to extract from JSON structure
            if (workflowJSON.role) {
              department = workflowJSON.role;
            } else if (parsed.Role) {
              department = parsed.Role;
            } else if (workflowJSON.department) {
              department = workflowJSON.department;
            } else if (parsed.Department) {
              department = parsed.Department;
            }
          }
        } catch (error) {
          // If JSON parsing fails, fall back to text analysis
        }
        
        // If no department found in JSON, use text analysis
        if (department === 'General Business') {
          const title = r.title?.toLowerCase() || '';
          const description = r.description?.toLowerCase() || '';
          const text = `${title} ${description}`;
          
          if (text.includes('human resources') || text.includes('hr specialist')) {
            department = 'Human Resources';
          } else if (text.includes('administrative assistant') || text.includes('admin')) {
            department = 'Administration';
          } else if (text.includes('executive assistant')) {
            department = 'Executive Office';
          } else if (text.includes('facilities manager') || text.includes('facilities')) {
            department = 'Facilities';
          } else if (text.includes('marketing') || text.includes('social media')) {
            department = 'Marketing';
          } else if (text.includes('finance') || text.includes('accounting') || text.includes('budget')) {
            department = 'Finance';
          } else if (text.includes('sales') || text.includes('business development')) {
            department = 'Sales';
          } else if (text.includes('it') || text.includes('technical') || text.includes('support')) {
            department = 'IT Support';
          } else if (text.includes('operations') || text.includes('management')) {
            department = 'Operations';
          }
        }
        
        departments.set(department, (departments.get(department) || 0) + 1);
      });
      
      return Array.from(departments.entries()).map(([name, count]) => ({ name, count }));
    }
    
    // For other types, use the existing department field
    let whereConditions = [sql`${containers.department} IS NOT NULL`, eq(containers.isMarketplace, true)];
    
    if (type) {
      whereConditions.push(eq(containers.type, type as 'app' | 'voice' | 'workflow'));
    }
    
    const result = await db
      .select({
        department: containers.department,
        count: sql<number>`count(*)`
      })
      .from(containers)
      .where(and(...whereConditions))
      .groupBy(containers.department);
    
    return result.map(r => ({ name: r.department!, count: r.count })).filter(item => item.name);
  }

  async getUseCasesWithCounts(type?: string): Promise<{ name: string; count: number }[]> {
    if (type === 'voice') {
      // For voices, extract use cases from ai_voice_agent_type field
      const result = await db
        .select({
          aiVoiceAgentType: containers.aiVoiceAgentType,
          count: sql<number>`count(*)`
        })
        .from(containers)
        .where(and(
          eq(containers.type, 'voice'),
          eq(containers.isMarketplace, true),
          sql`${containers.aiVoiceAgentType} IS NOT NULL`
        ))
        .groupBy(containers.aiVoiceAgentType);
      
      return result.map(r => ({ name: r.aiVoiceAgentType!, count: r.count })).filter(item => item.name);
    }

    if (type === 'workflow') {
      // For workflows, extract use cases from JSON fullInstructions first, then fallback to text analysis
      const result = await db
        .select({
          fullInstructions: containers.fullInstructions,
          title: containers.title,
          description: containers.description,
        })
        .from(containers)
        .where(and(
          eq(containers.type, 'workflow'),
          eq(containers.isMarketplace, true)
        ));
      
      const useCases = new Map<string, number>();
      
      result.forEach(r => {
        let useCase = 'General Automation'; // fallback
        
        try {
          if (r.fullInstructions) {
            const parsed = JSON.parse(r.fullInstructions);
            const workflowJSON = parsed.Workflow_JSON ? JSON.parse(parsed.Workflow_JSON) : parsed;
            
            // First try to extract from JSON structure
            if (workflowJSON.category) {
              useCase = workflowJSON.category;
            } else if (parsed.Category) {
              useCase = parsed.Category;
            } else if (workflowJSON.use_case) {
              useCase = workflowJSON.use_case;
            } else if (parsed.Use_Case) {
              useCase = parsed.Use_Case;
            }
          }
        } catch (error) {
          // If JSON parsing fails, fall back to text analysis
        }
        
        // If no use case found in JSON, use text analysis
        if (useCase === 'General Automation') {
          const title = r.title?.toLowerCase() || '';
          const description = r.description?.toLowerCase() || '';
          const text = `${title} ${description}`;
          
          if (text.includes('scheduling') || text.includes('meeting') || text.includes('calendar')) {
            useCase = 'Scheduling & Meetings';
          } else if (text.includes('document') && (text.includes('prep') || text.includes('format'))) {
            useCase = 'Document Management';
          } else if (text.includes('data entry') || text.includes('reporting')) {
            useCase = 'Data Entry & Reporting';
          } else if (text.includes('travel') || text.includes('expense')) {
            useCase = 'Travel & Expense Management';
          } else if (text.includes('maintenance') || text.includes('facilities')) {
            useCase = 'Facilities Management';
          } else if (text.includes('budget') || text.includes('financial') || text.includes('cost')) {
            useCase = 'Financial Management';
          } else if (text.includes('compliance') || text.includes('audit')) {
            useCase = 'Compliance & Audit';
          } else if (text.includes('communication') || text.includes('email') || text.includes('slack')) {
            useCase = 'Communication Automation';
          } else if (text.includes('hr') || text.includes('human resources') || text.includes('employee')) {
            useCase = 'Human Resources';
          } else if (text.includes('admin') || text.includes('coordination')) {
            useCase = 'Administrative Support';
          }
        }
        
        useCases.set(useCase, (useCases.get(useCase) || 0) + 1);
      });
      
      return Array.from(useCases.entries()).map(([name, count]) => ({ name, count }));
    }
    
    // For apps or fallback, try useCase field first
    let whereConditions = [sql`${containers.useCase} IS NOT NULL`, eq(containers.isMarketplace, true)];
    if (type) {
      whereConditions.push(eq(containers.type, type as 'app' | 'voice' | 'workflow'));
    }
    
    const result = await db
      .select({
        useCase: containers.useCase,
        count: sql<number>`count(*)`
      })
      .from(containers)
      .where(and(...whereConditions))
      .groupBy(containers.useCase);
    
    return result.map(r => ({ name: r.useCase!, count: r.count })).filter(item => item.name);
  }
  
  // Company operations
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }
  
  async createCompany(companyData: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(companyData)
      .returning();
    return company;
  }
  
  // Company container operations
  async getCompanyContainers(companyId: string): Promise<Container[]> {
    const result = await db
      .select({
        id: containers.id,
        title: containers.title,
        description: containers.description,
        type: containers.type,
        industry: containers.industry,
        department: containers.department,
        visibility: containers.visibility,
        tags: containers.tags,
        url: containers.url,
        isMarketplace: containers.isMarketplace,
        views: containers.views,
        createdBy: containers.createdBy,
        createdAt: containers.createdAt,
        updatedAt: containers.updatedAt,
      })
      .from(containers)
      .innerJoin(companyContainerAssignments, eq(containers.id, companyContainerAssignments.containerId))
      .where(eq(companyContainerAssignments.companyId, companyId))
      .orderBy(desc(containers.createdAt));
    
    return result;
  }
  
  async assignContainerToCompany(assignmentData: InsertCompanyContainerAssignment): Promise<CompanyContainerAssignment> {
    const [assignment] = await db
      .insert(companyContainerAssignments)
      .values(assignmentData)
      .returning();
    return assignment;
  }
  
  async getCompanyStats(companyId: string): Promise<ContainerStats> {
    // Get all containers assigned to the company
    const companyContainers = await this.getCompanyContainers(companyId);
    
    // Calculate stats based on company's assigned containers
    const totalContainers = companyContainers.length;
    const totalViews = companyContainers.reduce((sum, container) => sum + (container.views || 0), 0);
    
    // Count by type
    const apps = companyContainers.filter(c => c.type === 'app').length;
    const voices = companyContainers.filter(c => c.type === 'voice').length;
    const workflows = companyContainers.filter(c => c.type === 'workflow').length;
    
    // Get company users count
    const usersResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.companyId, companyId));
    
    const activeUsers = usersResult[0]?.count || 0;
    
    return {
      totalContainers,
      totalViews,
      activeUsers,
      apps,
      voices,
      workflows,
    };
  }

  async getContainersForHealthCheck(lastCheckedBefore: Date): Promise<Container[]> {
    // Get containers that have URLs and haven't been checked recently
    const results = await db
      .select()
      .from(containers)
      .where(
        and(
          sql`url IS NOT NULL AND url != '' AND url != '-'`,
          sql`url_last_checked IS NULL OR url_last_checked < ${lastCheckedBefore}`
        )
      )
      .orderBy(containers.updatedAt);
    return results;
  }
}

export const storage = new DatabaseStorage();
