const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { protect } = require("../middleware/auth");
const { validateTask, validateTaskUpdate, validateId } = require("../middleware/validate");
const { validateTaskQuery } = require("../middleware/queryValidator");

router.use(protect);

router
  .route("/")
  .get(validateTaskQuery, taskController.getAllTasks)
  .post(validateTask, taskController.createTask);

router
  .route("/:id")
  .get(validateId, taskController.getTaskById)
  .patch(validateId, validateTaskUpdate, taskController.updateTask)
  .delete(validateId, taskController.deleteTask);

module.exports = router;
