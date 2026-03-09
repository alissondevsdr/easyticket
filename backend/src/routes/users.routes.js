const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const UsersController = require("../controllers/users.controller");

router.post("/", verificarToken, UsersController.register);
router.get("/", verificarToken, UsersController.listUsers);
router.get("/:id", verificarToken, UsersController.findUniqueUser);
router.put("/:id", verificarToken, UsersController.updateUser);
router.delete("/:id", verificarToken, UsersController.deleteUser);

module.exports = router;