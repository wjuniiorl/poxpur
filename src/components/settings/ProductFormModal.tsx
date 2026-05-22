import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from '@/components/ui/switch';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import type { PoxpurProduct } from '@/types/database';

// ─── Schema ──────────────────────────────────────────────────────────────────
// Keep all fields as strings in the form; parse numbers manually on submit.

const productSchema = z.object({
  sku: z.string().min(1, 'SKU é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string(),
  preco: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
    message: 'Preço deve ser ≥ 0',
  }),
  estoque: z.string().refine(
    (v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 0 && Number.isInteger(n);
    },
    { message: 'Estoque deve ser inteiro ≥ 0' },
  ),
  categoria: z.string(),
  foto_url: z.string(),
  ativo: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

type ProductFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: PoxpurProduct | null;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductFormModal({ open, onOpenChange, product }: ProductFormModalProps) {
  const isEdit = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      nome: '',
      descricao: '',
      preco: '0',
      estoque: '0',
      categoria: '',
      foto_url: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        sku: product.sku,
        nome: product.nome,
        descricao: product.descricao ?? '',
        preco: String(product.preco),
        estoque: String(product.estoque),
        categoria: product.categoria ?? '',
        foto_url: product.foto_url ?? '',
        ativo: product.ativo,
      });
    } else {
      form.reset({
        sku: '',
        nome: '',
        descricao: '',
        preco: '0',
        estoque: '0',
        categoria: '',
        foto_url: '',
        ativo: true,
      });
    }
  }, [product, form]);

  const isPending = createProduct.isPending || updateProduct.isPending;

  const onSubmit = async (values: ProductFormValues) => {
    const payload = {
      sku: values.sku,
      nome: values.nome,
      descricao: values.descricao || null,
      preco: parseFloat(values.preco),
      estoque: parseInt(values.estoque, 10),
      categoria: values.categoria || null,
      foto_url: values.foto_url || null,
      ativo: values.ativo,
    };

    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({ id: product.id, patch: payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      // Handle unique constraint violation for SKU
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('duplicate') || message.includes('unique')) {
        form.setError('sku', { message: 'Este SKU já está em uso' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit
              ? 'Edite os dados do produto selecionado.'
              : 'Preencha os dados para cadastrar um novo produto no catálogo.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input placeholder="POX-001" className="uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tintas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Descrição detalhada do produto"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estoque"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="foto_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da foto</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Produto ativo</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Produtos inativos não aparecem no catálogo
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
              >
                {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar produto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
