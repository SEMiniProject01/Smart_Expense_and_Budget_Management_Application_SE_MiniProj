const express = require("express");
const controller = require("../controllers/goalController");
const router = express.Router();

router.post("/goals", controller.createGoal);
router.get("/goals/:userId", controller.listGoals);
router.delete("/goals/:goalId", controller.deleteGoal);

module.exports = router;
