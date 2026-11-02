const express = require("express");
const controller = require("../controllers/authController");
const router = express.Router();

router.post("/signup", controller.signUp);
router.post("/login", controller.logIn);

module.exports = router;
