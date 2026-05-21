import { SettingsTabs } from '@/components/settings/SettingsTabs';

export default function Settings() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-poxpur-navy">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gestão do sistema Poxpur</p>
      </div>

      {/* Tabs */}
      <SettingsTabs />
    </div>
  );
}
