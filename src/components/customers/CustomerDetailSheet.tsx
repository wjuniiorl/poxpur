import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Pencil, Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import type { PoxpurCustomer } from '@/types/database';

// ─── Props ───────────────────────────────────────────────────────────────────

type CustomerDetailSheetProps = {
  customer: PoxpurCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (customer: PoxpurCustomer) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
  onEdit,
}: CustomerDetailSheetProps) {
  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">{customer.nome}</SheetTitle>
          <SheetDescription>Detalhes do cliente</SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Contact info */}
          {(customer.telefone || customer.email) && (
            <div className="space-y-2">
              {customer.telefone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.telefone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Location */}
          {(customer.cidade || customer.estado) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {[customer.cidade, customer.estado].filter(Boolean).join(' — ')}
              </span>
            </div>
          )}

          {/* Tags */}
          {customer.tags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Observations */}
          {customer.observacoes && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Observações
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {customer.observacoes}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p>Criado em {fmtDateTime.format(new Date(customer.criado_em))}</p>
            <p>Atualizado em {fmtDateTime.format(new Date(customer.atualizado_em))}</p>
          </div>

          <Separator />

          {/* Actions */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onEdit(customer);
              onOpenChange(false);
            }}
          >
            <Pencil className="h-4 w-4" />
            Editar cliente
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
