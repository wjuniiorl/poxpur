import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useNotifications,
  useUnreadCount,
  useMarkAllAsRead,
  useNotificationsRealtime,
} from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  // Subscribe to realtime updates
  useNotificationsRealtime();

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();

  const displayedNotifications = notifications.slice(0, 30);
  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificações${hasUnread ? ` — ${unreadCount} não lidas` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span
              className={cn(
                'absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] p-0"
        style={{ maxHeight: '480px', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notificações</DropdownMenuLabel>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />

        {/* Body — scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 px-3 py-2.5">
                  <Skeleton className="mt-1 h-2 w-2 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-poxpur-green/10">
                <Bell className="h-6 w-6 text-poxpur-green" />
              </div>
              <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
              <p className="mt-1 text-xs text-muted-foreground">Nenhuma notificação no momento.</p>
            </div>
          ) : (
            <div className="p-1">
              {displayedNotifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 30 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <DropdownMenuItem className="justify-center text-xs text-muted-foreground">
              Mostrando 30 de {notifications.length} notificações
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
