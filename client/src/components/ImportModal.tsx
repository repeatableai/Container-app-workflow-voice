import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download } from "lucide-react";
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

  const handleFileImport = async (file: File) => {
    setIsImporting(true);
    try {
      const fileContent = await file.text();
      let containersData = [];
      
      if (file.name.endsWith('.json')) {
        const jsonData = JSON.parse(fileContent);
        containersData = Array.isArray(jsonData) ? jsonData : (jsonData.containers || [jsonData]);
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parsing - assumes first row is headers
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        containersData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const container: any = {};
          headers.forEach((header, index) => {
            container[header] = values[index] || '';
          });
          return container;
        });
      }
      
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
        description: "Import failed. Please check your file format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const extractMetaFromHTML = (html: string, url: string) => {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract title
    let title = doc.querySelector('title')?.textContent || '';
    if (!title) {
      title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    }
    if (!title) {
      title = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';
    }
    if (!title) {
      // Fallback to URL-based title
      const urlObj = new URL(url);
      title = urlObj.hostname.replace('www.', '') + ' - ' + urlObj.pathname.split('/').filter(Boolean).join(' ');
    }
    
    // Extract description
    let description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    if (!description) {
      description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    }
    if (!description) {
      description = doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '';
    }
    if (!description) {
      // Fallback to first paragraph or heading
      const firstP = doc.querySelector('p');
      const firstH = doc.querySelector('h1, h2, h3');
      description = firstP?.textContent?.slice(0, 200) || firstH?.textContent?.slice(0, 100) || 'No description available';
    }
    
    return {
      title: title.trim(),
      description: description.trim()
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
        throw new Error('Failed to fetch from URL');
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
        // Handle HTML/webpage URLs
        const html = await response.text();
        const { title, description } = extractMetaFromHTML(html, url);
        
        const containerToCreate = {
          title: title || `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} from ${new URL(url).hostname}`,
          description: description || `Imported ${activeTab} from ${url}`,
          type: activeTab,
          industry: '',
          department: '',
          visibility: 'public' as const,
          tags: ['imported', 'url'],
          url: url
        };
        
        await apiRequest('POST', '/api/containers', containerToCreate);
        
        toast({
          title: "Success",
          description: `${activeTab} imported successfully from URL`,
        });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "URL import failed. Please check the URL and try again.",
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
                        file.type === 'text/csv' || file.name.endsWith('.csv') ||
                        file.type === 'application/zip' || file.name.endsWith('.zip')) {
                      handleFileImport(file);
                    } else {
                      toast({
                        title: "Invalid file type",
                        description: "Please upload a JSON, CSV, or ZIP file.",
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
                    JSON, CSV, or ZIP files
                  </p>
                </div>
              </div>
              <Input
                id="file-input"
                type="file"
                className="hidden"
                accept=".json,.csv,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileImport(file);
                  }
                }}
                data-testid="file-input"
              />
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
