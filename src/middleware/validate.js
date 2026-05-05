const { Types } = require("mongoose");
const AppError = require("../utils/AppError");

const validateTask = (req, res, next) => {
  const { title, priority } = req.body;
  const errors = [];

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    errors.push("Title is required and must be a non-empty string");
  }

  if (title && title.length > 200) {
    errors.push("Title must not exceed 200 characters");
  }

  if (req.body.description && typeof req.body.description !== "string") {
    errors.push("Description must be a string");
  }

  const validPriorities = ["low", "medium", "high"];
  if (priority && !validPriorities.includes(priority)) {
    errors.push(`Priority must be one of: ${validPriorities.join(", ")}`);
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

const validateTaskUpdate = (req, res, next) => {
  const { title, status, priority } = req.body;
  const errors = [];

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) {
      errors.push("Title must be a non-empty string");
    } else if (title.length > 200) {
      errors.push("Title must not exceed 200 characters");
    }
  }

  if (status !== undefined) {
    const validStatuses = ["pending", "in-progress", "completed"];
    if (!validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(", ")}`);
    }
  }

  if (priority !== undefined) {
    const validPriorities = ["low", "medium", "high"];
    if (!validPriorities.includes(priority)) {
      errors.push(`Priority must be one of: ${validPriorities.join(", ")}`);
    }
  }

  if (req.body.description !== undefined && typeof req.body.description !== "string") {
    errors.push("Description must be a string");
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

const validateId = (req, res, next) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError("Invalid task ID", 400));
  }

  next();
};

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push("Name is required");
  } else if (name.length > 100) {
    errors.push("Name must not exceed 100 characters");
  }

  if (!email || typeof email !== "string" || email.trim().length === 0) {
    errors.push("Email is required");
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.push("Please provide a valid email");
  }

  if (!password || typeof password !== "string") {
    errors.push("Password is required");
  } else if (password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== "string" || email.trim().length === 0) {
    errors.push("Email is required");
  }

  if (!password || typeof password !== "string") {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

module.exports = { validateTask, validateTaskUpdate, validateId, validateRegister, validateLogin };
