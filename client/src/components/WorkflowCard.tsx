import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, Settings, Copy, Clock, Zap, BarChart3, Workflow, ExternalLink, Monitor, Edit, Expand, CheckCircle, ArrowRight, Database, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Container } from "@shared/schema";
import UrlStatusIcon from "./UrlStatusIcon";

interface WorkflowCardProps {
  container: Container;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, updates: Partial<Container>) => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

export default function WorkflowCard({ container, onView, onDelete, onEdit, canDelete, canEdit = true }: WorkflowCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExpandedView, setShowExpandedView] = useState(false);
  const { toast } = useToast();
  const [editForm, setEditForm] = useState({
    title: container.title,
    description: container.description || '',
    url: container.url || ''
  });

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    onView(container.id);
    // Simulate workflow execution
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsRunning(false);
    setLastRun(new Date());
  };

  const handleViewWorkflow = () => {
    onView(container.id);
    if (container.url) {
      setShowIframe(true);
    }
  };

  const handleEdit = () => {
    setEditForm({
      title: container.title,
      description: container.description || '',
      url: container.url || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(container.id, {
        title: editForm.title,
        description: editForm.description,
        url: editForm.url
      });
    }
    setShowEditModal(false);
  };

  const handleCopyInstructions = async () => {
    const instructions = container.fullInstructions || container.description || 'No instructions available';
    try {
      await navigator.clipboard.writeText(instructions);
      toast({
        title: "Copied!",
        description: "Full instructions copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const parseWorkflowData = () => {
    // Try to extract JSONL-formatted data from the container
    const tags = container.tags || [];
    const hasJsonlData = tags.includes('jsonl') || tags.includes('imported');
    
    if (hasJsonlData && container.fullInstructions) {
      try {
        // Try to parse JSON workflow data if available
        const workflowData = JSON.parse(container.fullInstructions);
        return {
          isJsonl: true,
          title: workflowData.Prompt_Name || container.title,
          description: workflowData.What_it_does || container.description,
          importance: workflowData.Why_It_matters || '',
          timeComparison: workflowData['Avg._time_spent_manual_vs_automatic'] || '',
          visualFlow: workflowData.Visual_Flowchart || '',
          workflowJson: workflowData.Workflow_JSON || ''
        };
      } catch (error) {
        // If parsing fails, use regular container data
        return {
          isJsonl: false,
          title: container.title,
          description: container.description || '',
          importance: '',
          timeComparison: '',
          visualFlow: '',
          workflowJson: ''
        };
      }
    }
    
    return {
      isJsonl: false,
      title: container.title,
      description: container.description || '',
      importance: '',
      timeComparison: '',
      visualFlow: '',
      workflowJson: ''
    };
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Generate mock workflow metrics
  const workflowStats = {
    executions: Math.floor(Math.random() * 500) + 50,
    successRate: Math.floor(Math.random() * 20) + 80,
    avgDuration: Math.floor(Math.random() * 120) + 30,
    steps: Math.floor(Math.random() * 8) + 3,
  };

  return (
    <Card className="container-card group hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                <Workflow className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base truncate" data-testid="container-title">
                  {container.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Last run: {lastRun ? formatTime(lastRun) : 'Never'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Workflow
            </Badge>
            <UrlStatusIcon 
              status={container.urlStatus} 
              lastChecked={container.urlLastChecked ? new Date(container.urlLastChecked) : null} 
              error={container.urlCheckError} 
            />
          </div>
        </div>

        {/* Workflow Status */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-sm font-medium">
                {isRunning ? 'Running...' : 'Ready to execute'}
              </span>
            </div>
            <Button
              size="sm"
              variant={isRunning ? "secondary" : "default"}
              onClick={handleRunWorkflow}
              disabled={isRunning}
              className={!isRunning ? "bg-green-600 hover:bg-green-700" : ""}
              data-testid="run-workflow-button"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Running' : 'Run Now'}
            </Button>
          </div>
          
          {isRunning && (
            <div className="w-full bg-green-100 dark:bg-green-900 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>

        {/* Workflow Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Executions</span>
            </div>
            <div className="text-lg font-bold text-green-800 dark:text-green-200">{workflowStats.executions}</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Success Rate</span>
            </div>
            <div className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{workflowStats.successRate}%</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded text-xs">
            <div className="font-medium text-green-700 dark:text-green-300">Steps</div>
            <div className="text-muted-foreground">{workflowStats.steps} actions</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded text-xs">
            <div className="font-medium text-emerald-700 dark:text-emerald-300">Avg Duration</div>
            <div className="text-muted-foreground">{workflowStats.avgDuration}s</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4" data-testid="container-description">
          {container.description || "Automated workflow for streamlining business processes"}
        </p>

        {/* Tags */}
        {container.tags && container.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {container.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs px-2 py-0.5 bg-green-50 border-green-200 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300">
                {tag}
              </Badge>
            ))}
            {container.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 border-gray-200 text-gray-600">
                +{container.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-green-200 dark:border-green-800">
          <Button 
            size="sm" 
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            onClick={handleRunWorkflow}
            disabled={isRunning}
            data-testid="execute-button"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Executing...' : 'Execute'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowExpandedView(true)}
            data-testid="expand-button"
          >
            <Expand className="w-4 h-4" />
          </Button>
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEdit}
              data-testid="edit-button"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView(container.id)}
            data-testid="configure-button"
          >
            <Settings className="w-4 h-4" />
          </Button>
          {container.url && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => container.url && window.open(container.url, '_blank')}
              data-testid="external-button"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewWorkflow}
            data-testid="preview-button"
          >
            <Monitor className="w-4 h-4" />
          </Button>
        </div>

        {/* Industry/Department Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-green-100 dark:border-green-900">
          <div className="flex items-center gap-3">
            {container.industry && (
              <span className="bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded text-green-700 dark:text-green-300">
                {container.industry}
              </span>
            )}
            {container.department && (
              <span className="bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded text-emerald-700 dark:text-emerald-300">
                {container.department}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>Created {formatDate(container.createdAt)}</span>
          </div>
        </div>
      </CardContent>

      {/* Iframe Dialog */}
      <Dialog open={showIframe} onOpenChange={setShowIframe}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              {container.title}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
            {container.url ? (
              <iframe
                src={container.url}
                className="w-full h-full border-0"
                title={container.title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                data-testid="container-iframe"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                <div className="text-center">
                  <Workflow className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No URL available for preview</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded View Modal */}
      <Dialog open={showExpandedView} onOpenChange={setShowExpandedView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              {parseWorkflowData().isJsonl ? parseWorkflowData().title : container.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh] pr-2">
            {/* Left Column - Workflow Details */}
            <div className="space-y-4">
              {/* JSONL Data Badge */}
              {parseWorkflowData().isJsonl && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  JSONL Imported Workflow
                </Badge>
              )}
              
              {/* Full Instructions with Copy Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Full Instructions</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyInstructions}
                    className="h-7 px-2"
                    data-testid="copy-instructions"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={container.fullInstructions || container.description || 'No instructions available'}
                  readOnly
                  rows={6}
                  className="text-xs bg-muted font-mono"
                  data-testid="full-instructions"
                />
              </div>

              {/* JSONL Specific Data */}
              {parseWorkflowData().isJsonl && (
                <>
                  {parseWorkflowData().importance && (
                    <div>
                      <Label className="text-sm font-medium">Why It Matters</Label>
                      <p className="text-sm text-muted-foreground mt-1">{parseWorkflowData().importance}</p>
                    </div>
                  )}
                  
                  {parseWorkflowData().timeComparison && (
                    <div>
                      <Label className="text-sm font-medium">Time Comparison</Label>
                      <p className="text-sm text-muted-foreground mt-1">{parseWorkflowData().timeComparison}</p>
                    </div>
                  )}
                </>
              )}

              {/* Workflow Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">Executions</span>
                  </div>
                  <div className="text-lg font-bold text-green-800 dark:text-green-200">{workflowStats.executions}</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Success Rate</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{workflowStats.successRate}%</div>
                </div>
              </div>
            </div>

            {/* Right Column - Visual Workflow */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Visual Workflow
                </Label>
                
                {parseWorkflowData().visualFlow ? (
                  /* JSONL Visual Flow */
                  <div className="bg-muted rounded-lg p-4 mt-2">
                    <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                      {parseWorkflowData().visualFlow}
                    </pre>
                  </div>
                ) : (
                  /* Generic Visual Flow */
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 mt-2 border border-green-200 dark:border-green-800">
                    <div className="space-y-4 text-sm">
                      {/* Start Node */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-green-800 dark:text-green-200">Start Workflow</div>
                          <div className="text-xs text-muted-foreground">Initialize process</div>
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      
                      {/* Process Node */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Settings className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-blue-800 dark:text-blue-200">Process Data</div>
                          <div className="text-xs text-muted-foreground">{parseWorkflowData().description || 'Execute workflow logic'}</div>
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      
                      {/* Decision Node */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-yellow-800 dark:text-yellow-200">Validation</div>
                          <div className="text-xs text-muted-foreground">Verify results and conditions</div>
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      
                      {/* End Node */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-green-800 dark:text-green-200">Complete</div>
                          <div className="text-xs text-muted-foreground">Workflow finished successfully</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Workflow JSON (if available) */}
              {parseWorkflowData().workflowJson && (
                <div>
                  <Label className="text-sm font-medium">Workflow Definition</Label>
                  <Textarea
                    value={parseWorkflowData().workflowJson}
                    readOnly
                    rows={8}
                    className="text-xs bg-muted font-mono mt-2"
                    data-testid="workflow-json"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowExpandedView(false)}
            >
              Close
            </Button>
            <Button 
              onClick={handleCopyInstructions}
              data-testid="copy-instructions-footer"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Instructions
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({...prev, title: e.target.value}))}
                placeholder="Workflow title"
                data-testid="edit-title"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Workflow description"
                rows={3}
                data-testid="edit-description"
              />
            </div>
            <div>
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={editForm.url}
                onChange={(e) => setEditForm(prev => ({...prev, url: e.target.value}))}
                placeholder="Workflow URL"
                data-testid="edit-url"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} data-testid="save-edit">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}