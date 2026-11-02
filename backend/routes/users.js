const express = require("express");
const controller = require("../controllers/userController");
const router = express.Router();

router.put("/users/:userId/settings", controller.updateSettings);

module.exports = router;
