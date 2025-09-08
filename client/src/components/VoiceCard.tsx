import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, Volume2, Download, Heart, Clock, BarChart3, Mic, ExternalLink, Monitor } from "lucide-react";
import type { Container } from "@shared/schema";

interface VoiceCardProps {
  container: Container;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}

export default function VoiceCard({ container, onView, onDelete, canDelete }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showIframe, setShowIframe] = useState(false);

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

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Generate mock voice characteristics
  const voiceCharacteristics = {
    language: ['English', 'Spanish', 'French', 'German'][Math.floor(Math.random() * 4)],
    gender: ['Male', 'Female', 'Neutral'][Math.floor(Math.random() * 3)],
    age: ['Young', 'Adult', 'Mature'][Math.floor(Math.random() * 3)],
    accent: ['American', 'British', 'Australian', 'Neutral'][Math.floor(Math.random() * 4)],
  };

  return (
    <Card className="container-card group hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white">
                <Mic className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base truncate" data-testid="container-title">
                  {container.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Added {formatDate(container.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            Voice
          </Badge>
        </div>

        {/* Voice Preview Controls */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <Button
              size="sm"
              variant={isPlaying ? "default" : "outline"}
              onClick={handlePlayPause}
              className={isPlaying ? "bg-purple-600 hover:bg-purple-700" : "border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"}
              data-testid="play-pause-button"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Voice Preview</span>
              </div>
              <div className="w-full bg-purple-100 dark:bg-purple-900 rounded-full h-2">
                <div 
                  className={`bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300 ${
                    isPlaying ? 'animate-pulse' : ''
                  }`}
                  style={{ width: isPlaying ? '100%' : '0%' }}
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsLiked(!isLiked)}
              className={isLiked ? "text-red-500" : "text-gray-400"}
              data-testid="like-button"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Voice Characteristics */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded">
            <div className="font-medium text-purple-700 dark:text-purple-300">Language</div>
            <div className="text-muted-foreground">{voiceCharacteristics.language}</div>
          </div>
          <div className="bg-pink-50 dark:bg-pink-900/30 p-2 rounded">
            <div className="font-medium text-pink-700 dark:text-pink-300">Gender</div>
            <div className="text-muted-foreground">{voiceCharacteristics.gender}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded">
            <div className="font-medium text-purple-700 dark:text-purple-300">Age</div>
            <div className="text-muted-foreground">{voiceCharacteristics.age}</div>
          </div>
          <div className="bg-pink-50 dark:bg-pink-900/30 p-2 rounded">
            <div className="font-medium text-pink-700 dark:text-pink-300">Accent</div>
            <div className="text-muted-foreground">{voiceCharacteristics.accent}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4" data-testid="container-description">
          {container.description || "Professional AI voice for narration, podcasts, and media production"}
        </p>

        {/* Tags */}
        {container.tags && container.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {container.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs px-2 py-0.5 bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/50 dark:border-purple-700 dark:text-purple-300">
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
        <div className="flex gap-2 pt-2 border-t border-purple-200 dark:border-purple-800">
          <Button 
            size="sm" 
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            onClick={() => onView(container.id)}
            data-testid="use-voice-button"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Use Voice
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
            onClick={handleViewVoice}
            data-testid="preview-button"
          >
            <Monitor className="w-4 h-4" />
          </Button>
        </div>

        {/* Industry/Department Info */}
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
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{Math.floor(Math.random() * 100) + 20} likes</span>
            </div>
            <span>{container.views || 0} plays</span>
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
    </Card>
  );
}