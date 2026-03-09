const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const SalesController = require("../controllers/sales.controller");

router.post("/", verificarToken, SalesController.create);
router.get("/metrics", verificarToken, SalesController.metrics);
router.get("/", verificarToken, SalesController.list);
router.put("/:id/cancel", verificarToken, SalesController.cancelSale);
router.delete("/:id", verificarToken, SalesController.deleteSale);

module.exports = router;
