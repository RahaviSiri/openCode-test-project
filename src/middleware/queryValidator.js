const AppError = require("../utils/AppError");

const validateTaskQuery = (req, res, next) => {
  const { status, priority } = req.query;
  const errors = [];

  if (status) {
    const validStatuses = ["pending", "in-progress", "completed"];
    if (!validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(", ")}`);
    }
  }

  if (priority) {
    const validPriorities = ["low", "medium", "high"];
    if (!validPriorities.includes(priority)) {
      errors.push(`Priority must be one of: ${validPriorities.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

module.exports = { validateTaskQuery };
