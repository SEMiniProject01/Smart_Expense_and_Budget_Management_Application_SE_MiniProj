const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { AppError } = require("../utils/http");

async function signUp({ name, email, password }) {
  if (typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password) {
    throw new AppError(400, "Name, email, and password are required.");
  }
  if (password.length < 6) {
    throw new AppError(400, "Password must be at least 6 characters long.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(409, "An account with this email already exists.");
  }

  const password_hash = await bcrypt.hash(password, 10);
  return User.create({ name: name.trim(), email: normalizedEmail, password_hash });
}

async function logIn({ email, password }) {
  if (typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password) {
    throw new AppError(401, "Invalid email or password.");
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) throw new AppError(401, "Invalid email or password.");

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) throw new AppError(401, "Invalid email or password.");
  return user;
}

module.exports = { signUp, logIn };
