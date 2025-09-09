import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, Volume2, Download, Heart, Clock, BarChart3, Mic, ExternalLink, Monitor, Edit, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Container } from "@shared/schema";
import UrlStatusIcon from "./UrlStatusIcon";

interface VoiceCardProps {
  container: Container;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, updates: Partial<Container>) => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

export default function VoiceCard({ container, onView, onDelete, onEdit, canDelete, canEdit = true }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFullInstructions, setShowFullInstructions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editForm, setEditForm] = useState({
    title: container.title,
    description: container.description || '',
    url: container.url || ''
  });

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    onView(container.id);
    // Simulate audio playback
    if (!isPlaying) {
      setTimeout(() => setIsPlaying(false), 3000);
    }
  };

  const handleViewVoice = () => {
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

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // No more title generation - just use the exact title from the database
  const getDisplayTitle = (container: Container) => {
    return container.title; // Show exactly what's in the database
  };

  const getFullInstructions = () => {
    return (container as any).fullInstructions || container.description || 'No voice instructions provided';
  };

  const handleCopyInstructions = async () => {
    const fullText = getFullInstructions();
    if (fullText) {
      try {
        await navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for browsers that don't support clipboard API
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <Card className="container-card group hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/20 dark:to-rose-950/20 border-orange-200 dark:border-orange-800">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-rose-500 rounded-full flex items-center justify-center text-white">
                <Mic className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base line-clamp-2 break-words" data-testid="container-title">
                  {container.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Added {formatDate(container.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Voice
            </Badge>
            <UrlStatusIcon 
              status={container.urlStatus} 
              lastChecked={container.urlLastChecked?.toString()} 
              error={container.urlCheckError} 
            />
          </div>
        </div>

        {/* Voice Instructions - Main Focus */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">Voice Instructions</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFullInstructions(true)}
                className="border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950 text-xs"
                data-testid="view-full-instructions-button"
              >
                <Monitor className="w-3 h-3 mr-1" />
                View Full
              </Button>
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded border border-orange-200 dark:border-orange-700 max-h-24 overflow-hidden">
            <p className="text-sm text-foreground line-clamp-3 break-words" data-testid="voice-instructions-preview">
              {getFullInstructions()}
            </p>
            {(getFullInstructions().length > 150) && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-2 italic">
                Click "View Full" to see complete instructions...
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {container.tags && container.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {container.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs px-2 py-0.5 bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/50 dark:border-orange-700 dark:text-orange-300">
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
        <div className="flex gap-2 pt-2 border-t border-orange-200 dark:border-orange-800">
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
            onClick={handleViewVoice}
            data-testid="preview-button"
          >
            <Monitor className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats and Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-purple-100 dark:border-purple-900">
          <div className="flex items-center gap-3">
            {container.industry && (
              <span className="bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded text-purple-700 dark:text-purple-300">
                {container.industry}
              </span>
            )}
            {container.department && (
              <span className="bg-pink-100 dark:bg-pink-900/50 px-2 py-1 rounded text-pink-700 dark:text-pink-300">
                {container.department}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>{container.views || 0} uses</span>
          </div>
        </div>
      </CardContent>

      {/* Iframe Dialog */}
      <Dialog open={showIframe} onOpenChange={setShowIframe}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
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
                  <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No URL available for preview</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Instructions Modal */}
      <Dialog open={showFullInstructions} onOpenChange={setShowFullInstructions}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              {container.title} - Complete Instructions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {container.industry && (
                  <span className="bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded text-purple-700 dark:text-purple-300 mr-2">
                    {container.industry}
                  </span>
                )}
                {container.department && (
                  <span className="bg-pink-100 dark:bg-pink-900/50 px-2 py-1 rounded text-pink-700 dark:text-pink-300">
                    {container.department}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleCopyInstructions}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="copy-full-instructions-button"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Complete Instructions
                  </>
                )}
              </Button>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded border border-purple-200 dark:border-purple-700 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed" data-testid="full-voice-instructions">
                {getFullInstructions()}
              </pre>
            </div>
            
            {/* Agent Details */}
            {((container as any).aiVoiceAgentType || (container as any).experienceLevel || (container as any).personality || (container as any).agentName) && (
              <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-muted rounded">
                <div className="text-sm">
                  <strong>Agent Type:</strong> {(container as any).aiVoiceAgentType || 'N/A'}
                </div>
                <div className="text-sm">
                  <strong>Experience:</strong> {(container as any).experienceLevel || 'N/A'}
                </div>
                <div className="text-sm">
                  <strong>Name:</strong> {(container as any).agentName || 'N/A'}
                </div>
                <div className="text-sm">
                  <strong>Personality:</strong> {(container as any).personality || 'N/A'}
                </div>
                {(container as any).specialization && (
                  <div className="text-sm col-span-2">
                    <strong>Specialization:</strong> {(container as any).specialization}
                  </div>
                )}
                {(container as any).useCase && (
                  <div className="text-sm col-span-2">
                    <strong>Use Case:</strong> {(container as any).useCase}
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <strong>Instructions for 11Labs:</strong> Copy the complete text above and paste it into the "Voice Description" or "System Prompt" field when creating your AI voice agent. This prompt defines the voice's personality, expertise, and response style.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Voice Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({...prev, title: e.target.value}))}
                placeholder="Voice agent title"
                data-testid="edit-title"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Voice agent description"
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
                placeholder="Voice agent URL"
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