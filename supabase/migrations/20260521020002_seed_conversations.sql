-- Seeds Onda 3: 5 conversas demo com mensagens
do $$
declare
  v_joao_id  uuid := '00000000-0000-0000-0000-000000000002';
  v_maria_id uuid := '00000000-0000-0000-0000-000000000003';
  v_dist_sul uuid := '20000000-0000-0000-0000-000000000001';
  v_comercio uuid := '20000000-0000-0000-0000-000000000002';
  v_bom_preco uuid := '20000000-0000-0000-0000-000000000003';
  v_atacado uuid := '20000000-0000-0000-0000-000000000004';
  v_mercearia uuid := '20000000-0000-0000-0000-000000000005';
  v_conv1 uuid := '30000000-0000-0000-0000-000000000001';
  v_conv2 uuid := '30000000-0000-0000-0000-000000000002';
  v_conv3 uuid := '30000000-0000-0000-0000-000000000003';
  v_conv4 uuid := '30000000-0000-0000-0000-000000000004';
  v_conv5 uuid := '30000000-0000-0000-0000-000000000005';
begin
  insert into poxpur.conversations (id, customer_id, customer_phone, customer_nome_snapshot, canal, status, assigned_to)
  values
    (v_conv1, v_dist_sul,   '+5551999111001', 'Distribuidora Sul Ltda', 'whatsapp', 'aberta', v_joao_id),
    (v_conv2, v_comercio,   '+5511988222002', 'Comércio Paulista ME', 'whatsapp', 'aberta', v_maria_id),
    (v_conv3, v_bom_preco,  '+5531977333003', 'Supermercado Bom Preço', 'whatsapp', 'aberta', null),
    (v_conv4, v_atacado,    '+5562966444004', 'Atacado Central', 'whatsapp', 'aberta', v_joao_id),
    (v_conv5, v_mercearia,  '+5547955555005', 'Mercearia da Vila', 'whatsapp', 'arquivada', v_maria_id)
  on conflict (id) do nothing;

  insert into poxpur.messages (conversation_id, sender_type, sender_id, tipo, conteudo, lida, criado_em)
  values
    (v_conv1, 'cliente', null, 'texto', 'Oi João! Tudo bem? Preciso fazer um pedido grande pra semana que vem.', true, now() - interval '2 hours'),
    (v_conv1, 'vendedor', v_joao_id, 'texto', 'Oi! Tudo ótimo, obrigado. Pode mandar o que precisa que já preparo a cotação.', true, now() - interval '1 hour 50 minutes'),
    (v_conv1, 'cliente', null, 'texto', '30 caixas do produto A, 15 caixas do produto B. Mesma forma de pagamento de sempre (boleto 30 dias).', true, now() - interval '1 hour 45 minutes'),
    (v_conv1, 'vendedor', v_joao_id, 'texto', 'Perfeito! Vou preparar o pedido agora e te mando o resumo.', false, now() - interval '5 minutes'),
    (v_conv1, 'cliente', null, 'texto', 'Beleza, aguardo!', false, now() - interval '2 minutes'),

    (v_conv2, 'cliente', null, 'texto', 'Boa tarde! Vocês fazem entrega em SP capital?', true, now() - interval '1 day'),
    (v_conv2, 'vendedor', v_maria_id, 'texto', 'Boa tarde! Sim, fazemos entrega em toda a região. Posso te ajudar com algum pedido?', true, now() - interval '1 day' + interval '5 minutes'),
    (v_conv2, 'cliente', null, 'texto', 'Quero começar com um pack promocional pra testar.', true, now() - interval '20 hours'),
    (v_conv2, 'vendedor', v_maria_id, 'texto', 'Ótima escolha! O Pack Promocional 6un custa R$ 120, com frete grátis acima de R$ 200. Quer que eu já gere o pedido?', true, now() - interval '19 hours 55 minutes'),
    (v_conv2, 'cliente', null, 'texto', 'Vou pegar 2 packs então.', false, now() - interval '15 minutes'),

    (v_conv3, 'cliente', null, 'texto', 'Olá, vi vocês na feira. Quero saber sobre revenda no atacado.', false, now() - interval '30 minutes'),

    (v_conv4, 'vendedor', v_joao_id, 'texto', 'Bom dia! Aquele pedido seu já foi aprovado e está sendo separado pra entrega.', true, now() - interval '3 hours'),
    (v_conv4, 'cliente', null, 'texto', 'Massa! Já liberei o pagamento por aqui. Obrigado pela agilidade.', true, now() - interval '2 hours 50 minutes'),

    (v_conv5, 'cliente', null, 'texto', 'Oi, pedido chegou certinho. Obrigada!', true, now() - interval '7 days'),
    (v_conv5, 'vendedor', v_maria_id, 'texto', 'Que bom! Qualquer coisa que precisar, é só chamar.', true, now() - interval '7 days' + interval '5 minutes')
  on conflict do nothing;
end $$;
