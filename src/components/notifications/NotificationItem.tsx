import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, CheckCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtRelativeBR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarkAsRead, useDeleteNotification } from '@/hooks/useNotifications';
import type { PoxpurNotification } from '@/types/database';

type Props = {
  notification: PoxpurNotification;
  onClose?: () => void;
};

export function NotificationItem({ notification, onClose }: Props) {
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();
  const deleteNotif = useDeleteNotification();

  function handleRowClick() {
    if (!notification.lida) {
      markAsRead.mutate({ id: notification.id });
    }
    if (notification.link) {
      navigate(notification.link);
      onClose?.();
    }
  }

  function handleMarkRead(e: React.MouseEvent) {
    e.stopPropagation();
    markAsRead.mutate({ id: notification.id });
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    deleteNotif.mutate({ id: notification.id });
  }

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary',
        !notification.lida && 'bg-primary/5',
      )}
    >
      {/* Unread dot */}
      <span
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          notification.lida ? 'bg-muted-foreground/30' : 'bg-primary',
        )}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm leading-snug',
            notification.lida ? 'font-normal text-foreground' : 'font-semibold text-foreground',
          )}
        >
          {notification.titulo}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.mensagem}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          {fmtRelativeBR(notification.criado_em)}
        </p>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {!notification.lida && (
            <DropdownMenuItem onClick={handleMarkRead}>
              <CheckCheck className="mr-2 h-3.5 w-3.5" />
              Marcar como lida
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Apagar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
