const authService = require("../services/authService");
const { handleControllerError } = require("../utils/http");

async function signUp(req, res) {
  try {
    const user = await authService.signUp(req.body || {});
    return res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    return handleControllerError(res, error, "Could not create account.", "Signup error");
  }
}

async function logIn(req, res) {
  try {
    const user = await authService.logIn(req.body || {});
    return res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    return handleControllerError(res, error, "Could not log in.", "Login error");
  }
}

module.exports = { signUp, logIn };
