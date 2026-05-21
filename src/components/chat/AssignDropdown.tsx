import { Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSellers } from '@/hooks/useOrders';
import { useAssignConversation } from '@/hooks/useConversations';

type AssignDropdownProps = {
  conversationId: string;
  currentAssigneeId: string | null;
  children: React.ReactNode;
};

export function AssignDropdown({ conversationId, currentAssigneeId, children }: AssignDropdownProps) {
  const { data: sellers, isLoading } = useSellers();
  const assign = useAssignConversation();

  const handleAssign = (sellerId: string | null) => {
    assign.mutate({ id: conversationId, sellerId });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Atribuir vendedor</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading && (
          <DropdownMenuItem disabled>
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Carregando...
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => handleAssign(null)}
          className={!currentAssigneeId ? 'font-medium text-poxpur-green' : ''}
        >
          Sem atribuição
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {sellers?.map((seller) => (
          <DropdownMenuItem
            key={seller.id}
            onClick={() => handleAssign(seller.id)}
            className={currentAssigneeId === seller.id ? 'font-medium text-poxpur-green' : ''}
          >
            {seller.nome}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
