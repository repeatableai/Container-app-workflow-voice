import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertContainerSchema, insertUserPermissionSchema, updateUserPermissionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Include permissions in user response
      const permissions = await storage.getUserPermissions(userId);
      res.json({ ...user, permissions });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Container routes
  app.get('/api/containers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const permissions = await storage.getUserPermissions(userId);
      
      if (!user || !permissions) {
        return res.status(404).json({ message: "User not found" });
      }

      const { type, industry, department, visibility, search } = req.query;
      
      // Check permissions for container types
      if (type) {
        if (type === 'app' && !permissions.canAccessApps) {
          return res.status(403).json({ message: "No access to apps" });
        }
        if (type === 'voice' && !permissions.canAccessVoices) {
          return res.status(403).json({ message: "No access to voices" });
        }
        if (type === 'workflow' && !permissions.canAccessWorkflows) {
          return res.status(403).json({ message: "No access to workflows" });
        }
      }

      const containers = await storage.getContainers({
        type: type as string,
        industry: industry as string,
        department: department as string,
        visibility: visibility as string,
        search: search as string,
        userId,
      });

      res.json(containers);
    } catch (error) {
      console.error("Error fetching containers:", error);
      res.status(500).json({ message: "Failed to fetch containers" });
    }
  });

  app.post('/api/containers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only admins can create containers
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create containers" });
      }

      const containerData = insertContainerSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const container = await storage.createContainer(containerData);
      res.status(201).json(container);
    } catch (error) {
      console.error("Error creating container:", error);
      res.status(500).json({ message: "Failed to create container" });
    }
  });

  app.put('/api/containers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update containers" });
      }

      const containerData = insertContainerSchema.partial().parse(req.body);
      const container = await storage.updateContainer(req.params.id, containerData);
      res.json(container);
    } catch (error) {
      console.error("Error updating container:", error);
      res.status(500).json({ message: "Failed to update container" });
    }
  });

  app.delete('/api/containers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete containers" });
      }

      await storage.deleteContainer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting container:", error);
      res.status(500).json({ message: "Failed to delete container" });
    }
  });

  app.post('/api/containers/:id/view', isAuthenticated, async (req: any, res) => {
    try {
      await storage.incrementContainerViews(req.params.id);
      res.status(200).json({ message: "View count incremented" });
    } catch (error) {
      console.error("Error incrementing views:", error);
      res.status(500).json({ message: "Failed to increment views" });
    }
  });

  // Statistics route
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getContainerStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'viewer')) {
        return res.status(403).json({ message: "Admin or Viewer access required" });
      }

      const users = await storage.getAllUsers();
      const usersWithPermissions = await Promise.all(
        users.map(async (u) => {
          const permissions = await storage.getUserPermissions(u.id);
          return { ...u, permissions };
        })
      );
      
      res.json(usersWithPermissions);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const permissionData = updateUserPermissionSchema.parse({
        userId: req.params.id,
        ...req.body,
      });

      const permissions = await storage.updateUserPermissions(permissionData);
      res.json(permissions);
    } catch (error) {
      console.error("Error updating permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  app.put('/api/admin/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      if (!['admin', 'viewer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user role using the upsert method
      const updatedUser = await storage.upsertUser({
        ...targetUser,
        role,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Filter options
  app.get('/api/filters/industries', isAuthenticated, async (req: any, res) => {
    try {
      const industries = await storage.getIndustries();
      res.json(industries);
    } catch (error) {
      console.error("Error fetching industries:", error);
      res.status(500).json({ message: "Failed to fetch industries" });
    }
  });

  app.get('/api/filters/departments', isAuthenticated, async (req: any, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Company container routes
  app.get('/api/company/containers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user to find their company
      const user = await storage.getUser(userId);
      if (!user || !user.companyId) {
        return res.status(400).json({ message: "User is not associated with a company" });
      }
      
      const { search } = req.query;
      
      // Get company's containers
      let containers = await storage.getCompanyContainers(user.companyId);
      
      // Apply search filter if provided
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        containers = containers.filter(container => 
          container.title.toLowerCase().includes(searchLower) ||
          container.description?.toLowerCase().includes(searchLower) ||
          container.industry?.toLowerCase().includes(searchLower) ||
          container.department?.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(containers);
    } catch (error) {
      console.error("Error fetching company containers:", error);
      res.status(500).json({ message: "Failed to fetch company containers" });
    }
  });
  
  app.get('/api/company/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user to find their company
      const user = await storage.getUser(userId);
      if (!user || !user.companyId) {
        return res.status(400).json({ message: "User is not associated with a company" });
      }
      
      const stats = await storage.getCompanyStats(user.companyId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching company stats:", error);
      res.status(500).json({ message: "Failed to fetch company stats" });
    }
  });

  // Admin route to assign containers to companies
  app.post('/api/admin/assign-container', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { companyId, containerId } = req.body;
      
      const assignment = await storage.assignContainerToCompany({
        companyId,
        containerId,
        assignedBy: userId,
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning container to company:", error);
      res.status(500).json({ message: "Failed to assign container" });
    }
  });
  
  // Company management routes
  app.post('/api/admin/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const company = await storage.createCompany(req.body);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
