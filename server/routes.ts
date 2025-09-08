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
  
  // 1. Extract title from various sources with better regex patterns
  const titleMatch = html.match(/<title[^>]*>([^<]+?)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const twitterTitleMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  
  // Try multiple title extraction methods
  title = titleMatch?.[1]?.trim() || ogTitleMatch?.[1]?.trim() || twitterTitleMatch?.[1]?.trim() || '';
  
  // If no title found, try extracting from h1 tags
  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([^<]+?)<\/h1>/i);
    title = h1Match?.[1]?.trim() || '';
  }
  
  // Clean up title - remove common unwanted suffixes and prefixes
  if (title) {
    title = title
      .replace(/\s*[-|–]\s*(Home|Welcome|Index|Main)?\s*$/i, '')
      .replace(/^(Home|Welcome|Index|Main)\s*[-|–]\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // 2. Extract description from meta tags and page content
  let description = '';
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  
  description = metaDescMatch?.[1]?.trim() || ogDescMatch?.[1]?.trim() || '';
  
  // If no meta description, try to extract from first paragraph or div with substantial text
  if (!description) {
    const pMatch = html.match(/<p[^>]*>([^<]{50,200}?)<\/p>/i);
    if (pMatch?.[1]) {
      description = pMatch[1].trim().replace(/\s+/g, ' ');
    }
  }
  
  // 3. Analyze page structure for app type
  const hasCanvas = /<canvas[^>]*>/i.test(html);
  const hasVideo = /<video[^>]*>/i.test(html);
  const hasForm = /<form[^>]*>/i.test(html);
  
  // Look for specific content patterns in the entire HTML
  const contentPatterns = {
    drawing: /draw|paint|brush|canvas|sketch|art|design|illustration|graphic/i,
    media: /play|pause|volume|video|audio|media|music|sound|stream/i,
    chat: /chat|send|message|talk|conversation|discuss|communicate/i,
    task: /task|todo|complete|check|project|manage|organize|productivity/i,
    calendar: /calendar|schedule|event|date|appointment|meeting|plan/i,
    calculator: /calculate|equals|number|math|compute|formula|equation/i,
    game: /game|play|score|level|start|winner|puzzle|challenge|arcade/i,
    editor: /edit|save|format|bold|italic|text|document|write|compose/i,
    dashboard: /dashboard|analytics|metrics|stats|data|chart|graph/i,
    tool: /tool|utility|helper|converter|generator|builder/i
  };
  
  // 4. Detect app type based on elements and content
  if (hasCanvas || contentPatterns.drawing.test(html)) {
    appType = 'Drawing/Graphics';
    features.push('canvas drawing', 'graphics tools', 'creative');
    if (!description) {
      description = 'Interactive drawing and graphics application with canvas-based tools for creating digital artwork and illustrations.';
    }
  } else if (hasVideo || contentPatterns.media.test(html)) {
    appType = 'Media Player';
    features.push('video playback', 'media controls', 'streaming');
    if (!description) {
      description = 'Media playback application supporting video and audio content with standard media controls and streaming capabilities.';
    }
  } else if (contentPatterns.chat.test(html)) {
    appType = 'Communication';
    features.push('messaging', 'real-time communication', 'chat');
    if (!description) {
      description = 'Real-time communication platform enabling messaging and chat functionality between users.';
    }
  } else if (contentPatterns.dashboard.test(html)) {
    appType = 'Analytics';
    features.push('dashboard', 'analytics', 'metrics', 'data visualization');
    if (!description) {
      description = 'Analytics dashboard application providing data visualization, metrics tracking, and business intelligence tools.';
    }
  } else if (contentPatterns.task.test(html)) {
    appType = 'Productivity';
    features.push('task tracking', 'productivity management', 'organization');
    if (!description) {
      description = 'Productivity application designed to help users manage tasks, projects, and organize their workflow efficiently.';
    }
  } else if (contentPatterns.calendar.test(html)) {
    appType = 'Productivity';
    features.push('scheduling', 'calendar management', 'events');
    if (!description) {
      description = 'Calendar and scheduling application for managing events, appointments, and time planning.';
    }
  } else if (contentPatterns.calculator.test(html)) {
    appType = 'Utility';
    features.push('calculations', 'math operations', 'tools');
    if (!description) {
      description = 'Calculator utility application providing mathematical calculations and computational tools.';
    }
  } else if (contentPatterns.game.test(html)) {
    appType = 'Entertainment';
    features.push('gaming', 'entertainment', 'interactive');
    if (!description) {
      description = 'Interactive entertainment application featuring games and engaging user experiences.';
    }
  } else if (contentPatterns.editor.test(html) || hasForm) {
    appType = 'Productivity';
    features.push('text editing', 'content creation', 'writing');
    if (!description) {
      description = 'Text editing and content creation application with formatting tools and document management features.';
    }
  } else if (contentPatterns.tool.test(html)) {
    appType = 'Utility';
    features.push('utility', 'tools', 'helper');
    if (!description) {
      description = 'Utility application providing specialized tools and helpful functions for various tasks.';
    }
  } else {
    appType = 'Web Application';
    features.push('web app', 'interactive tool', 'online');
    if (!description) {
      description = `Web-based application from ${new URL(url).hostname.replace('www.', '')} providing interactive functionality and user tools.`;
    }
  }
  
  // 5. Final fallback for title if still empty
  if (!title) {
    const hostname = new URL(url).hostname.replace('www.', '');
    const domainParts = hostname.split('.');
    const baseDomain = domainParts[0];
    title = baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1) + ' App';
  }
  
  // 6. Ensure description exists and is meaningful
  if (!description || description.length < 20) {
    if (title && title !== 'App') {
      description = `${title} - A ${appType.toLowerCase()} application providing ${features.slice(0, 2).join(' and ')} functionality.`;
    } else {
      description = `${appType} application from ${new URL(url).hostname.replace('www.', '')} with ${features.slice(0, 2).join(' and ')} capabilities.`;
    }
  }
  
  // Final validation - ensure we return meaningful data
  if (!title) {
    const hostname = new URL(url).hostname.replace('www.', '');
    const domainParts = hostname.split('.');
    const baseDomain = domainParts[0];
    title = baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1) + ' App';
  }

  if (!description || description.length < 20) {
    if (title && !title.includes('App from')) {
      description = `${title} - A ${appType.toLowerCase()} application providing ${features.slice(0, 2).join(' and ')} functionality.`;
    } else {
      description = `${appType} application from ${new URL(url).hostname.replace('www.', '')} with ${features.slice(0, 2).join(' and ')} capabilities.`;
    }
  }

  return {
    title: title.trim(),
    description: description.trim(),
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
      
      console.log(`[MARKETPLACE] Request from user ${userId}, query:`, req.query);
      
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

      console.log(`[MARKETPLACE] Found ${containers.length} containers for user ${userId}`);
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

  // Bulk re-analyze existing containers
  app.post('/api/bulk-reanalyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all marketplace containers with generic titles
      const containers = await storage.getContainers({
        isMarketplace: true,
        userId
      });

      const genericContainers = containers.filter(c => 
        c.title.startsWith('App from ') || c.title.includes('.com')
      );

      console.log(`Found ${genericContainers.length} containers to re-analyze`);
      
      let updated = 0;
      let failed = 0;
      
      for (const container of genericContainers.slice(0, 20)) { // Process first 20 to avoid timeout
        try {
          if (!container.url) {
            failed++;
            continue;
          }
          
          console.log(`Re-analyzing: ${container.url}`);
          
          const response = await fetch(container.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined // 8 second timeout per URL
          });

          if (response.ok) {
            const html = await response.text();
            const analysis = analyzeAppContent(html, container.url!);
            
            // Only update if we got a meaningful title (not a fallback)
            if (analysis.title && !analysis.title.includes('App from') && analysis.title.length > 3) {
              await storage.updateContainer(container.id, {
                title: analysis.title,
                description: analysis.description
              });
              updated++;
              console.log(`✓ Updated: ${container.url} -> ${analysis.title}`);
            } else {
              failed++;
              console.log(`✗ No improvement: ${container.url}`);
            }
          } else {
            failed++;
            console.log(`✗ HTTP ${response.status}: ${container.url}`);
          }
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.log(`✗ Error: ${container.url} - ${errorMsg}`);
        }
        
        // Small delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      res.json({ 
        message: `Bulk re-analysis complete: ${updated} updated, ${failed} failed`,
        updated, 
        failed,
        total: genericContainers.length 
      });
    } catch (error) {
      console.error("Error in bulk re-analysis:", error);
      res.status(500).json({ message: "Failed to bulk re-analyze containers" });
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
      console.log(`Analyzing ${url} - HTML length: ${html.length}`);
      
      const analysis = analyzeAppContent(html, url);
      console.log(`Analysis result for ${url}:`, analysis);
      
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
