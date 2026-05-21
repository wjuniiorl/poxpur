import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { PoxpurCompanySettings, PoxpurCompanySettingsInsert } from '@/types/database';

// ─── Fetch ────────────────────────────────────────────────────────────────────

export function useCompanySettings() {
  return useQuery<PoxpurCompanySettings | null>({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('singleton', true)
        .single();
      if (error) {
        // If no row exists yet, return null gracefully
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as PoxpurCompanySettings;
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateCompanySettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<PoxpurCompanySettingsInsert>) => {
      const { data, error } = await supabase
        .from('company_settings')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(patch as any)
        .eq('singleton', true)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PoxpurCompanySettings;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Configurações salvas');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });
}
