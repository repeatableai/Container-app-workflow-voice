import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Eye, ExternalLink, Star, Users, Calendar, Monitor, Edit, Activity } from "lucide-react";
import type { Container } from "@shared/schema";
import UrlStatusIcon from "./UrlStatusIcon";

interface AppCardProps {
  container: Container;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, updates: Partial<Container>) => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

export default function AppCard({ container, onView, onDelete, onEdit, canDelete, canEdit = true }: AppCardProps) {
  const [showIframe, setShowIframe] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);


  const handleViewApp = () => {
    onView(container.id);
    if (container.url) {
      setShowIframe(true);
      setIframeError(false);
      setIframeLoading(true);
    }
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError(true);
  };

  const openInNewTab = () => {
    if (container.url) {
      window.open(container.url, '_blank');
      setShowIframe(false);
    }
  };

  const [editForm, setEditForm] = useState({
    title: container.title,
    description: container.description || '',
    url: container.url || ''
  });

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

  return (
    <Card className="container-card group hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/20 dark:to-indigo-950/20 border-sky-200 dark:border-sky-800">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                {container.title.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base truncate" data-testid="container-title">
                  {container.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Published {formatDate(container.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            <Badge variant="secondary" className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
              App
            </Badge>
            <UrlStatusIcon 
              status={container.urlStatus} 
              lastChecked={container.urlLastChecked?.toString()} 
              error={container.urlCheckError} 
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]" data-testid="container-description">
          {container.description || "No description available"}
        </p>

        {/* App Metrics */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>{Math.floor(Math.random() * 1000) + 100} installs</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-current text-yellow-500" />
            <span>{(Math.random() * 2 + 3).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{Math.floor(Math.random() * 50) + 10} reviews</span>
          </div>
        </div>

        {/* Tags */}
        {container.tags && container.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {container.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs px-2 py-0.5 bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/50 dark:border-sky-700 dark:text-sky-300">
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
        <div className="flex gap-2 pt-2 border-t border-sky-200 dark:border-sky-800">
          <Button 
            size="sm" 
            className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600"
            onClick={handleViewApp}
            data-testid="preview-button"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Preview
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
          {container.url && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => container.url && window.open(container.url, '_blank')}
              data-testid="new-tab-button"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Industry/Department Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-blue-100 dark:border-blue-900">
          <div className="flex items-center gap-3">
            {container.industry && (
              <span className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded text-blue-700 dark:text-blue-300">
                {container.industry}
              </span>
            )}
            {container.department && (
              <span className="bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded text-indigo-700 dark:text-indigo-300">
                {container.department}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{container.views || 0} views</span>
          </div>
        </div>
      </CardContent>

      {/* Iframe Dialog */}
      <Dialog open={showIframe} onOpenChange={setShowIframe}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              {container.title}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] border rounded-lg overflow-hidden relative">
            {container.url ? (
              <>
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading app...</p>
                    </div>
                  </div>
                )}
                {iframeError ? (
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 text-muted-foreground">
                    <div className="text-center max-w-lg p-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Monitor className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="font-semibold mb-3 text-lg text-foreground">Preview Not Available</h3>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p className="font-medium text-orange-700 dark:text-orange-300">Why this happens:</p>
                        <div className="text-left space-y-2 bg-white/60 dark:bg-gray-900/60 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p>• <strong>Security Headers:</strong> The app blocks embedding to prevent clickjacking</p>
                          <p>• <strong>Authentication:</strong> Login screens don't work in preview mode</p>
                          <p>• <strong>HTTPS/SSL:</strong> Mixed content security restrictions</p>
                        </div>
                        <p className="text-center font-medium text-foreground">This is normal - most professional apps intentionally prevent embedding.</p>
                      </div>
                      <div className="mt-6 space-y-3">
                        <Button onClick={openInNewTab} className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open App in New Tab
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          The app will work normally in its own tab with full functionality.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={container.url}
                    className="w-full h-full border-0"
                    title={container.title}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    data-testid="container-iframe"
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                <div className="text-center">
                  <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No URL available for preview</p>
                </div>
              </div>
            )}
          </div>
          {!iframeError && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-xs text-muted-foreground">
                💡 For best experience, try opening in a new tab if preview seems limited.
              </p>
              <Button variant="outline" size="sm" onClick={openInNewTab}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Container
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({...prev, title: e.target.value}))}
                placeholder="Container title"
                data-testid="edit-title"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Container description"
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
                placeholder="Container URL"
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