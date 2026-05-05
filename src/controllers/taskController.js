const Task = require("../models/Task");
const AppError = require("../utils/AppError");

const getAllTasks = async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    const filter = { user: req.user._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, priority } = req.body;

    const task = await Task.create({
      user: req.user._id,
      title: title.trim(),
      description: description?.trim(),
      priority,
    });

    res.status(201).json({
      status: "success",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
