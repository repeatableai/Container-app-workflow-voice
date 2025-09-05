import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/Header";
import UserPermissionRow from "@/components/UserPermissionRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Users, Shield, Settings } from "lucide-react";
import { Link } from "wouter";
import type { User, UserPermission } from "@shared/schema";

type UserWithPermissions = User & { permissions?: UserPermission };

export default function Admin() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Redirect if not authenticated or not admin/viewer
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'viewer'))) {
      toast({
        title: "Unauthorized",
        description: "Admin or Viewer access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = user ? "/" : "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithPermissions[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAuthenticated && (user?.role === 'admin' || user?.role === 'viewer'),
    retry: false,
  });

  // Update user permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: Partial<UserPermission> }) => {
      await apiRequest('PUT', `/api/admin/users/${userId}/permissions`, permissions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user permissions",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest('PUT', `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handlePermissionChange = (userId: string, permissions: Partial<UserPermission>) => {
    updatePermissionsMutation.mutate({ userId, permissions });
  };

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };

  if (isLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery="" onSearchChange={() => {}} showSearch={false} />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="back-button">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">Manage user permissions and access controls</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-users-count">
                {users.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="admin-users-count">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Viewer Users</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="viewer-users-count">
                {users.filter(u => u.role === 'viewer').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management & Permissions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage user roles and permissions for accessing different container types
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              users.map((userData) => (
                <UserPermissionRow
                  key={userData.id}
                  user={userData}
                  permissions={userData.permissions}
                  onPermissionChange={(permissions) => handlePermissionChange(userData.id, permissions)}
                  onRoleChange={(role) => handleRoleChange(userData.id, role)}
                  isUpdating={updatePermissionsMutation.isPending || updateRoleMutation.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
