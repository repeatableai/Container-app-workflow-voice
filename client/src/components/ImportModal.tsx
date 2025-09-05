import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download } from "lucide-react";

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
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Success",
        description: `${type === 'mass' ? 'Mass import' : 'Import'} completed successfully`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Import failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleURLImport = async (url: string) => {
    setIsImporting(true);
    try {
      // Simulate URL processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Success",
        description: "Container imported from URL successfully",
      });
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
      JSON.parse(jsonData); // Validate JSON
      
      // Simulate JSON processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Containers imported from JSON successfully",
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
    const template = {
      containers: [
        {
          title: "Example Container",
          description: "This is an example container",
          type: "app",
          industry: "Technology",
          department: "Engineering",
          visibility: "public",
          tags: ["example", "template"]
        }
      ]
    };
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'container-template.json';
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
              <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JSON, CSV, or ZIP files
                  </p>
                  <Input
                    type="file"
                    className="sr-only"
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
              </div>
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
