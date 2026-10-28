const goalService = require("../services/goalService");
const { handleControllerError } = require("../utils/http");

async function createGoal(req, res) {
  try {
    const goal = await goalService.createGoal(req.body || {});
    return res.status(201).json({ goal: goal.toJSON() });
  } catch (error) {
    return handleControllerError(res, error, "Could not create savings goal.", "Create goal error");
  }
}

async function listGoals(req, res) {
  try {
    const goals = await goalService.listGoals(req.params.userId);
    return res.status(200).json({ goals: goals.map((goal) => goal.toJSON()) });
  } catch (error) {
    return handleControllerError(res, error, "Could not retrieve savings goals.", "List goals error");
  }
}

async function deleteGoal(req, res) {
  try {
    await goalService.deleteGoal(req.params.goalId);
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleControllerError(res, error, "Could not delete savings goal.", "Delete goal error");
  }
}

module.exports = { createGoal, listGoals, deleteGoal };
