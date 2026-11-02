const userService = require("../services/userService");
const { handleControllerError } = require("../utils/http");

async function updateSettings(req, res) {
  try {
    const user = await userService.updateSettings(req.params.userId, req.body || {});
    return res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    return handleControllerError(res, error, "Could not update user settings.", "Update settings error");
  }
}

module.exports = { updateSettings };
