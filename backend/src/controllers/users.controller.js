const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs")

module.exports = {
  //REGISTRAR USUÁRIO
  async register(req, res) {
    const { email, password } = req.body;

    const senhaHash = bcrypt.hashSync(password, 8);

    try {
      const novoUsuario = await prisma.user.create({
        data: { email, password: senhaHash }
      });

      res.json({ mensagem: "Usuário criado com sucesso!", usuario: novoUsuario });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ erro: "Erro ao cadastrar. O email já está em uso." });
      }
      res.status(500).json({ erro: "Erro interno ao tentar cadastrar o usuário." });
    }
  },
  //LISTAR USUÁRIOS
  async listUsers(req, res) {
    const usuarios = await prisma.user.findMany();
    res.json(usuarios);
  },
  //ACHAR UM USUÁRIO
  async findUniqueUser(req, res) {
    const { id } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
      });

      if (!user) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
      }

      res.json(user);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error)
      if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
        return res.status(404).json({ erro: "Usuário não encontrado." });
      }
      res.status(500).json({ erro: "Erro interno do servidor ao buscar o usuário." })
    }
  },
  //ALTERAR USUÁRIO
  async updateUser(req, res) {
    const { id } = req.params;
    const { email, password } = req.body;

    try {
      const usuarioAtualizado = await prisma.user.update({
        where: { id },
        data: { email, password }
      });

      res.json({ mensagem: "Usuário atualizado com sucesso!", usuario: usuarioAtualizado });
    } catch (error) {
      res.status(500).json({ erro: "Erro interno ao tentar atualizar o usuário." });
    }
  },
  //DELETAR USUÁRIO
  async deleteUser(req, res) {
    const { id } = req.params;

    try {
      const usuario = await prisma.user.findUnique({
        where: { id },
      });

      if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
      }

      await prisma.user.delete({
        where: { id },
      });

      res.json({ mensagem: "Usuário deletado com sucesso!" });
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      res.status(500).json({ erro: "Erro interno ao tentar deletar o usuário." });
    }
  }
}
