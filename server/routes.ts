import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertContainerSchema, insertUserPermissionSchema, updateUserPermissionSchema } from "@shared/schema";

// Server-side URL analysis function
function analyzeAppContent(html: string, url: string) {
  // Enhanced HTML parsing using regex (since we don't have DOM in Node.js)
  let title = '';
  let appType = '';
  let features: string[] = [];
  
  // 1. Extract title from various sources
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const twitterTitleMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  
  title = titleMatch?.[1] || ogTitleMatch?.[1] || twitterTitleMatch?.[1] || '';
  
  // 2. Analyze page structure for app type
  const hasCanvas = /<canvas[^>]*>/i.test(html);
  const hasVideo = /<video[^>]*>/i.test(html);
  const hasForm = /<form[^>]*>/i.test(html);
  
  // Look for specific button patterns
  const buttonPatterns = {
    drawing: /draw|paint|brush|canvas|sketch/i,
    media: /play|pause|volume|video|audio|media/i,
    chat: /chat|send|message|talk/i,
    task: /task|todo|complete|check/i,
    calendar: /calendar|schedule|event|date/i,
    calculator: /calculate|equals|number|math/i,
    game: /game|play|score|level|start/i,
    editor: /edit|save|format|bold|italic/i
  };
  
  // Detect app type based on elements and content
  if (hasCanvas || buttonPatterns.drawing.test(html)) {
    appType = 'Drawing/Graphics';
    if (!title || title.includes('localhost') || title.includes('index')) {
      title = 'Creative Drawing Canvas';
    }
    features.push('canvas drawing', 'graphics tools');
  } else if (hasVideo || buttonPatterns.media.test(html)) {
    appType = 'Media Player';
    if (!title || title.includes('localhost') || title.includes('index')) {
      title = 'Media Player Application';
    }
    features.push('video playback', 'media controls');
  } else if (buttonPatterns.chat.test(html)) {
    appType = 'Communication';
    if (!title || title.includes('localhost') || title.includes('index')) {
      title = 'Chat Application';
    }
    features.push('messaging', 'real-time communication');
  } else if (buttonPatterns.task.test(html)) {
    appType = 'Productivity';
    if (!title || title.includes('localhost') || title.includes('index')) {
      title = 'Task Management Tool';
    }
    features.push('task tracking', 'productivity management');
  } else if (buttonPatterns.calendar.test(html)) {
    appType = 'Productivity';
    if (!title || title.includes('localhost') || title.includes('index')) {
      title = 'Calendar Application';
    }
    features.push('scheduling', 'calendar management');
  } else if (buttonPatterns.calculator.test(html)) {
    appType = 'Utility';
    if (!title || title.includes('localhost') || title.includes('index')) {
      title = 'Calculator Tool';
    }
    features.push('calculations', 'math operations');
  } else if (buttonPatterns.game.test(html)) {
    appType = 'Entertainment';
    if (!title || title.includes('localhost') || title.includes('index')) {
      title = 'Game Application';
    }
    features.push('gaming', 'entertainment');
  } else if (buttonPatterns.editor.test(html) || hasForm) {
    appType = 'Productivity';
    if (!title || title.includes('localhost') || title.includes('index')) {
      title = 'Editor Application';
    }
    features.push('text editing', 'content creation');
  } else {
    appType = 'Web Application';
    if (!title || title.includes('localhost') || title.includes('index')) {
      const hostname = new URL(url).hostname.replace('www.', '');
      title = `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} App`;
    }
    features.push('web app', 'interactive tool');
  }
  
  // Generate description
  let description = '';
  if (appType === 'Drawing/Graphics') {
    description = 'Interactive drawing and graphics application with canvas-based tools for creating digital artwork and sketches.';
  } else if (appType === 'Media Player') {
    description = 'Media playback application supporting video and audio content with standard media controls.';
  } else if (appType === 'Communication') {
    description = 'Real-time communication platform enabling messaging and chat functionality between users.';
  } else if (appType === 'Productivity') {
    description = 'Productivity application designed to help users manage tasks, schedules, or content efficiently.';
  } else if (appType === 'Utility') {
    description = 'Utility application providing specialized tools and calculations for everyday use.';
  } else if (appType === 'Entertainment') {
    description = 'Interactive entertainment application featuring games and engaging user experiences.';
  } else {
    description = `Web-based application from ${new URL(url).hostname} providing interactive functionality and user tools.`;
  }
  
  return {
    title: title.trim(),
    description,
    appType,
    features
  };
}

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
        isMarketplace: false, // Only non-marketplace containers for regular use
        userId,
      });

      res.json(containers);
    } catch (error) {
      console.error("Error fetching containers:", error);
      res.status(500).json({ message: "Failed to fetch containers" });
    }
  });

  // Marketplace containers endpoint
  app.get('/api/containers/marketplace', isAuthenticated, async (req: any, res) => {
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
        isMarketplace: true, // Only marketplace containers for library
        userId,
      });

      res.json(containers);
    } catch (error) {
      console.error("Error fetching marketplace containers:", error);
      res.status(500).json({ message: "Failed to fetch marketplace containers" });
    }
  });

  app.post('/api/containers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
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

  // URL analysis endpoint
  app.post('/api/analyze-url', isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      // Fetch and analyze the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        // Return fallback data for failed requests
        const hostname = new URL(url).hostname.replace('www.', '');
        return res.json({
          title: `App from ${hostname}`,
          description: `Application imported from ${url}`,
          appType: 'Web Application',
          features: ['imported', 'web app']
        });
      }

      const html = await response.text();
      const analysis = analyzeAppContent(html, url);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing URL:", error);
      
      // Return fallback data on any error
      try {
        const hostname = new URL(req.body.url).hostname.replace('www.', '');
        res.json({
          title: `App from ${hostname}`,
          description: `Application imported from ${req.body.url}`,
          appType: 'Web Application',
          features: ['imported', 'web app']
        });
      } catch {
        res.status(500).json({ message: "Failed to analyze URL" });
      }
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
