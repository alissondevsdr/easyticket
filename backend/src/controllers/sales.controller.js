const prisma = require("../config/prisma");

module.exports = {

  // ─── CRIAR VENDA ────────────────────────────────────────────────────────────
  async create(req, res) {
    const { value, paymentMethod, clientId, eventId } = req.body;

    if (!value || !paymentMethod || !clientId) {
      return res.status(400).json({ mensagem: "Valor, método de pagamento e cliente são obrigatórios." });
    }

    if (isNaN(value) || Number(value) <= 0) {
      return res.status(400).json({ mensagem: "Valor inválido." });
    }

    try {
      const client = await prisma.client.findUnique({
        where: { id: Number(clientId) }
      });

      if (!client) {
        return res.status(404).json({ mensagem: "Cliente não encontrado." });
      }

      const novaVenda = await prisma.sale.create({
        data: {
          value: Number(value),
          paymentMethod,
          clientId: Number(clientId),
          eventId: eventId ? Number(eventId) : null,
        },
        include: {
          client: true
        }
      });

      res.status(201).json({ mensagem: "Venda realizada com sucesso!", venda: novaVenda });

    } catch (error) {
      console.error("Erro ao criar venda:", error);
      res.status(500).json({ erro: "Erro interno ao tentar registrar a venda." });
    }
  },

  // ─── LISTAR VENDAS ──────────────────────────────────────────────────────────
  async list(req, res) {
    const { startDate, endDate } = req.query;

    try {
      const where = { NOT: { status: "CANCELADA" } };
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate + "T00:00:00"),
          lte: new Date(endDate + "T23:59:59")
        };
      } else if (startDate) {
        where.createdAt = { gte: new Date(startDate + "T00:00:00") };
      } else if (endDate) {
        where.createdAt = { lte: new Date(endDate + "T23:59:59") };
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          client: {
            select: { id: true, client: true, cpf: true }
          },
          event: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      res.json(sales);
    } catch (error) {
      console.error("Erro ao listar vendas:", error);
      res.status(500).json({ erro: "Erro ao buscar vendas." });
    }
  },

  // ─── MÉTRICAS DO DASHBOARD ──────────────────────────────────────────────────
  async metrics(req, res) {
    const { startDate, endDate } = req.query;

    try {
      const now = new Date();
      // Início do mês atual (local)
      let start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      // Fim do mês atual (local)
      let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      if (startDate && endDate) {
        start = new Date(startDate + "T00:00:00");
        end = new Date(endDate + "T23:59:59");
      }

      const where = {
        NOT: { status: "CANCELADA" },
        createdAt: {
          gte: start,
          lte: end
        }
      };

      const [totalResult, countResult, topEventsResult] = await Promise.all([
        prisma.sale.aggregate({
          _sum: { value: true },
          where
        }),
        prisma.sale.count({
          where
        }),
        prisma.sale.groupBy({
          by: ['eventId'],
          _sum: { value: true },
          where: { ...where, eventId: { not: null } },
          orderBy: { _sum: { value: 'desc' } },
          take: 5
        })
      ]);

      const topEvents = await Promise.all(topEventsResult.map(async (item) => {
        const event = await prisma.event.findUnique({
          where: { id: item.eventId },
          select: { name: true }
        });
        return {
          id: item.eventId,
          name: event ? event.name : "Evento Desconhecido",
          value: item._sum.value || 0
        };
      }));

      const totalRevenue = totalResult._sum.value || 0;
      const totalSales = countResult;
      const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      res.json({
        totalRevenue: totalRevenue.toFixed(2),
        totalSales,
        avgTicket: avgTicket.toFixed(2),
        topEvents
      });
    } catch (error) {
      console.error("Erro ao buscar métricas:", error);
      res.status(500).json({ erro: "Erro ao buscar métricas." });
    }
  },

  // ─── DELETAR VENDA ──────────────────────────────────────────────────────────
  async deleteSale(req, res) {
    const { id } = req.params;

    try {
      const sale = await prisma.sale.findUnique({
        where: { id: Number(id) }
      });

      if (!sale) {
        return res.status(404).json({ erro: "Venda não encontrada." });
      }

      await prisma.sale.delete({
        where: { id: Number(id) }
      });

      res.json({ mensagem: "Venda deletada com sucesso!" });

    } catch (error) {
      console.error("Erro ao deletar venda:", error);
      res.status(500).json({ erro: "Erro interno ao tentar deletar a venda." });
    }
  },

  // ─── CANCELAR VENDA ─────────────────────────────────────────────────────────
  async cancelSale(req, res) {
    const { id } = req.params;

    try {
      const sale = await prisma.sale.findUnique({
        where: { id: Number(id) }
      });

      if (!sale) {
        return res.status(404).json({ mensagem: "Venda não encontrada." });
      }

      if (sale.status === "CANCELADA") {
        return res.status(400).json({ mensagem: "Esta venda já está cancelada." });
      }

      const vendaCancelada = await prisma.sale.update({
        where: { id: Number(id) },
        data: { status: "CANCELADA" }
      });

      res.json({ mensagem: "Venda cancelada com sucesso!", venda: vendaCancelada });

    } catch (error) {
      console.error("Erro ao cancelar venda:", error);
      res.status(500).json({ erro: "Erro interno ao tentar cancelar a venda." });
    }
  }

};
