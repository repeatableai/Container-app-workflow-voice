import { CheckCircle, XCircle, AlertTriangle, Clock, Shield, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UrlStatusIconProps {
  status?: string | null;
  lastChecked?: string | null;
  error?: string | null;
  showTooltip?: boolean;
}

export default function UrlStatusIcon({ status, lastChecked, error, showTooltip = true }: UrlStatusIconProps) {
  if (!status || status === 'unknown') {
    return null; // Don't show anything for unknown status
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          label: 'Active',
          variant: 'default' as const
        };
      case 'broken':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          label: 'Broken',
          variant: 'destructive' as const
        };
      case 'auth_required':
        return {
          icon: Shield,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          label: 'Auth Required',
          variant: 'secondary' as const
        };
      case 'timeout':
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          label: 'Timeout',
          variant: 'outline' as const
        };
      case 'blocked':
        return {
          icon: AlertTriangle,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          label: 'Blocked',
          variant: 'outline' as const
        };
      default:
        return {
          icon: HelpCircle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          label: 'Unknown',
          variant: 'outline' as const
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatLastChecked = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const tooltipText = showTooltip ? 
    `${config.label}${lastChecked ? ` • Checked ${formatLastChecked(lastChecked)}` : ''}${error ? ` • ${error}` : ''}` : 
    '';

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1 text-xs px-2 py-1 ${config.bgColor} border-0`}
      title={tooltipText}
      data-testid={`url-status-${status}`}
    >
      <Icon size={12} className={config.color} />
      <span className={config.color}>{config.label}</span>
    </Badge>
  );
}