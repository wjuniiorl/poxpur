import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CompanyProfileSection } from './CompanyProfileSection';
import { ProductsCatalogSection } from './ProductsCatalogSection';
import { UsersSection } from './UsersSection';
import { AuditLogSection } from './AuditLogSection';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { value: 'empresa', label: 'Empresa' },
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'usuarios', label: 'Usuários' },
  { value: 'auditoria', label: 'Auditoria' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

function isValidTab(v: string | null): v is TabValue {
  return TABS.some((t) => t.value === v);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SettingsTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: TabValue = isValidTab(rawTab) ? rawTab : 'empresa';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="empresa">
        <CompanyProfileSection />
      </TabsContent>

      <TabsContent value="catalogo">
        <ProductsCatalogSection />
      </TabsContent>

      <TabsContent value="usuarios">
        <UsersSection />
      </TabsContent>

      <TabsContent value="auditoria">
        <AuditLogSection />
      </TabsContent>
    </Tabs>
  );
}
