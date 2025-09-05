import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  BarChart3, 
  Mic, 
  Settings, 
  MoreHorizontal, 
  Copy, 
  Share, 
  Trash2, 
  Play,
  Edit,
  Download,
  Eye,
  Lock,
  Users,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import type { Container } from "@shared/schema";

interface ContainerCardProps {
  container: Container;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export default function ContainerCard({ container, onDelete, onView }: ContainerCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'app':
        return <BarChart3 className="h-5 w-5" />;
      case 'voice':
        return <Mic className="h-5 w-5" />;
      case 'workflow':
        return <Settings className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'app':
        return 'text-blue-500 bg-blue-500/10';
      case 'voice':
        return 'text-purple-500 bg-purple-500/10';
      case 'workflow':
        return 'text-green-500 bg-green-500/10';
      default:
        return 'text-blue-500 bg-blue-500/10';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Users className="h-3 w-3" />;
      case 'restricted':
        return <Shield className="h-3 w-3" />;
      case 'admin_only':
        return <Lock className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Public';
      case 'restricted':
        return 'Restricted';
      case 'admin_only':
        return 'Admin Only';
      default:
        return 'Public';
    }
  };

  const handleView = () => {
    onView(container.id);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this container?')) {
      onDelete(container.id);
    }
  };

  return (
    <Card 
      className="container-card cursor-pointer"
      onClick={handleView}
      data-testid={`container-card-${container.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(container.type)}`}>
              {getTypeIcon(container.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate" data-testid="container-title">
                {container.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2" data-testid="container-description">
                {container.description || "No description available"}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="p-1" data-testid="container-actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {container.type === 'voice' && (
                <DropdownMenuItem data-testid="action-play">
                  <Play className="mr-2 h-4 w-4" />
                  Play
                </DropdownMenuItem>
              )}
              {container.type === 'workflow' && (
                <DropdownMenuItem data-testid="action-run">
                  <Play className="mr-2 h-4 w-4" />
                  Run
                </DropdownMenuItem>
              )}
              <DropdownMenuItem data-testid="action-copy">
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="action-edit">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="action-download">
                <Download className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="action-share">
                <Share className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-destructive"
                data-testid="action-delete"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {container.industry && (
            <Badge variant="outline" className="text-xs">
              {container.industry}
            </Badge>
          )}
          {container.department && (
            <Badge variant="outline" className="text-xs">
              {container.department}
            </Badge>
          )}
          {container.tags?.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1" data-testid="container-views">
              <Eye className="h-3 w-3" />
              <span>{container.views || 0} views</span>
            </span>
            <span className="flex items-center space-x-1" data-testid="container-visibility">
              {getVisibilityIcon(container.visibility)}
              <span>{getVisibilityLabel(container.visibility)}</span>
            </span>
          </div>
          <span data-testid="container-date">
            {container.createdAt ? format(new Date(container.createdAt), 'M/d/yyyy') : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
