-- Seeds Onda 2: catálogo + clientes demo
insert into poxpur.products (id, sku, nome, descricao, preco, estoque, categoria, ativo)
values
  ('10000000-0000-0000-0000-000000000001', 'POX-001', 'Caixa de Produto A 12un', 'Caixa com 12 unidades do produto A', 240.00, 50, 'Caixas', true),
  ('10000000-0000-0000-0000-000000000002', 'POX-002', 'Caixa de Produto B 24un', 'Caixa com 24 unidades do produto B', 380.00, 25, 'Caixas', true),
  ('10000000-0000-0000-0000-000000000003', 'POX-003', 'Pack Promocional 6un', 'Pack promocional com 6 unidades sortidas', 120.00, 100, 'Packs', true),
  ('10000000-0000-0000-0000-000000000004', 'POX-004', 'Produto Premium', 'Produto premium unitário', 85.00, 200, 'Avulsos', true),
  ('10000000-0000-0000-0000-000000000005', 'POX-005', 'Produto Esgotado (demo)', 'Sem estoque para demonstrar fluxo aguardando_fabrica', 150.00, 0, 'Avulsos', true)
on conflict (id) do nothing;

insert into poxpur.customers (id, nome, telefone, email, cidade, estado, tags, observacoes, criado_por)
values
  ('20000000-0000-0000-0000-000000000001', 'Distribuidora Sul Ltda', '+5551999111001', 'contato@distsul.com.br', 'Porto Alegre', 'RS', array['VIP','frequente'], 'Cliente desde 2024', '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000002', 'Comércio Paulista ME', '+5511988222002', 'compras@paulista.com.br', 'São Paulo', 'SP', array['novo'], null, '00000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000003', 'Supermercado Bom Preço', '+5531977333003', 'gerencia@bompreco.com.br', 'Belo Horizonte', 'MG', array['atacado'], 'Compra mensal grande', '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000004', 'Atacado Central', '+5562966444004', 'admin@atacadocentral.com.br', 'Goiânia', 'GO', array['atacado','VIP'], 'Pedidos quinzenais', '00000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000005', 'Mercearia da Vila', '+5547955555005', null, 'Blumenau', 'SC', array['novo'], 'Indicação Atacado Central', '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;
