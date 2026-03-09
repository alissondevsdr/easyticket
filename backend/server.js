// backend/server.js
const express = require("express")
const bodyParser = require("body-parser")
const cors = require('cors')
const path = require('path')

// Carrega .env apenas em desenvolvimento
if (!process.env.DATABASE_URL) {
  require("dotenv").config({ path: path.join(__dirname, '.env') })
}

const app = express()

app.use(bodyParser.json({ limit: '50mb' }))
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// ─── Health check — usado pelo Electron para saber se o backend está pronto ───
app.get('/health', (req, res) => res.json({ ok: true }))

app.use("/login",     require("./src/routes/login.routes"))
app.use("/users",     require("./src/routes/users.routes"))
app.use("/clients",   require("./src/routes/clients.routes"))
app.use("/sales",     require("./src/routes/sales.routes"))
app.use("/campaigns", require("./src/routes/campaigns.routes"))
app.use("/whatsapp",  require("./src/routes/whatsapp.routes"))
app.use("/events",    require("./src/routes/events.routes"))

// Auto-start WhatsApp
const whatsappService = require('./src/services/whatsapp.service')
whatsappService.initialize().catch(err =>
  console.error("Erro no autostart do WhatsApp:", err)
)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
