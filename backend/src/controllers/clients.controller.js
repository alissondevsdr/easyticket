const prisma = require("../config/prisma");

module.exports = {
  //CRIAR USUÁRIO
  async createClient(req, res) {
    const { client, cpf, phone, type } = req.body;

    if (!client || !cpf || !phone) {
      return res.status(400).json({ mensagem: "Nome, CPF e Telefone são obrigatórios." });
    }

    try {
      const novoCliente = await prisma.client.create({
        data: {
          client,
          cpf,
          phone,
          type: type || "geral",
        }
      });

      res.status(201).json({ mensagem: "Cliente cadastrado com sucesso!", cliente: novoCliente });

    } catch (error) {
      if (error.code === 'P2002' && error.meta.target.includes('cpf')) {
        return res.status(409).json({ erro: "Erro ao cadastrar. O CPF informado já está em uso." });
      }

      console.error("Erro ao cadastrar cliente:", error);
      res.status(500).json({ erro: "Erro interno do servidor ao tentar cadastrar o cliente." });
    }
  },
  //LISTAR USUÁRIOS
  async listClients(req, res) {
    const { startDate, endDate } = req.query;
    try {
      const where = {};
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

      const clients = await prisma.client.findMany({ where })
      res.json(clients)
    } catch (error) {
      console.error("Erro ao listar clientes:", error)
      res.status(500).json({ erro: "Erro ao buscar clientes." })
    }
  },
  //ACHAR UM USUÁRIO
  async findUniqueClient(req, res) {
    const { id } = req.params;
    try {
      const client = await prisma.client.findUnique({
        where: { id: Number(id) },
      });

      if (!client) {
        return res.status(404).json({ erro: "Cliente não encontrado." });
      }

      res.json(client);
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
        return res.status(404).json({ erro: "Cliente não encontrado." });
      }
      res.status(500).json({ erro: "Erro interno do servidor ao buscar o cliente." });
    }
  },
  //ALTERAR USUÁRIO
  async updateClient(req, res) {
    const { id } = req.params;
    const { client, cpf, phone, type } = req.body;

    if (Number(id) === 1) {
      return res.status(403).json({ erro: "O Cliente Padrão não pode ser alterado." });
    }

    if (!client && !cpf && !phone && !type) {
      return res.status(400).json({ mensagem: "Nenhum dado de alteração fornecido." });
    }
    if (!client || !cpf || !phone) {
      return res.status(400).json({ mensagem: "Nome, CPF e Telefone são obrigatórios e não podem ser vazios." });
    }

    try {
      const clienteAtualizado = await prisma.client.update({
        where: { id: Number(id) },
        data: {
          client,
          cpf,
          phone,
          ...(type && { type }),
        },
      });

      res.json({ mensagem: "Cliente alterado com sucesso!", cliente: clienteAtualizado });

    } catch (error) {

      if (error.code === 'P2025') {
        return res.status(404).json({ erro: "Cliente não encontrado para alteração." });
      }
      if (error.code === 'P2002' && error.meta.target.includes('cpf')) {
        return res.status(409).json({ erro: "Erro ao alterar. O CPF informado já está em uso por outro cliente." });
      }

      console.error("Erro ao alterar cliente:", error);
      res.status(500).json({ erro: "Erro interno do servidor ao tentar alterar o cliente." });
    }
  },
  //DELETAR USUÁRIO
  async deleteClient(req, res) {
    const { id } = req.params;

    if (Number(id) === 1) {
      return res.status(403).json({ erro: "O Cliente Padrão não pode ser excluído." });
    }

    try {
      const client = await prisma.client.findUnique({
        where: { id: Number(id) },
      });

      if (!client) {
        return res.status(404).json({ erro: "Cliente não encontrado." });
      }

      await prisma.client.delete({
        where: { id: Number(id) },
      });

      res.json({ mensagem: "Cliente deletado com sucesso!" });

    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      res.status(500).json({ erro: "Erro interno do servidor ao tentar deletar o cliente." });
    }
  }
}
