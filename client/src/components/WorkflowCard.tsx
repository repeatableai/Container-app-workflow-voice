import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, Settings, Copy, Clock, Zap, BarChart3, Workflow, ExternalLink, Monitor, Edit, Expand, CheckCircle, ArrowRight, Database, MessageSquare, FileText, Eye, Code } from "lucide-react";
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
              lastChecked={container.urlLastChecked} 
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

      {/* Expanded View Modal with Tabs */}
      <Dialog open={showExpandedView} onOpenChange={setShowExpandedView}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              {parseWorkflowData().isJsonl ? parseWorkflowData().title : container.title}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="visual" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="visual" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Visual Workflow
              </TabsTrigger>
              <TabsTrigger value="instructions" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Instructions
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Configuration
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* JSONL Data Badge */}
                {parseWorkflowData().isJsonl && (
                  <div className="col-span-full">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      JSONL Imported Workflow
                    </Badge>
                  </div>
                )}
                
                {/* Workflow Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Executions</span>
                    </div>
                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">{workflowStats.executions}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Success Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{workflowStats.successRate}%</div>
                  </div>
                </div>

                {/* JSONL Specific Data */}
                <div className="space-y-4">
                  {parseWorkflowData().isJsonl && parseWorkflowData().importance && (
                    <div>
                      <Label className="text-sm font-medium">Why It Matters</Label>
                      <p className="text-sm text-muted-foreground mt-1">{parseWorkflowData().importance}</p>
                    </div>
                  )}
                  
                  {parseWorkflowData().isJsonl && parseWorkflowData().timeComparison && (
                    <div>
                      <Label className="text-sm font-medium">Time Comparison</Label>
                      <p className="text-sm text-muted-foreground mt-1">{parseWorkflowData().timeComparison}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">{parseWorkflowData().description || 'No description available'}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Visual Workflow Tab */}
            <TabsContent value="visual" className="mt-6">
              {/* Always Show Lindy.ai Style Professional Flowchart */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative overflow-hidden">
                  {/* Subtle Grid Background - Lindy.ai Style */}
                  <div 
                    className="absolute inset-0 opacity-10 dark:opacity-20" 
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(100,116,139,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(100,116,139,0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px'
                    }}
                  />
                  
                  {/* Workflow Canvas - Column-Based Lindy.ai Layout */}
                  <div className="relative z-10">
                    <svg viewBox="0 0 1200 800" className="w-full h-[500px]">
                      {/* Connection Lines - Clean Straight Lines */}
                      <line x1="150" y1="120" x2="150" y2="200" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="150" y1="280" x2="150" y2="360" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="150" y1="440" x2="150" y2="520" stroke="#94a3b8" strokeWidth="2" />
                      
                      <line x1="450" y1="120" x2="450" y2="200" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="450" y1="280" x2="450" y2="360" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="450" y1="440" x2="450" y2="520" stroke="#94a3b8" strokeWidth="2" />
                      
                      <line x1="750" y1="120" x2="750" y2="200" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="750" y1="280" x2="750" y2="360" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="750" y1="440" x2="750" y2="520" stroke="#94a3b8" strokeWidth="2" />
                      
                      <line x1="1050" y1="120" x2="1050" y2="200" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="1050" y1="280" x2="1050" y2="360" stroke="#94a3b8" strokeWidth="2" />
                      
                      {/* Horizontal connections between columns */}
                      <line x1="210" y1="80" x2="390" y2="80" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="510" y1="80" x2="690" y2="80" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="810" y1="80" x2="990" y2="80" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="210" y1="240" x2="390" y2="240" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="510" y1="240" x2="690" y2="240" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="810" y1="240" x2="990" y2="240" stroke="#94a3b8" strokeWidth="2" />
                      
                      {/* COLUMN 1: Trigger & Setup */}
                      
                      {/* Webhook Trigger */}
                      <rect x="70" y="50" width="160" height="60" rx="8" fill="#10b981" stroke="#059669" strokeWidth="1" />
                      <rect x="80" y="55" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="90" y="68" textAnchor="middle" className="fill-white text-xs">⚡</text>
                      <text x="130" y="70" className="fill-white text-sm font-medium">Webhook</text>
                      <text x="130" y="85" className="fill-white text-xs">Customer Event</text>
                      <text x="130" y="100" className="fill-white text-xs">Reception</text>
                      
                      {/* Capture Data */}
                      <rect x="70" y="210" width="160" height="60" rx="8" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
                      <rect x="80" y="215" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="90" y="228" textAnchor="middle" className="fill-white text-xs">📥</text>
                      <text x="130" y="230" className="fill-white text-sm font-medium">Capture</text>
                      <text x="130" y="245" className="fill-white text-xs">Event Information</text>
                      <text x="130" y="260" className="fill-white text-xs">Data Structure</text>
                      
                      {/* Parse Data */}
                      <rect x="70" y="370" width="160" height="60" rx="8" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="1" />
                      <rect x="80" y="375" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="90" y="388" textAnchor="middle" className="fill-white text-xs">🔧</text>
                      <text x="130" y="390" className="fill-white text-sm font-medium">Parse</text>
                      <text x="130" y="405" className="fill-white text-xs">Customer Data</text>
                      <text x="130" y="420" className="fill-white text-xs">Fields</text>
                      
                      {/* Validate Format */}
                      <rect x="70" y="530" width="160" height="60" rx="8" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
                      <rect x="80" y="535" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="90" y="548" textAnchor="middle" className="fill-white text-xs">✓</text>
                      <text x="130" y="550" className="fill-white text-sm font-medium">Validate</text>
                      <text x="130" y="565" className="fill-white text-xs">Data Format</text>
                      <text x="130" y="580" className="fill-white text-xs">Requirements</text>
                      
                      {/* COLUMN 2: Processing */}
                      
                      {/* Email & Marketing Message */}
                      <rect x="370" y="50" width="160" height="60" rx="8" fill="#06b6d4" stroke="#0891b2" strokeWidth="1" />
                      <rect x="380" y="55" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="390" y="68" textAnchor="middle" className="fill-white text-xs">📧</text>
                      <text x="430" y="70" className="fill-white text-sm font-medium">Send Message</text>
                      <text x="430" y="85" className="fill-white text-xs">Email Marketing</text>
                      <text x="430" y="100" className="fill-white text-xs">Campaign</text>
                      
                      {/* Validated Customer Data */}
                      <rect x="370" y="210" width="160" height="60" rx="8" fill="#84cc16" stroke="#65a30d" strokeWidth="1" />
                      <rect x="380" y="215" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="390" y="228" textAnchor="middle" className="fill-white text-xs">📊</text>
                      <text x="430" y="230" className="fill-white text-sm font-medium">Validated Data</text>
                      <text x="430" y="245" className="fill-white text-xs">Customer Info</text>
                      <text x="430" y="260" className="fill-white text-xs">Ready for Use</text>
                      
                      {/* Error Handler */}
                      <rect x="370" y="370" width="160" height="60" rx="8" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
                      <rect x="380" y="375" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="390" y="388" textAnchor="middle" className="fill-white text-xs">⚠️</text>
                      <text x="430" y="390" className="fill-white text-sm font-medium">Error</text>
                      <text x="430" y="405" className="fill-white text-xs">Exception Handler</text>
                      <text x="430" y="420" className="fill-white text-xs">Fallback Logic</text>
                      
                      {/* Calculate Statistics Score */}
                      <rect x="370" y="530" width="160" height="60" rx="8" fill="#a855f7" stroke="#9333ea" strokeWidth="1" />
                      <rect x="380" y="535" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="390" y="548" textAnchor="middle" className="fill-white text-xs">📈</text>
                      <text x="430" y="550" className="fill-white text-sm font-medium">Statistics</text>
                      <text x="430" y="565" className="fill-white text-xs">Score Calculation</text>
                      <text x="430" y="580" className="fill-white text-xs">Analytics</text>
                      
                      {/* COLUMN 3: Database & Storage */}
                      
                      {/* Add to Marketing Campaign */}
                      <rect x="670" y="50" width="160" height="60" rx="8" fill="#ec4899" stroke="#db2777" strokeWidth="1" />
                      <rect x="680" y="55" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="690" y="68" textAnchor="middle" className="fill-white text-xs">🎯</text>
                      <text x="730" y="70" className="fill-white text-sm font-medium">Add to Campaign</text>
                      <text x="730" y="85" className="fill-white text-xs">Marketing List</text>
                      <text x="730" y="100" className="fill-white text-xs">Segmentation</text>
                      
                      {/* Database */}
                      <rect x="670" y="210" width="160" height="60" rx="8" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1" />
                      <rect x="680" y="215" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="690" y="228" textAnchor="middle" className="fill-white text-xs">🗄️</text>
                      <text x="730" y="230" className="fill-white text-sm font-medium">Database</text>
                      <text x="730" y="245" className="fill-white text-xs">Save Customer</text>
                      <text x="730" y="260" className="fill-white text-xs">Record</text>
                      
                      {/* Save */}
                      <rect x="670" y="370" width="160" height="60" rx="8" fill="#059669" stroke="#047857" strokeWidth="1" />
                      <rect x="680" y="375" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="690" y="388" textAnchor="middle" className="fill-white text-xs">💾</text>
                      <text x="730" y="390" className="fill-white text-sm font-medium">Save</text>
                      <text x="730" y="405" className="fill-white text-xs">Audit Trail</text>
                      <text x="730" y="420" className="fill-white text-xs">Log Actions</text>
                      
                      {/* Scheduled Follow-up Task */}
                      <rect x="670" y="530" width="160" height="60" rx="8" fill="#ea580c" stroke="#dc2626" strokeWidth="1" />
                      <rect x="680" y="535" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="690" y="548" textAnchor="middle" className="fill-white text-xs">⏰</text>
                      <text x="730" y="550" className="fill-white text-sm font-medium">Schedule</text>
                      <text x="730" y="565" className="fill-white text-xs">Follow-up Task</text>
                      <text x="730" y="580" className="fill-white text-xs">Reminder</text>
                      
                      {/* COLUMN 4: Completion */}
                      
                      {/* Process Complete Success */}
                      <rect x="970" y="50" width="160" height="60" rx="8" fill="#16a34a" stroke="#15803d" strokeWidth="1" />
                      <rect x="980" y="55" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="990" y="68" textAnchor="middle" className="fill-white text-xs">✅</text>
                      <text x="1030" y="70" className="fill-white text-sm font-medium">Success</text>
                      <text x="1030" y="85" className="fill-white text-xs">Process Complete</text>
                      <text x="1030" y="100" className="fill-white text-xs">Customer Added</text>
                      
                      {/* Process Complete Pending Review */}
                      <rect x="970" y="210" width="160" height="60" rx="8" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                      <rect x="980" y="215" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="990" y="228" textAnchor="middle" className="fill-white text-xs">⏳</text>
                      <text x="1030" y="230" className="fill-white text-sm font-medium">Pending</text>
                      <text x="1030" y="245" className="fill-white text-xs">Manual Review</text>
                      <text x="1030" y="260" className="fill-white text-xs">Required</text>
                      
                      {/* Send Subscription Bundle */}
                      <rect x="970" y="370" width="160" height="60" rx="8" fill="#7c3aed" stroke="#6d28d9" strokeWidth="1" />
                      <rect x="980" y="375" width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                      <text x="990" y="388" textAnchor="middle" className="fill-white text-xs">📦</text>
                      <text x="1030" y="390" className="fill-white text-sm font-medium">Bundle</text>
                      <text x="1030" y="405" className="fill-white text-xs">Send Subscription</text>
                      <text x="1030" y="420" className="fill-white text-xs">Package</text>
                    </svg>
                    
                    {/* Clean Professional Legend */}
                    <div className="mt-8 grid grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                        <span className="text-muted-foreground">Triggers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                        <span className="text-muted-foreground">Data Processing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                        <span className="text-muted-foreground">Logic & Validation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
                        <span className="text-muted-foreground">Database & Storage</span>
                      </div>
                    </div>
                  </div>
                </div>
            </TabsContent>

            {/* Instructions Tab */}
            <TabsContent value="instructions" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-medium">Full Workflow Instructions</Label>
                  <Button
                    onClick={handleCopyInstructions}
                    data-testid="copy-instructions-tab"
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </Button>
                </div>
                <Textarea
                  value={container.fullInstructions || container.description || 'No instructions available'}
                  readOnly
                  rows={15}
                  className="text-sm bg-muted font-mono"
                  data-testid="full-instructions-tab"
                />
                
                {/* Workflow Steps Summary */}
                <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <h4 className="text-lg font-medium mb-3">Workflow Implementation Steps:</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-medium">1.</span>
                      Initialize workflow and setup database connection for product accounts
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-medium">2.</span>
                      Configure webhook to trigger on customer signup events
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 font-medium">3.</span>
                      Capture and process customer data from signup form
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 font-medium">4.</span>
                      Validate customer information against business rules
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-medium">5.</span>
                      Manual review process for exceptions or complex cases
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-medium">6.</span>
                      Complete workflow and store final customer profile
                    </li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-6 mt-6">
              {parseWorkflowData().workflowJson ? (
                <div className="space-y-4">
                  <Label className="text-lg font-medium">Workflow JSON Configuration</Label>
                  <Textarea
                    value={parseWorkflowData().workflowJson}
                    readOnly
                    rows={12}
                    className="text-sm bg-muted font-mono"
                    data-testid="workflow-json-tab"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <Label className="text-lg font-medium">Workflow Configuration</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Industry</Label>
                      <div className="p-2 bg-muted rounded text-sm">{container.industry || 'Not specified'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Department</Label>
                      <div className="p-2 bg-muted rounded text-sm">{container.department || 'Not specified'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Visibility</Label>
                      <div className="p-2 bg-muted rounded text-sm">{container.visibility || 'Public'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Type</Label>
                      <div className="p-2 bg-muted rounded text-sm">{container.type}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {container.tags?.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      )) || <span className="text-sm text-muted-foreground">No tags</span>}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
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