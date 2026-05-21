import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCreateChannel } from '@/hooks/useTeamChat';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(40, 'Nome muito longo')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

type NewChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function NewChannelDialog({ open, onOpenChange }: NewChannelDialogProps) {
  const createChannel = useCreateChannel();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '' },
  });

  const onSubmit = async (values: FormValues) => {
    await createChannel.mutateAsync({ nome: values.nome });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo canal</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do canal</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-sm">#</span>
                      <Input
                        placeholder="novo-canal"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createChannel.isPending}
                className="bg-poxpur-green hover:bg-poxpur-green-dark text-white"
              >
                {createChannel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar canal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
