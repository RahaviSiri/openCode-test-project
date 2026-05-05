const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Task = require("../src/models/Task");
const { connect, closeDatabase, clearDatabase } = require("./setup");

let authToken;
let userId;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connect();
});

beforeEach(async () => {
  const user = await User.create({
    name: "Test User",
    email: `task-test-${Date.now()}@example.com`,
    password: "password123",
  });
  authToken = user.generateToken();
  userId = user._id;
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("Task API Endpoints", () => {
  describe("POST /api/tasks", () => {
    test("should create a new task with valid data", async () => {
      const taskData = {
        title: "Test Task",
        description: "Test description",
        priority: "high",
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.description).toBe(taskData.description);
      expect(response.body.data.priority).toBe(taskData.priority);
      expect(response.body.data.status).toBe("pending");
      expect(response.body.data).toHaveProperty("_id");
      expect(response.body.data).toHaveProperty("createdAt");
      expect(response.body.data).toHaveProperty("updatedAt");
    });

    test("should create task with default values when optional fields missing", async () => {
      const taskData = { title: "Minimal Task" };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.data.description).toBe("");
      expect(response.body.data.priority).toBe("medium");
      expect(response.body.data.status).toBe("pending");
    });

    test("should reject task with missing title", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "No title" })
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("Title");
    });

    test("should reject task with empty title", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "" })
        .expect(400);

      expect(response.body.status).toBe("error");
    });

    test("should reject task with invalid priority", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Test", priority: "urgent" })
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("Priority");
    });

    test("should reject task with title exceeding max length", async () => {
      const longTitle = "a".repeat(201);

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: longTitle })
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("200 characters");
    });

    test("should reject without authentication", async () => {
      await request(app)
        .post("/api/tasks")
        .send({ title: "Test Task" })
        .expect(401);
    });
  });

  describe("GET /api/tasks", () => {
    beforeEach(async () => {
      await Task.create([
        { user: userId, title: "Task 1", status: "pending", priority: "low" },
        { user: userId, title: "Task 2", status: "completed", priority: "high" },
        { user: userId, title: "Task 3", status: "pending", priority: "medium" },
      ]);
    });

    test("should return all tasks", async () => {
      const response = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.count).toBe(3);
      expect(response.body.data).toHaveLength(3);
    });

    test("should filter tasks by status", async () => {
      const response = await request(app)
        .get("/api/tasks?status=pending")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(2);
      response.body.data.forEach((task) => {
        expect(task.status).toBe("pending");
      });
    });

    test("should filter tasks by priority", async () => {
      const response = await request(app)
        .get("/api/tasks?priority=high")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.data[0].priority).toBe("high");
    });

    test("should reject invalid status filter", async () => {
      const response = await request(app)
        .get("/api/tasks?status=invalid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe("error");
    });

    test("should reject invalid priority filter", async () => {
      const response = await request(app)
        .get("/api/tasks?priority=urgent")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe("error");
    });

    test("should return tasks sorted by createdAt descending", async () => {
      const response = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const tasks = response.body.data;
      for (let i = 0; i < tasks.length - 1; i++) {
        expect(new Date(tasks[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(tasks[i + 1].createdAt).getTime()
        );
      }
    });

    test("should reject without authentication", async () => {
      await request(app)
        .get("/api/tasks")
        .expect(401);
    });
  });

  describe("GET /api/tasks/:id", () => {
    let createdTask;

    beforeEach(async () => {
      createdTask = await Task.create({
        user: userId,
        title: "Find Me",
        description: "Test task",
      });
    });

    test("should return task by valid ID", async () => {
      const response = await request(app)
        .get(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.title).toBe("Find Me");
    });

    test("should return 404 for non-existent task", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/tasks/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Task not found");
    });

    test("should return 400 for invalid ObjectId format", async () => {
      const response = await request(app)
        .get("/api/tasks/invalidid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Invalid task ID");
    });

    test("should reject without authentication", async () => {
      await request(app)
        .get(`/api/tasks/${createdTask._id}`)
        .expect(401);
    });
  });

  describe("PATCH /api/tasks/:id", () => {
    let createdTask;

    beforeEach(async () => {
      createdTask = await Task.create({
        user: userId,
        title: "Original Title",
        description: "Original description",
        status: "pending",
        priority: "low",
      });
    });

    test("should update task title", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated Title" })
        .expect(200);

      expect(response.body.data.title).toBe("Updated Title");
      expect(response.body.data.description).toBe("Original description");
    });

    test("should update task status", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "completed" })
        .expect(200);

      expect(response.body.data.status).toBe("completed");
    });

    test("should update task priority", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ priority: "high" })
        .expect(200);

      expect(response.body.data.priority).toBe("high");
    });

    test("should update multiple fields at once", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "New Title",
          status: "in-progress",
          priority: "high",
          description: "New description",
        })
        .expect(200);

      expect(response.body.data.title).toBe("New Title");
      expect(response.body.data.status).toBe("in-progress");
      expect(response.body.data.priority).toBe("high");
      expect(response.body.data.description).toBe("New description");
    });

    test("should return 404 for non-existent task", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await request(app)
        .patch(`/api/tasks/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Update" })
        .expect(404);
    });

    test("should reject invalid status value", async () => {
      await request(app)
        .patch(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "done" })
        .expect(400);
    });

    test("should reject invalid priority value", async () => {
      await request(app)
        .patch(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ priority: "critical" })
        .expect(400);
    });

    test("should reject empty title", async () => {
      await request(app)
        .patch(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "" })
        .expect(400);
    });

    test("should return 400 for invalid ObjectId", async () => {
      await request(app)
        .patch("/api/tasks/invalidid")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Update" })
        .expect(400);
    });

    test("should reject without authentication", async () => {
      await request(app)
        .patch(`/api/tasks/${createdTask._id}`)
        .send({ title: "Update" })
        .expect(401);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    let createdTask;

    beforeEach(async () => {
      createdTask = await Task.create({ user: userId, title: "Delete Me" });
    });

    test("should delete task successfully", async () => {
      await request(app)
        .delete(`/api/tasks/${createdTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(204);

      const deletedTask = await Task.findById(createdTask._id);
      expect(deletedTask).toBeNull();
    });

    test("should return 404 for non-existent task", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/tasks/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    test("should return 400 for invalid ObjectId", async () => {
      await request(app)
        .delete("/api/tasks/invalidid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });

    test("should reject without authentication", async () => {
      await request(app)
        .delete(`/api/tasks/${createdTask._id}`)
        .expect(401);
    });
  });

  describe("GET /health", () => {
    test("should return health status", async () => {
      const response = await request(app)
        .get("/health")
        .expect(200);

      expect(response.body.status).toBe("ok");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("Unknown routes", () => {
    test("should return 404 for unknown routes", async () => {
      const response = await request(app)
        .get("/api/unknown")
        .expect(404);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("not found");
    });
  });
});
