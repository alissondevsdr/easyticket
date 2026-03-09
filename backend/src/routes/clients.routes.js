const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const ClientsController = require("../controllers/clients.controller");

router.post("/", verificarToken, ClientsController.createClient);
router.get("/", verificarToken, ClientsController.listClients);
router.get("/:id", verificarToken, ClientsController.findUniqueClient);
router.put("/:id", verificarToken, ClientsController.updateClient);
router.delete("/:id", verificarToken, ClientsController.deleteClient);

module.exports = router;