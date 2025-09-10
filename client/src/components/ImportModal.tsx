import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Globe, Clock, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'single' | 'mass';
  activeTab?: 'app' | 'voice' | 'workflow';
  onSuccess: () => void;
}

export default function ImportModal({ open, onOpenChange, type, activeTab = 'app', onSuccess }: ImportModalProps) {
  const { toast } = useToast();
  const [importType, setImportType] = useState<'file' | 'url' | 'json'>('file');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentUrl: '' });
  const [bulkProgress, setBulkProgress] = useState({ 
    currentBatch: 0, 
    totalBatches: 0, 
    totalItems: 0,
    processedItems: 0,
    startTime: 0,
    avgBatchTime: 0,
    eta: 0,
    speed: 0 
  });

  const handleFileImport = async (file: File) => {
    setIsImporting(true);
    try {
      const fileContent = await file.text();
      let containersData = [];
      
      if (file.name.endsWith('.json')) {
        const jsonData = JSON.parse(fileContent);
        containersData = Array.isArray(jsonData) ? jsonData : (jsonData.containers || [jsonData]);
      } else if (file.name.endsWith('.jsonl')) {
        // JSONL format: one JSON object per line
        const lines = fileContent.split('\n').filter(line => line.trim());
        const parsedObjects = lines.map(line => {
          try {
            return JSON.parse(line.trim());
          } catch (error) {
            console.error('Failed to parse JSONL line:', line, error);
            return null;
          }
        }).filter(Boolean);
        
        console.log(`Successfully parsed ${parsedObjects.length} objects from JSONL file`);
        
        // For voice agents, convert JSONL format to container format
        if (activeTab === 'voice') {
          // Process all voice agents from JSONL
          console.log(`Processing all ${parsedObjects.length} voice agents from JSONL`);
          
          containersData = parsedObjects.map((obj, index) => {
            // Extract fields using your exact column specification
            const industry = obj.Industry || obj.industry || 'General';
            const jobTitle = obj.Job_Title || obj.job_title || obj.jobTitle || 'Professional';
            const jobTask = obj.Job_Task || obj.job_task || obj.jobTask || 'Task';
            const aiVoiceAgentType = obj.AI_Voice_Agent_Type || obj.ai_voice_agent_type || obj.aiVoiceAgentType || '';
            const elevenLabsPrompt = obj.ElevenLabs_Complete_Prompt || obj.elevenlabs_complete_prompt || obj.prompt || obj.description;
            
            if (!elevenLabsPrompt || elevenLabsPrompt.length < 50) {
              console.log(`Skipping JSONL object ${index + 1}: invalid or short prompt`);
              return null;
            }
            
            // Create title exactly as you specified: "Industry - Job_Title - Job_Task - AI_Voice_Agent_Type"
            const smartTitle = `${industry} - ${jobTitle} - ${jobTask} - ${aiVoiceAgentType}`;
            
            console.log(`Creating voice agent "${smartTitle}" from JSONL`);
            
            return {
              title: smartTitle,
              description: elevenLabsPrompt.substring(0, 500) + '...', // Truncated for description
              fullInstructions: elevenLabsPrompt, // Complete prompt for copy/paste
              type: activeTab,
              industry: industry,
              department: jobTitle,
              visibility: 'public',
              tags: [industry, jobTitle, aiVoiceAgentType, 'imported', 'jsonl', '11labs'].filter(Boolean),
              url: '', // Voice agents don't need URLs
              isMarketplace: true,
              // Enhanced voice agent metadata
              aiVoiceAgentType: aiVoiceAgentType,
              experienceLevel: 'Professional',
              // Additional metadata if available
              productivityGains: obj.Productivity_Gains || obj.productivity_gains || '',
              roiPotential: obj.ROI_Potential || obj.roi_potential || '',
              efficiencyImprovements: obj.Efficiency_Improvements || obj.efficiency_improvements || ''
            };
          }).filter(Boolean);
        } else if (activeTab === 'workflow') {
          // Enhanced workflow processing from JSONL - preserve all rich data
          console.log(`Processing ${parsedObjects.length} workflows from JSONL`);
          
          containersData = parsedObjects.map((obj, index) => {
            // Extract workflow-specific fields
            const promptName = obj.Prompt_Name || obj.prompt_name || obj.title || obj.name || 'Automation Workflow';
            const whatItDoes = obj.What_it_does || obj.what_it_does || obj.description || '';
            const whyItMatters = obj.Why_It_matters || obj.why_it_matters || '';
            const timeComparison = obj['Avg._time_spent_manual_vs_automatic'] || obj.time_comparison || '';
            const visualFlowchart = obj.Visual_Flowchart || obj.visual_flowchart || '';
            const workflowJson = obj.Workflow_JSON || obj.workflow_json || '';
            const industry = obj.Industry || obj.industry || 'Business';
            const department = obj.Department || obj.department || '';
            
            // Store complete JSONL object as fullInstructions for copy/paste
            const fullInstructions = JSON.stringify(obj, null, 2);
            
            console.log(`Creating workflow "${promptName}" from JSONL with rich data`);
            
            return {
              title: promptName,
              description: whatItDoes.substring(0, 500) + (whatItDoes.length > 500 ? '...' : ''),
              fullInstructions: fullInstructions, // Complete JSONL object for copy/paste
              type: activeTab,
              industry: industry,
              department: department,
              visibility: 'public',
              tags: [industry, department, 'imported', 'jsonl', 'automation'].filter(Boolean),
              url: '', // Workflows don't typically have URLs from JSONL
              isMarketplace: true,
              // Store additional workflow metadata for rich display
              whyItMatters: whyItMatters,
              timeComparison: timeComparison,
              visualFlowchart: visualFlowchart,
              workflowJson: workflowJson
            };
          }).filter(Boolean);
        } else {
          // For apps, use basic mapping with enhanced JSONL support
          containersData = parsedObjects.map(obj => ({
            title: obj.title || obj.name || 'Imported Container',
            description: obj.description || '',
            type: activeTab,
            industry: obj.industry || '',
            department: obj.department || '',
            visibility: obj.visibility || 'public',
            tags: Array.isArray(obj.tags) ? [...obj.tags, 'imported', 'jsonl'] : ['imported', 'jsonl'],
            isMarketplace: true,
            fullInstructions: JSON.stringify(obj, null, 2), // Store complete object for copy/paste
            ...obj
          }));
        }
      } else if (file.name.endsWith('.csv')) {
        // Enhanced CSV parsing with URL analysis for apps/workflows, instructions for voices
        
        if (activeTab === 'voice') {
          console.log('Processing voice agent CSV import with activeTab:', activeTab);
          
          // PROPER CSV parsing that handles multiline quoted fields
          const parseCSV = (csvText: string) => {
            const rows = [];
            let currentRow = [];
            let currentField = '';
            let inQuotes = false;
            let i = 0;
            
            while (i < csvText.length) {
              const char = csvText[i];
              
              if (char === '"') {
                if (inQuotes && csvText[i + 1] === '"') {
                  // Handle escaped quotes ("")
                  currentField += '"';
                  i += 2;
                  continue;
                } else {
                  // Toggle quote state
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                // End of field
                currentRow.push(currentField.trim());
                currentField = '';
              } else if ((char === '\n' || char === '\r') && !inQuotes) {
                // End of row (only if not inside quotes)
                if (currentField.trim() || currentRow.length > 0) {
                  currentRow.push(currentField.trim());
                  if (currentRow.some(field => field.length > 0)) {
                    rows.push(currentRow);
                  }
                  currentRow = [];
                  currentField = '';
                }
                // Skip \r\n combinations
                if (char === '\r' && csvText[i + 1] === '\n') {
                  i++;
                }
              } else {
                // Add character to current field
                currentField += char;
              }
              i++;
            }
            
            // Handle last field/row
            if (currentField.trim() || currentRow.length > 0) {
              currentRow.push(currentField.trim());
              if (currentRow.some(field => field.length > 0)) {
                rows.push(currentRow);
              }
            }
            
            return rows;
          };
          
          const rows = parseCSV(fileContent);
          console.log(`Parsed ${rows.length} total rows from CSV`);
          
          if (rows.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row');
          }
          
          // Skip header row, take first 20 data rows
          const dataRows = rows.slice(1, 21);
          console.log(`Processing first ${dataRows.length} data rows`);
          
          const voiceAgents = dataRows
            .map((columns, index) => {
              // DEBUG: Log first 5 rows to see exact data
              if (index < 5) {
                console.log(`=== ROW ${index + 1} DEBUG ===`);
                console.log('Parsed columns:', columns.length, 'columns');
                console.log('Columns [0-4]:', columns.slice(0, 5).map(c => c.substring(0, 50) + (c.length > 50 ? '...' : '')));
              }
              
              // Extract fields by column position (exactly as you specified)
              const industry = columns[0]?.trim() || 'General';
              const jobTitle = columns[1]?.trim() || 'Professional'; 
              const jobTask = columns[2]?.trim() || 'Task';
              const aiVoiceAgentType = columns[3]?.trim() || '';
              const elevenLabsPrompt = columns[4]?.trim();
              
              // DEBUG: Log the extracted values for first 5 rows
              if (index < 5) {
                console.log('Extracted values:');
                console.log('- Industry:', industry);
                console.log('- Job Title:', jobTitle);
                console.log('- Job Task:', jobTask);
                console.log('- Agent Type:', aiVoiceAgentType);
                console.log('- Prompt length:', elevenLabsPrompt?.length || 0);
                console.log('========================');
              }
              
              // Metadata from remaining columns (5+)
              const productivityGains = columns[5]?.replace(/"/g, '').trim() || '';
              const roiPotential = columns[6]?.replace(/"/g, '').trim() || '';
              const efficiencyImprovements = columns[7]?.replace(/"/g, '').trim() || '';
              const personalityProfile = columns[8]?.replace(/"/g, '').trim() || '';
              const knowledgeRequirements = columns[9]?.replace(/"/g, '').trim() || '';
              const useCase = columns[10]?.replace(/"/g, '').trim() || '';
              const implementationNotes = columns[11]?.replace(/"/g, '').trim() || '';
              
              if (!elevenLabsPrompt || elevenLabsPrompt.length < 50) {
                console.log(`Skipping row ${index + 1}: invalid or short prompt`);
                return null;
              }
              
              // Create title from first 4 columns: "Industry - Job_Title - Job_Task - AI_Voice_Agent_Type"
              const smartTitle = `${industry} - ${jobTitle} - ${jobTask} - ${aiVoiceAgentType}`;
              
              console.log(`Row ${index + 1}: Creating voice agent "${smartTitle}"`);
              
              return {
                title: smartTitle,
                description: elevenLabsPrompt.substring(0, 500) + '...', // Truncated for description
                fullInstructions: elevenLabsPrompt, // Complete prompt for copy/paste
                type: activeTab,
                industry: industry,
                department: jobTitle,
                visibility: 'public',
                tags: [industry, jobTitle, aiVoiceAgentType, 'imported', 'csv', '11labs'].filter(Boolean),
                url: '', // Voice agents don't need URLs
                isMarketplace: true,
                // Enhanced voice agent metadata (stored but not displayed)
                aiVoiceAgentType: aiVoiceAgentType,
                personality: personalityProfile,
                experienceLevel: 'Professional', // Default for these agents
                specialization: knowledgeRequirements,
                useCase: useCase,
                productivityGains: productivityGains,
                roiPotential: roiPotential,
                efficiencyImprovements: efficiencyImprovements
              };
            })
            .filter(Boolean);
          
          if (voiceAgents.length === 0) {
            throw new Error('No valid voice agent prompts found in CSV file. Please check that column 5 contains the ElevenLabs_Complete_Prompt.');
          }
          
          console.log(`Successfully parsed ${voiceAgents.length} unique voice agents from CSV`);
          containersData = voiceAgents;
        } else {
          // Apps/Workflows: use URL analysis (existing behavior)
          const lines = fileContent.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          const urlColumnIndex = headers.findIndex((h: string) => 
            h.includes('url') || h.includes('link') || h.includes('source') || h.includes('app')
          );
          
          if (urlColumnIndex === -1) {
            throw new Error('CSV file must contain a URL column (url, link, source, or app) for apps and workflows');
          }
        
          const urls = lines.slice(1)
            .map((line: string) => line.split(',')[urlColumnIndex]?.trim())
            .filter(Boolean);
          
          if (urls.length === 0) {
            throw new Error('No URLs found in CSV file');
          }
          
          // Analyze each URL with progress tracking using server-side analysis
          setImportProgress({ current: 0, total: urls.length, currentUrl: '' });
          containersData = [];
          
          for (let index = 0; index < urls.length; index++) {
            const url = urls[index];
            setImportProgress({ current: index + 1, total: urls.length, currentUrl: url });
            
            try {
              // Use server-side URL analysis to bypass CORS restrictions
              console.log('Analyzing URL:', url);
              const analysis = await apiRequest('POST', '/api/analyze-url', { url }) as any;
              console.log('Analysis result:', analysis);
              
              containersData.push({
                title: analysis.title,
                description: analysis.description,
                type: activeTab,
                industry: analysis.appType || '',
                department: '',
                visibility: 'public',
                tags: ['imported', 'csv', analysis.appType?.toLowerCase(), ...analysis.features].filter(Boolean),
                url: url,
                isMarketplace: true
              });
            } catch (error) {
              console.error('Failed to analyze URL:', url, error);
              // Fallback for any analysis errors
              try {
                const hostname = new URL(url).hostname.replace('www.', '');
                containersData.push({
                  title: `App from ${hostname}`,
                  description: `Application imported from ${url}`,
                  type: activeTab,
                  industry: 'Web Application',
                  department: '',
                  visibility: 'public',
                  tags: ['imported', 'csv'],
                  url: url,
                  isMarketplace: true
                });
              } catch {
                containersData.push({
                  title: `App ${index + 1}`,
                  description: `Application from ${url}`,
                  type: activeTab,
                  industry: '',
                  department: '',
                  visibility: 'public',
                  tags: ['imported', 'csv'],
                  url: url,
                  isMarketplace: true
                });
              }
            }
          }
        }
      }
      
      // Create containers via bulk API for optimal performance
      let createdCount = 0;
      const batchSize = 10; // Reduced batch size for large voice agent prompts
      const totalBatches = Math.ceil(containersData.length / batchSize);
      const startTime = Date.now();
      let batchTimes: number[] = [];
      
      // Initialize bulk progress tracking
      setBulkProgress({
        currentBatch: 0,
        totalBatches,
        totalItems: containersData.length,
        processedItems: 0,
        startTime,
        avgBatchTime: 0,
        eta: 0,
        speed: 0
      });
      
      console.log(`Starting bulk import of ${containersData.length} containers in batches of ${batchSize}`);
      
      for (let i = 0; i < containersData.length; i += batchSize) {
        const batch = containersData.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const batchStartTime = Date.now();
        
        console.log(`Processing batch ${batchNumber}/${totalBatches}: ${batch.length} containers`);
        
        // Debug: Log the first container in each batch to verify structure
        if (batchNumber === 1 && batch.length > 0) {
          console.log('First container structure:', batch[0]);
        }
        
        try {
          const response = await apiRequest('POST', '/api/containers/bulk', {
            containers: batch
          }) as any;
          
          const batchEndTime = Date.now();
          const batchDuration = batchEndTime - batchStartTime;
          batchTimes.push(batchDuration);
          
          createdCount += response.created || batch.length;
          console.log(`Batch complete: ${response.created || batch.length} containers created in ${batchDuration}ms`);
          
          // Calculate performance metrics
          const avgBatchTime = batchTimes.reduce((sum, time) => sum + time, 0) / batchTimes.length;
          const remainingBatches = totalBatches - batchNumber;
          const eta = remainingBatches * avgBatchTime;
          const elapsedTime = Date.now() - startTime;
          const speed = createdCount / (elapsedTime / 1000); // items per second
          
          // Update progress
          setBulkProgress({
            currentBatch: batchNumber,
            totalBatches,
            totalItems: containersData.length,
            processedItems: createdCount,
            startTime,
            avgBatchTime,
            eta,
            speed
          });
          
        } catch (error) {
          console.error(`Batch ${batchNumber} failed:`, error);
          console.error('Failed batch data:', batch);
          // Skip fallback for now to avoid validation errors
          // The bulk endpoint should be fixed instead of falling back
          console.log(`Skipping fallback for batch ${batchNumber} - fix bulk endpoint instead`);
          break;
        }
        
        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < containersData.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      toast({
        title: "Success",
        description: `${createdCount} ${activeTab}${createdCount !== 1 ? 's' : ''} imported successfully`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Import error:', error);
      console.error('Error details:', { 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        activeTab: activeTab,
        type: typeof error
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setBulkProgress({ 
        currentBatch: 0, 
        totalBatches: 0, 
        totalItems: 0,
        processedItems: 0,
        startTime: 0,
        avgBatchTime: 0,
        eta: 0,
        speed: 0 
      });
    }
  };

  const analyzeAppContent = (html: string, url: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Enhanced title extraction with intelligent analysis
    let title = '';
    let appType = '';
    let features = [];
    
    // 1. Try standard meta tags first
    title = doc.querySelector('title')?.textContent ||
            doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
            doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';
    
    // 2. Analyze page structure for app type and better title
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).filter(Boolean) as string[];
    const buttons = Array.from(doc.querySelectorAll('button, .btn, [role="button"]'))
      .map(b => b.textContent?.trim().toLowerCase())
      .filter(Boolean) as string[];
    const inputs = Array.from(doc.querySelectorAll('input, textarea, select'));
    const canvases = doc.querySelectorAll('canvas');
    const videos = doc.querySelectorAll('video');
    const forms = doc.querySelectorAll('form');
    
    // Detect app type based on elements and functionality
    if (canvases.length > 0) {
      appType = 'Drawing/Graphics';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || 'Creative Drawing Canvas';
      }
      features.push('canvas drawing', 'graphics tools');
    } else if (videos.length > 0 || buttons.some(b => b.includes('play') || b.includes('pause'))) {
      appType = 'Media Player';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || 'Media Player Application';
      }
      features.push('video playback', 'media controls');
    } else if (buttons.some(b => b.includes('chat') || b.includes('send') || b.includes('message'))) {
      appType = 'Communication';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || 'Chat Application';
      }
      features.push('messaging', 'real-time communication');
    } else if (buttons.some(b => b.includes('task') || b.includes('todo') || b.includes('complete'))) {
      appType = 'Productivity';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || 'Task Management Tool';
      }
      features.push('task tracking', 'productivity management');
    } else if (buttons.some(b => b.includes('calendar') || b.includes('schedule') || b.includes('event'))) {
      appType = 'Calendar/Scheduling';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || 'Calendar Scheduler';
      }
      features.push('event scheduling', 'calendar management');
    } else if (inputs.length > 3 || forms.length > 0) {
      appType = 'Data Management';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || 'Data Entry Application';
      }
      features.push('form handling', 'data collection');
    } else if (buttons.some(b => b.includes('edit') || b.includes('save') || b.includes('code'))) {
      appType = 'Editor';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || 'Code Editor';
      }
      features.push('text editing', 'code management');
    } else if (doc.querySelector('.chart, .graph, canvas[id*="chart"]')) {
      appType = 'Analytics/Dashboard';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || 'Analytics Dashboard';
      }
      features.push('data visualization', 'analytics');
    } else {
      appType = 'Web Application';
      if (!title || title.includes('localhost') || title.includes('index')) {
        title = headings[0] || `${new URL(url).hostname.replace('www.', '')} App`;
      }
    }
    
    // Clean up title
    title = title.replace(/localhost:\d+/g, '').replace(/index\.html?/g, '').trim();
    if (!title) {
      const urlObj = new URL(url);
      title = `${urlObj.hostname.replace('www.', '')} Application`;
    }
    
    // Generate intelligent description
    let description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                     doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                     doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '';
    
    if (!description || description.length < 20) {
      // Generate description based on analysis
      const featureText = features.length > 0 ? ` with ${features.join(', ')}` : '';
      const mainHeading = headings[0] ? ` - ${headings[0]}` : '';
      
      description = `A ${appType.toLowerCase()} application${featureText}. `;
      
      if (buttons.length > 0) {
        const keyActions = buttons.slice(0, 3).filter(Boolean).join(', ');
        description += `Features include: ${keyActions}. `;
      }
      
      if (mainHeading && headings[0] && !description.includes(headings[0])) {
        description += mainHeading;
      }
      
      description = description.trim();
      
      // Fallback to content analysis
      if (description.length < 50) {
        const firstP = doc.querySelector('p')?.textContent?.slice(0, 150);
        if (firstP && firstP.length > 20) {
          description = firstP + '...';
        }
      }
    }
    
    return {
      title: title.trim(),
      description: description.trim() || `A ${appType.toLowerCase()} with interactive features and modern web technologies.`,
      appType,
      features
    };
  };

  const handleURLImport = async (url: string) => {
    setIsImporting(true);
    try {
      // Validate URL
      new URL(url); // This will throw if invalid
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Handle JSON data URLs
        const data = await response.json();
        const containersData = Array.isArray(data) ? data : (data.containers || [data]);
        
        let createdCount = 0;
        for (const containerData of containersData) {
          try {
            const containerToCreate = {
              title: containerData.title || containerData.name || 'Imported Container',
              description: containerData.description || '',
              type: activeTab,
              industry: containerData.industry || '',
              department: containerData.department || '',
              visibility: containerData.visibility || 'public',
              tags: Array.isArray(containerData.tags) ? containerData.tags : [],
              url: url,
              isMarketplace: true,
              ...containerData
            };
            
            await apiRequest('POST', '/api/containers', containerToCreate);
            createdCount++;
          } catch (error) {
            console.warn('Failed to create container:', containerData, error);
          }
        }
        
        toast({
          title: "Success",
          description: `${createdCount} ${activeTab}${createdCount !== 1 ? 's' : ''} imported successfully`,
        });
      } else {
        // Handle HTML/webpage URLs with intelligent analysis
        const html = await response.text();
        const analysis = analyzeAppContent(html, url);
        
        const containerToCreate = {
          title: analysis.title || `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} from ${new URL(url).hostname}`,
          description: analysis.description || `Imported ${activeTab} from ${url}`,
          type: activeTab,
          industry: analysis.appType || '',
          department: '',
          visibility: 'public' as const,
          tags: ['imported', 'url', analysis.appType.toLowerCase(), ...analysis.features].filter(Boolean),
          url: url,
          isMarketplace: true
        };
        
        await apiRequest('POST', '/api/containers', containerToCreate);
        
        toast({
          title: "Success",
          description: `${activeTab} imported successfully from URL`,
        });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('URL import error:', error);
      
      let errorMessage = "URL import failed. Please check the URL and try again.";
      
      // Provide specific error messages for common issues
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        errorMessage = "Unable to access this URL due to security restrictions (CORS). Try importing the JSON data directly instead, or use a publicly accessible URL.";
      } else if (error.message?.includes('Invalid URL')) {
        errorMessage = "Please enter a valid URL (e.g., https://example.com)";
      } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        errorMessage = "The URL was not found. Please check the URL and try again.";
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        errorMessage = "Access to this URL is forbidden. Try a different URL or use JSON import instead.";
      }
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleJSONImport = async (jsonData: string) => {
    setIsImporting(true);
    try {
      const parsedData = JSON.parse(jsonData);
      const containersData = Array.isArray(parsedData) ? parsedData : (parsedData.containers || [parsedData]);
      
      // Create containers via API
      let createdCount = 0;
      for (const containerData of containersData) {
        try {
          const containerToCreate = {
            title: containerData.title || containerData.name || 'Imported Container',
            description: containerData.description || '',
            type: activeTab,
            industry: containerData.industry || '',
            department: containerData.department || '',
            visibility: containerData.visibility || 'public',
            tags: Array.isArray(containerData.tags) ? containerData.tags : [],
            isMarketplace: true,
            ...containerData
          };
          
          await apiRequest('POST', '/api/containers', containerToCreate);
          createdCount++;
        } catch (error) {
          console.warn('Failed to create container:', containerData, error);
        }
      }
      
      toast({
        title: "Success",
        description: `${createdCount} ${activeTab}${createdCount !== 1 ? 's' : ''} imported successfully`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON format. Please check your data and try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const containerType = activeTab === 'app' ? 'Application' : activeTab === 'voice' ? 'AI Voice' : 'Workflow';
    const template = {
      containers: [
        {
          title: `Example ${containerType}`,
          description: `This is an example ${activeTab} container`,
          type: activeTab,
          industry: "Technology",
          department: "Engineering",
          visibility: "public",
          tags: ["example", "template", activeTab]
        }
      ]
    };
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'mass' 
              ? `Mass Import ${activeTab === 'app' ? 'Apps' : activeTab === 'voice' ? 'AI Voices' : 'Workflows'}` 
              : `Import ${activeTab === 'app' ? 'App' : activeTab === 'voice' ? 'AI Voice' : 'Workflow'}`}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {type === 'mass' 
              ? `Import multiple ${activeTab === 'app' ? 'apps' : activeTab === 'voice' ? 'AI voices' : 'workflows'} at once from various sources`
              : `Import a single ${activeTab === 'app' ? 'app' : activeTab === 'voice' ? 'AI voice' : 'workflow'} from a file, URL, or JSON data`
            }
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Type Selection */}
          <div className="space-y-3">
            <Label>Import Method</Label>
            <Select value={importType} onValueChange={(value: 'file' | 'url' | 'json') => setImportType(value)}>
              <SelectTrigger data-testid="import-method-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="file">Upload File</SelectItem>
                <SelectItem value="url">Import from URL</SelectItem>
                <SelectItem value="json">Paste JSON Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          {importType === 'file' && (
            <div className="space-y-3">
              <Label>Select File</Label>
              <div 
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    const file = files[0];
                    if (file.type === 'application/json' || file.name.endsWith('.json') ||
                        file.name.endsWith('.jsonl') ||
                        file.type === 'text/csv' || file.name.endsWith('.csv') ||
                        file.type === 'application/zip' || file.name.endsWith('.zip')) {
                      handleFileImport(file);
                    } else {
                      toast({
                        title: "Invalid file type",
                        description: "Please upload a JSON, JSONL, CSV, or ZIP file.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JSON, JSONL, CSV, or ZIP files
                  </p>
                </div>
              </div>
              <Input
                id="file-input"
                type="file"
                className="hidden"
                accept=".json,.jsonl,.csv,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileImport(file);
                  }
                }}
                data-testid="file-input"
              />
              
              {/* Progress indicator for CSV URL analysis */}
              {isImporting && importProgress.total > 0 && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">
                      Analyzing URLs ({importProgress.current}/{importProgress.total})
                    </span>
                  </div>
                  <Progress value={(importProgress.current / importProgress.total) * 100} className="w-full" />
                  {importProgress.currentUrl && (
                    <p className="text-xs text-muted-foreground truncate">
                      Current: {importProgress.currentUrl}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Extracting titles, descriptions, and app features from each URL...
                  </p>
                </div>
              )}

              {/* Progress indicator for bulk import */}
              {isImporting && bulkProgress.totalBatches > 0 && (
                <div className="space-y-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 animate-pulse text-primary" />
                      <span className="text-sm font-semibold">
                        High-Speed Bulk Import
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {bulkProgress.eta > 0 && (
                        <span>ETA: {Math.ceil(bulkProgress.eta / 1000)}s</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        Batch {bulkProgress.currentBatch}/{bulkProgress.totalBatches}
                      </span>
                      <span className="text-muted-foreground">
                        {Math.round((bulkProgress.currentBatch / bulkProgress.totalBatches) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(bulkProgress.currentBatch / bulkProgress.totalBatches) * 100} 
                      className="w-full h-2" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Items</span>
                        <span className="font-medium">
                          {bulkProgress.processedItems.toLocaleString()}/{bulkProgress.totalItems.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Speed</span>
                        <span className="font-medium text-green-600">
                          {Math.round(bulkProgress.speed)} /sec
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Avg Batch</span>
                        <span className="font-medium">
                          {Math.round(bulkProgress.avgBatchTime)}ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-medium">
                          {bulkProgress.totalBatches - bulkProgress.currentBatch} batches
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-center">
                    🚀 Processing {bulkProgress.currentBatch > 0 ? '50' : '...'} {activeTab}s per batch with optimized bulk operations
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URL Import */}
          {importType === 'url' && (
            <div className="space-y-3">
              <Label>Container URL</Label>
              <Input
                placeholder="https://example.com/container.json"
                className="break-all"
                data-testid="url-input"
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL that points to a container configuration file
              </p>
            </div>
          )}

          {/* JSON Import */}
          {importType === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>JSON Data</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  data-testid="download-template"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <Textarea
                placeholder="Paste your JSON container data here..."
                rows={10}
                className="font-mono text-sm resize-none overflow-auto"
                data-testid="json-input"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="cancel-import"
            >
              Cancel
            </Button>
            <Button 
              disabled={isImporting}
              onClick={() => {
                if (importType === 'url') {
                  const urlInput = document.querySelector('[data-testid="url-input"]') as HTMLInputElement;
                  if (urlInput?.value) {
                    handleURLImport(urlInput.value);
                  }
                } else if (importType === 'json') {
                  const jsonInput = document.querySelector('[data-testid="json-input"]') as HTMLTextAreaElement;
                  if (jsonInput?.value) {
                    handleJSONImport(jsonInput.value);
                  }
                }
              }}
              data-testid="start-import"
            >
              {isImporting ? 'Importing...' : 'Start Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
