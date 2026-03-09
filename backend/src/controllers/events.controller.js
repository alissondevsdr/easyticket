const prisma = require("../config/prisma");

module.exports = {

  // ─── LISTAR EVENTOS ────────────────────────────────────────────────────────
  // GET /events?status=ATIVO  (ou CONCLUIDO, ou sem filtro para todos)
  async list(req, res) {
    const { status } = req.query;
    try {
      const where = status ? { status } : {};
      const events = await prisma.event.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { sales: { where: { status: { not: "CANCELADA" } } } } },
        },
      });

      // Adiciona campo "soldCount" calculado e progresso
      const result = events.map(ev => ({
        ...ev,
        soldCount: ev._count.sales,
      }));

      res.json(result);
    } catch (error) {
      console.error("Erro ao listar eventos:", error);
      res.status(500).json({ erro: "Erro ao listar eventos." });
    }
  },

  // ─── CRIAR EVENTO ──────────────────────────────────────────────────────────
  // POST /events
  async create(req, res) {
    const { name, description, location, date, capacity } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ erro: "O nome do evento é obrigatório." });
    }

    try {
      const event = await prisma.event.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          location: location?.trim() || null,
          date: date ? new Date(date) : null,
          capacity: capacity ? parseInt(capacity) : null,
          status: "ATIVO",
        },
      });
      res.status(201).json(event);
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      res.status(500).json({ erro: "Erro ao criar evento." });
    }
  },

  // ─── BUSCAR EVENTO POR ID ──────────────────────────────────────────────────
  // GET /events/:id
  async findById(req, res) {
    const { id } = req.params;
    try {
      const event = await prisma.event.findUnique({
        where: { id: Number(id) },
        include: {
          _count: { select: { sales: { where: { status: { not: "CANCELADA" } } } } },
        },
      });
      if (!event) return res.status(404).json({ erro: "Evento não encontrado." });
      res.json({ ...event, soldCount: event._count.sales });
    } catch (error) {
      console.error("Erro ao buscar evento:", error);
      res.status(500).json({ erro: "Erro ao buscar evento." });
    }
  },

  // ─── CONCLUIR EVENTO ────────────────────────────────────────────────────────
  // PATCH /events/:id/concluir
  async concluir(req, res) {
    const { id } = req.params;
    try {
      const event = await prisma.event.findUnique({ where: { id: Number(id) } });
      if (!event) return res.status(404).json({ erro: "Evento não encontrado." });
      if (event.status === "CONCLUIDO") {
        return res.status(400).json({ erro: "Evento já está concluído." });
      }

      const updated = await prisma.event.update({
        where: { id: Number(id) },
        data: { status: "CONCLUIDO" },
      });

      res.json({ mensagem: "Evento concluído com sucesso!", event: updated });
    } catch (error) {
      console.error("Erro ao concluir evento:", error);
      res.status(500).json({ erro: "Erro ao concluir evento." });
    }
  },

  // ─── REABRIR EVENTO ─────────────────────────────────────────────────────────
  // PATCH /events/:id/reabrir
  async reabrir(req, res) {
    const { id } = req.params;
    try {
      const event = await prisma.event.findUnique({ where: { id: Number(id) } });
      if (!event) return res.status(404).json({ erro: "Evento não encontrado." });

      const updated = await prisma.event.update({
        where: { id: Number(id) },
        data: { status: "ATIVO" },
      });

      res.json({ mensagem: "Evento reaberto com sucesso!", event: updated });
    } catch (error) {
      console.error("Erro ao reabrir evento:", error);
      res.status(500).json({ erro: "Erro ao reabrir evento." });
    }
  },

  // ─── HISTÓRICO DE VENDAS DO EVENTO ─────────────────────────────────────────
  // GET /events/:id/sales
  async getSales(req, res) {
    const { id } = req.params;
    try {
      const event = await prisma.event.findUnique({ where: { id: Number(id) } });
      if (!event) return res.status(404).json({ erro: "Evento não encontrado." });

      const sales = await prisma.sale.findMany({
        where: { eventId: Number(id) },
        include: { client: { select: { id: true, client: true, cpf: true, type: true } } },
        orderBy: { createdAt: "desc" },
      });

      // ─── KPIs do evento ────────────────────────────────────────────────────
      const activeSales = sales.filter(s => s.status !== "CANCELADA");
      const totalRevenue = activeSales.reduce((acc, s) => acc + s.value, 0);
      const totalSales = activeSales.length;
      const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Forma de pagamento mais usada
      const paymentCounts = activeSales.reduce((acc, s) => {
        acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + 1;
        return acc;
      }, {});
      const topPayment = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Clientes únicos
      const uniqueClients = new Set(activeSales.map(s => s.clientId)).size;

      res.json({
        event,
        sales,
        kpis: {
          totalRevenue: totalRevenue.toFixed(2),
          totalSales,
          avgTicket: avgTicket.toFixed(2),
          topPayment,
          uniqueClients,
          soldCount: activeSales.length,
          capacity: event.capacity,
          occupancyPct: event.capacity
            ? Math.min(100, Math.round((activeSales.length / event.capacity) * 100))
            : null,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar vendas do evento:", error);
      res.status(500).json({ erro: "Erro ao buscar vendas do evento." });
    }
  },

  // ─── DELETAR EVENTO ─────────────────────────────────────────────────────────
  // DELETE /events/:id  (só permite se não tiver vendas vinculadas)
  async deleteEvent(req, res) {
    const { id } = req.params;
    try {
      const event = await prisma.event.findUnique({
        where: { id: Number(id) },
        include: { _count: { select: { sales: true } } },
      });
      if (!event) return res.status(404).json({ erro: "Evento não encontrado." });

      if (event._count.sales > 0) {
        return res.status(400).json({
          erro: "Não é possível excluir um evento com vendas vinculadas. Conclua o evento em vez disso.",
        });
      }

      await prisma.event.delete({ where: { id: Number(id) } });
      res.json({ mensagem: "Evento excluído com sucesso!" });
    } catch (error) {
      console.error("Erro ao deletar evento:", error);
      res.status(500).json({ erro: "Erro ao deletar evento." });
    }
  },
};
