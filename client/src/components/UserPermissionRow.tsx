import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { User, UserPermission } from "@shared/schema";

interface UserPermissionRowProps {
  user: User;
  permissions?: UserPermission;
  onPermissionChange: (permissions: Partial<UserPermission>) => void;
  onRoleChange: (role: string) => void;
  isUpdating: boolean;
}

export default function UserPermissionRow({ 
  user, 
  permissions, 
  onPermissionChange, 
  onRoleChange, 
  isUpdating 
}: UserPermissionRowProps) {
  const [localPermissions, setLocalPermissions] = useState({
    canAccessApps: permissions?.canAccessApps ?? true,
    canAccessVoices: permissions?.canAccessVoices ?? true,
    canAccessWorkflows: permissions?.canAccessWorkflows ?? true,
  });

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.email) {
      return user.email;
    }
    return "Unknown User";
  };

  const handlePermissionChange = (key: keyof typeof localPermissions, checked: boolean) => {
    const newPermissions = { ...localPermissions, [key]: checked };
    setLocalPermissions(newPermissions);
    onPermissionChange(newPermissions);
  };

  return (
    <div 
      className="bg-muted/50 rounded-lg p-4 flex items-center justify-between"
      data-testid={`user-row-${user.id}`}
    >
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.profileImageUrl || undefined} />
          <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground" data-testid="user-name">
            {getUserDisplayName(user)}
          </p>
          <p className="text-sm text-muted-foreground" data-testid="user-email">
            {user.email || "No email"}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        {/* Apps Permission */}
        <div className="flex items-center space-x-2">
          <Label className="text-sm text-muted-foreground">Apps:</Label>
          <Checkbox
            checked={localPermissions.canAccessApps}
            onCheckedChange={(checked) => handlePermissionChange('canAccessApps', !!checked)}
            disabled={isUpdating}
            data-testid={`permission-apps-${user.id}`}
          />
        </div>

        {/* Voices Permission */}
        <div className="flex items-center space-x-2">
          <Label className="text-sm text-muted-foreground">Voices:</Label>
          <Checkbox
            checked={localPermissions.canAccessVoices}
            onCheckedChange={(checked) => handlePermissionChange('canAccessVoices', !!checked)}
            disabled={isUpdating}
            data-testid={`permission-voices-${user.id}`}
          />
        </div>

        {/* Workflows Permission */}
        <div className="flex items-center space-x-2">
          <Label className="text-sm text-muted-foreground">Workflows:</Label>
          <Checkbox
            checked={localPermissions.canAccessWorkflows}
            onCheckedChange={(checked) => handlePermissionChange('canAccessWorkflows', !!checked)}
            disabled={isUpdating}
            data-testid={`permission-workflows-${user.id}`}
          />
        </div>

        {/* Role Selection */}
        <Select 
          value={user.role} 
          onValueChange={onRoleChange}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-24" data-testid={`role-select-${user.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>

        {isUpdating && (
          <div className="text-xs text-muted-foreground">
            Updating...
          </div>
        )}
      </div>
    </div>
  );
}
