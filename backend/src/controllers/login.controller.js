const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY

module.exports = {
  //LOGIN
  async login(req, res) {
    const { email, password } = req.body;

    const usuario = await prisma.user.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    const senhaCorreta = bcrypt.compareSync(password, usuario.password);
    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: "Senha incorreta" });
    }

    const token = jwt.sign({ email: usuario.email }, SECRET_KEY, { expiresIn: "1h" });

    res.json({ mensagem: "Login realizado com sucesso!", token });
  }
}