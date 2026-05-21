import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  razao_social: z.string(),
  nome_fantasia: z.string(),
  cnpj: z.string(),
  inscricao_estadual: z.string(),
  endereco: z.string(),
  cidade: z.string(),
  estado: z.string().max(2, 'UF deve ter 2 caracteres').toUpperCase(),
  cep: z.string(),
  telefone: z.string(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  logo_url: z.string(),
  whatsapp_phone: z.string(),
  n8n_webhook_url: z.string(),
  recebe_resumo_diario: z.boolean(),
  hora_resumo_diario: z.string(),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export function CompanyProfileSection() {
  const { data: settings, isLoading } = useCompanySettings();
  const update = useUpdateCompanySettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      inscricao_estadual: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      email: '',
      logo_url: '',
      whatsapp_phone: '',
      n8n_webhook_url: '',
      recebe_resumo_diario: false,
      hora_resumo_diario: '',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        razao_social: settings.razao_social ?? '',
        nome_fantasia: settings.nome_fantasia ?? '',
        cnpj: settings.cnpj ?? '',
        inscricao_estadual: settings.inscricao_estadual ?? '',
        endereco: settings.endereco ?? '',
        cidade: settings.cidade ?? '',
        estado: settings.estado ?? '',
        cep: settings.cep ?? '',
        telefone: settings.telefone ?? '',
        email: settings.email ?? '',
        logo_url: settings.logo_url ?? '',
        whatsapp_phone: settings.whatsapp_phone ?? '',
        n8n_webhook_url: settings.n8n_webhook_url ?? '',
        recebe_resumo_diario: settings.recebe_resumo_diario ?? false,
        hora_resumo_diario: settings.hora_resumo_diario ?? '',
      });
    }
  }, [settings, form]);

  const onSubmit = async (values: FormValues) => {
    await update.mutateAsync({
      razao_social: values.razao_social || null,
      nome_fantasia: values.nome_fantasia || null,
      cnpj: values.cnpj || null,
      inscricao_estadual: values.inscricao_estadual || null,
      endereco: values.endereco || null,
      cidade: values.cidade || null,
      estado: values.estado || null,
      cep: values.cep || null,
      telefone: values.telefone || null,
      email: values.email || null,
      logo_url: values.logo_url || null,
      whatsapp_phone: values.whatsapp_phone || null,
      n8n_webhook_url: values.n8n_webhook_url || null,
      recebe_resumo_diario: values.recebe_resumo_diario,
      hora_resumo_diario: values.hora_resumo_diario || null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificação */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Identificação
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="razao_social"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Poxpur Tintas LTDA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nome_fantasia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Fantasia</FormLabel>
                  <FormControl>
                    <Input placeholder="Poxpur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input placeholder="00.000.000/0001-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inscricao_estadual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inscrição Estadual</FormLabel>
                  <FormControl>
                    <Input placeholder="123.456.789.000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Endereço */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Endereço
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua das Flores, 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="São Paulo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input placeholder="SP" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input placeholder="00000-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Contato */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Contato
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contato@poxpur.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>URL do Logo</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Integrações */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Integrações
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="whatsapp_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+5511999999999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* WhatsApp token (read-only badge) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Token WhatsApp</span>
              <div className="flex h-10 items-center">
                {settings?.whatsapp_token_configured ? (
                  <Badge className="border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Não configurado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Definido via variável de ambiente — não editável aqui
              </p>
            </div>

            <FormField
              control={form.control}
              name="n8n_webhook_url"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>n8n Webhook URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://n8n.exemplo.com/webhook/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Resumo diário */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Resumo Diário
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="recebe_resumo_diario"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                  <div>
                    <FormLabel className="text-sm font-medium">Receber resumo diário</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Enviar resumo de vendas por WhatsApp
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hora_resumo_diario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora do resumo</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={update.isPending}
            className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
          >
            {update.isPending ? 'Salvando...' : 'Salvar configurações'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (settings) {
                form.reset({
                  razao_social: settings.razao_social ?? '',
                  nome_fantasia: settings.nome_fantasia ?? '',
                  cnpj: settings.cnpj ?? '',
                  inscricao_estadual: settings.inscricao_estadual ?? '',
                  endereco: settings.endereco ?? '',
                  cidade: settings.cidade ?? '',
                  estado: settings.estado ?? '',
                  cep: settings.cep ?? '',
                  telefone: settings.telefone ?? '',
                  email: settings.email ?? '',
                  logo_url: settings.logo_url ?? '',
                  whatsapp_phone: settings.whatsapp_phone ?? '',
                  n8n_webhook_url: settings.n8n_webhook_url ?? '',
                  recebe_resumo_diario: settings.recebe_resumo_diario ?? false,
                  hora_resumo_diario: settings.hora_resumo_diario ?? '',
                });
              }
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
