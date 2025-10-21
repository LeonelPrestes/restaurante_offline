const { runAsync, getAsync, allAsync } = require("../../core/services/dbHelper");

exports.criarPedidoDB = async ({ mesa, itens, observacoes }) => {
  await runAsync("BEGIN TRANSACTION");
  try {
    const result = await runAsync(
      `INSERT INTO pedidos (mesa, observacoes, status) VALUES (?, ?, 'pendente')`,
      [mesa, observacoes]
    );
    const pedidoId = result.lastID;

    for (const it of itens) {
      const nome = it.nome || "ITEM";
      const meia = it.meia ? 1 : 0;
      const quantidade = parseInt(it.quantidade || 1, 10);
      const observacao = it.observacao || "";
      const adicionar = Array.isArray(it.adicionar) ? it.adicionar : [];
      const retirar = Array.isArray(it.retirar) ? it.retirar : [];

      // 🔍 Busca o preço correto do item no banco (preco e preco_meia)
      const row = await getAsync(`
    SELECT ic.preco, ic.preco_meia
    FROM itens_cardapio ic
    JOIN itens i ON i.id = ic.item_id
    WHERE i.nome = ? 
    LIMIT 1;
  `, [nome]);

      let preco = 0;
      if (row) {
        preco = meia && row.preco_meia != null ? row.preco_meia : row.preco;
      } else {
        // fallback caso o item não esteja em itens_cardapio (usa preço vindo do front)
        preco = Number(it.preco || 0);
      }

      await runAsync(
        `INSERT INTO itens_pedido (pedido_id, nome, preco, quantidade, observacao, adicionar, retirar, meia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pedidoId,
          nome,
          preco,
          quantidade,
          observacao,
          JSON.stringify(adicionar),
          JSON.stringify(retirar),
          meia
        ]
      );
    }

    await runAsync("COMMIT");
    return await this.getPedidoCompleto(pedidoId);
  } catch (err) {
    await runAsync("ROLLBACK");
    throw err;
  }
};

exports.getPedidoCompleto = async (id) => {
  const pedido = await getAsync(`SELECT * FROM pedidos WHERE id = ?`, [id]);
  if (!pedido) return null;

  const itens = await allAsync(`
    SELECT 
      ip.id,
      ip.nome,
      ip.preco,
      ip.quantidade,
      ip.meia,
      ip.observacao,
      ip.adicionar,
      ip.retirar,
      c.nome AS categoria_nome
    FROM itens_pedido ip
    LEFT JOIN itens i ON i.nome = ip.nome
    LEFT JOIN categorias c ON c.id = i.categoria_id
    WHERE ip.pedido_id = ?
    ORDER BY ip.id
  `, [id]);

  const safeParseArray = (text) => {
    try {
      const v = JSON.parse(text || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };

  return {
    id: pedido.id,
    mesa: pedido.mesa,
    observacoes: pedido.observacoes || "",
    status: pedido.status,
    criado_em: pedido.criado_em,
    itens: itens.map((i) => ({
      id: i.id,
      nome: i.nome,
      preco: i.preco,
      quantidade: i.quantidade,
      meia: !!i.meia,
      observacao: i.observacao || "",
      adicionar: safeParseArray(i.adicionar),
      retirar: safeParseArray(i.retirar),
      categoria_nome: i.categoria_nome || "",
    })),
  };
};