// src/routes/events.routes.js
const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const EventsController = require("../controllers/events.controller");

router.get("/",          verificarToken, EventsController.list);
router.post("/",         verificarToken, EventsController.create);
router.get("/:id",       verificarToken, EventsController.findById);
router.get("/:id/sales", verificarToken, EventsController.getSales);
router.patch("/:id/concluir", verificarToken, EventsController.concluir);
router.patch("/:id/reabrir",  verificarToken, EventsController.reabrir);
router.delete("/:id",    verificarToken, EventsController.deleteEvent);

module.exports = router;
