const express = require("express");
const router = express.Router();
const verificarToken = require('../middlewares/auth.middleware');
const campaignsController = require('../controllers/campaigns.controller');

// CRUD Campanhas
router.get("/", verificarToken, campaignsController.getCampaigns);
router.post("/", verificarToken, campaignsController.createCampaign);
router.put("/:id", verificarToken, campaignsController.updateCampaign);

// Ações
router.post("/:id/send", verificarToken, campaignsController.sendCampaign);

// Logs
router.get("/:id/logs", verificarToken, campaignsController.getCampaignLogs);

// Excluir
router.delete("/:id", verificarToken, campaignsController.deleteCampaign);

module.exports = router;
