import { Card, CardContent } from "@/components/ui/card";
import { Box, Eye, Users } from "lucide-react";
import type { ContainerStats } from "@shared/schema";

interface StatisticsCardsProps {
  stats?: ContainerStats;
}

export default function StatisticsCards({ stats }: StatisticsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Containers</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-total-containers">
                {stats?.totalContainers || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Box className="text-primary text-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Views</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-total-views">
                {stats?.totalViews?.toLocaleString() || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Eye className="text-accent text-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Users</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-active-users">
                {stats?.activeUsers || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Users className="text-blue-500 text-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
