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
      .replace(/\s*[-|–]\s*(Home|Welcome|Index|Main|App|Application|Dashboard|Portal)?\s*$/i, '')
      .replace(/^(Home|Welcome|Index|Main|App|Application|Dashboard|Portal)\s*[-|–]\s*/i, '')
      .replace(/^\s*-\s*/, '') // Remove leading dash
      .replace(/\s*-\s*$/, '') // Remove trailing dash
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // If title is still generic or too short, try to extract from URL or page headers
  if (!title || title.length < 3 || title.toLowerCase().includes('untitled')) {
    // Try to extract from main headings with more context
    const h1Matches = html.match(/<h1[^>]*>([^<]+?)<\/h1>/gi);
    const h2Matches = html.match(/<h2[^>]*>([^<]+?)<\/h2>/gi);
    
    if (h1Matches && h1Matches.length > 0) {
      // Get the first meaningful h1
      for (const match of h1Matches) {
        const headerText = match.replace(/<[^>]*>/g, '').trim();
        if (headerText.length > 3 && !headerText.toLowerCase().includes('welcome')) {
          title = headerText;
          break;
        }
      }
    }
    
    // If still no good title, try h2
    if ((!title || title.length < 3) && h2Matches && h2Matches.length > 0) {
      for (const match of h2Matches) {
        const headerText = match.replace(/<[^>]*>/g, '').trim();
        if (headerText.length > 3 && !headerText.toLowerCase().includes('welcome')) {
          title = headerText;
          break;
        }
      }
    }
    
    // Last resort: extract from URL
    if (!title || title.length < 3) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const hostname = urlObj.hostname.replace('www.', '');
        
        // Try to get app name from subdomain or path
        if (hostname.includes('.')) {
          const subdomain = hostname.split('.')[0];
          if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'chat') {
            title = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
          }
        }
        
        // If still no title, use hostname
        if (!title || title.length < 3) {
          title = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
        }
      } catch {
        // Fallback to generic
        title = 'Web Application';
      }
    }
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

  // Bulk container creation endpoint for fast imports
  app.post('/api/containers/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { containers } = req.body;
      
      if (!Array.isArray(containers) || containers.length === 0) {
        return res.status(400).json({ message: "containers array is required and must not be empty" });
      }

      if (containers.length > 100) {
        return res.status(400).json({ message: "Maximum 100 containers per batch" });
      }

      // Validate and prepare all container data
      const containerDataList = containers.map(container => 
        insertContainerSchema.parse({
          ...container,
          createdBy: userId,
        })
      );

      console.log(`Creating bulk batch of ${containerDataList.length} containers for user ${userId}`);

      // Use bulk create method for optimal performance
      const createdContainers = await storage.createContainersBulk(containerDataList);
      
      res.status(201).json({ 
        success: true, 
        created: createdContainers.length,
        containers: createdContainers 
      });
    } catch (error) {
      console.error("Error creating containers in bulk:", error);
      res.status(500).json({ message: "Failed to create containers in bulk" });
    }
  });

  // Bulk re-analyze existing containers (admin only)
  app.post('/api/bulk-reanalyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can perform bulk re-analysis" });
      }
      
      // Get all marketplace containers with generic titles or broken URLs
      const containers = await storage.getContainers({
        isMarketplace: true
      });

      const problemContainers = containers.filter(c => 
        (c.title.startsWith('App from ') || 
         c.title.includes('.com') || 
         c.title.startsWith('App ') ||
         c.title === 'Untitled' ||
         (c.url && c.urlStatus === 'auth_required')) &&
        c.url && c.url !== '' && c.url !== '-' && c.url.startsWith('http')
      );

      console.log(`Found ${problemContainers.length} containers to re-analyze`);
      
      let updated = 0;
      let failed = 0;
      let authRequired = 0;
      
      for (const container of problemContainers.slice(0, 50)) { // Process more containers
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
            signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
          });

          if (response.ok) {
            const html = await response.text();
            const analysis = analyzeAppContent(html, container.url!);
            
            // Update URL status to active and improve title if possible
            const updateData: any = {
              urlStatus: 'active',
              urlLastChecked: new Date(),
              urlCheckError: null
            };

            if (analysis.title && !analysis.title.includes('App from') && analysis.title.length > 3) {
              updateData.title = analysis.title;
              updateData.description = analysis.description || container.description;
            }
            
            await storage.updateContainer(container.id, updateData);
            updated++;
            console.log(`✓ Updated: ${container.url} -> ${analysis.title || 'Status updated'}`);
          } else if (response.status === 401 || response.status === 403) {
            // Mark as auth required
            await storage.updateContainer(container.id, {
              urlStatus: 'auth_required',
              urlLastChecked: new Date(),
              urlCheckError: `HTTP ${response.status}: Authentication required`
            });
            authRequired++;
            console.log(`🔒 Auth required: ${container.url}`);
          } else {
            // Mark as broken
            await storage.updateContainer(container.id, {
              urlStatus: 'broken',
              urlLastChecked: new Date(),
              urlCheckError: `HTTP ${response.status}`
            });
            failed++;
            console.log(`✗ HTTP ${response.status}: ${container.url}`);
          }
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          await storage.updateContainer(container.id, {
            urlStatus: 'broken',
            urlLastChecked: new Date(),
            urlCheckError: errorMsg
          });
          console.log(`✗ Error: ${container.url} - ${errorMsg}`);
        }
        
        // Small delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      res.json({ 
        message: `Bulk re-analysis complete: ${updated} updated, ${authRequired} auth required, ${failed} failed`,
        updated, 
        authRequired,
        failed,
        total: problemContainers.length 
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

  // PATCH endpoint for user editing (less restrictive than PUT)
  app.patch('/api/containers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Allow editing of title, description, and URL only
      const allowedFields = ['title', 'description', 'url'];
      const updateData: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(req.body)) {
        if (allowedFields.includes(key)) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const container = await storage.updateContainer(req.params.id, updateData);
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
      const { type } = req.query;
      const industries = await storage.getIndustriesWithCounts(type as string);
      res.json(industries);
    } catch (error) {
      console.error("Error fetching industries:", error);
      res.status(500).json({ message: "Failed to fetch industries" });
    }
  });

  app.get('/api/filters/departments', isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.query;
      const departments = await storage.getDepartmentsWithCounts(type as string);
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.get('/api/filters/usecases', isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.query;
      const useCases = await storage.getUseCasesWithCounts(type as string);
      res.json(useCases);
    } catch (error) {
      console.error("Error fetching use cases:", error);
      res.status(500).json({ message: "Failed to fetch use cases" });
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

  // URL Health Monitoring endpoints
  app.post('/api/check-url-health', isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const healthCheck = await checkUrlHealth(url);
      res.json(healthCheck);
    } catch (error) {
      console.error("Error checking URL health:", error);
      res.status(500).json({ message: "Failed to check URL health" });
    }
  });

  app.post('/api/batch-check-urls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can perform batch URL checks" });
      }

      // Get all containers with URLs that need checking (haven't been checked in the last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const containers = await storage.getContainersForHealthCheck(oneHourAgo);
      
      let checked = 0;
      let updated = 0;
      
      for (const container of containers.slice(0, 20)) { // Limit to 20 URLs to avoid timeout
        if (!container.url || container.url === '' || container.url === '-') {
          continue;
        }
        
        try {
          console.log(`Checking URL health: ${container.url}`);
          const healthCheck = await checkUrlHealth(container.url);
          
          await storage.updateContainer(container.id, {
            urlStatus: healthCheck.status,
            urlLastChecked: new Date(),
            urlCheckError: healthCheck.error || null
          });
          
          checked++;
          if (healthCheck.status !== 'unknown') {
            updated++;
          }
        } catch (error) {
          console.error(`Error checking ${container.url}:`, error);
          
          await storage.updateContainer(container.id, {
            urlStatus: 'broken',
            urlLastChecked: new Date(),
            urlCheckError: error instanceof Error ? error.message : 'Unknown error'
          });
          
          checked++;
        }
        
        // Small delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      res.json({
        message: `Batch URL health check complete: ${checked} checked, ${updated} updated`,
        checked,
        updated,
        totalContainers: containers.length
      });
    } catch (error) {
      console.error("Error in batch URL health check:", error);
      res.status(500).json({ message: "Failed to perform batch URL health check" });
    }
  });

  // Proxy endpoint for iframe embedding
  app.get('/api/proxy/:containerId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { containerId } = req.params;
      
      // Get the container and verify access
      const container = await storage.getContainerById(containerId);
      if (!container) {
        return res.status(404).json({ message: "Container not found" });
      }
      
      if (!container.url) {
        return res.status(400).json({ message: "Container has no URL to proxy" });
      }
      
      console.log(`[PROXY] Fetching ${container.url} for user ${userId}`);
      
      // Fetch the external content
      const response = await fetch(container.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
      });
      
      if (!response.ok) {
        console.log(`[PROXY] Failed to fetch ${container.url}: ${response.status}`);
        return res.status(502).json({ 
          message: "Failed to fetch external content", 
          status: response.status,
          statusText: response.statusText 
        });
      }
      
      const content = await response.text();
      const contentType = response.headers.get('content-type') || 'text/html';
      
      // Rewrite relative URLs to absolute URLs
      const baseUrl = new URL(container.url);
      let modifiedContent = content;
      
      // Fix relative links, scripts, and assets
      modifiedContent = modifiedContent.replace(
        /(href|src|action)=(["'])(?!\/\/|https?:|\/\/)(\/?[^"']*)["']/gi,
        (match, attr, quote, path) => {
          try {
            const absoluteUrl = new URL(path, baseUrl).toString();
            return `${attr}=${quote}${absoluteUrl}${quote}`;
          } catch {
            return match; // Keep original if URL construction fails
          }
        }
      );
      
      // Add base tag to handle remaining relative URLs
      const baseTag = `<base href="${baseUrl.origin}${baseUrl.pathname.endsWith('/') ? baseUrl.pathname : baseUrl.pathname + '/'}"/>`;
      modifiedContent = modifiedContent.replace(
        /<head[^>]*>/i,
        (match) => `${match}\n${baseTag}`
      );
      
      // Set headers to allow iframe embedding and prevent caching issues
      res.set({
        'Content-Type': contentType,
        'Content-Security-Policy': 'frame-ancestors *;', // Allow embedding from any origin
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // Explicitly remove headers that would block embedding
      res.removeHeader('X-Frame-Options');
      
      console.log(`[PROXY] Successfully proxied ${container.url} (${content.length} bytes)`);
      res.send(modifiedContent);
      
    } catch (error) {
      console.error(`[PROXY] Error proxying content:`, error);
      res.status(500).json({ 
        message: "Proxy error", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// URL Health Checking function
async function checkUrlHealth(url: string): Promise<{
  status: 'unknown' | 'active' | 'broken' | 'auth_required' | 'timeout' | 'blocked';
  responseTime?: number;
  statusCode?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to minimize data transfer
      headers: {
        'User-Agent': 'ContainerHub Health Monitor/1.0',
      },
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined // 10 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    const statusCode = response.status;
    
    // Determine status based on response
    if (statusCode >= 200 && statusCode < 300) {
      return { status: 'active', responseTime, statusCode };
    } else if (statusCode === 401 || statusCode === 403) {
      return { status: 'auth_required', responseTime, statusCode };
    } else if (statusCode >= 400 && statusCode < 600) {
      return { 
        status: 'broken', 
        responseTime, 
        statusCode, 
        error: `HTTP ${statusCode}` 
      };
    } else {
      return { 
        status: 'unknown', 
        responseTime, 
        statusCode, 
        error: `Unexpected status code: ${statusCode}` 
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return { status: 'timeout', error: 'Request timed out' };
      } else if (error.message.includes('fetch')) {
        return { status: 'blocked', error: 'Network blocked or unreachable' };
      } else {
        return { status: 'broken', error: error.message };
      }
    }
    
    return { status: 'broken', error: 'Unknown error occurred' };
  }
}
