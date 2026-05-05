const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Task = require("../src/models/Task");
const { connect, closeDatabase, clearDatabase } = require("./setup");

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("Auth API Endpoints", () => {
  describe("POST /api/auth/register", () => {
    test("should register a new user successfully", async () => {
      const userData = {
        name: "Test User",
        email: "register-test@example.com",
        password: "password123",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.email).toBe(userData.email.toLowerCase());
      expect(response.body.data.user).toHaveProperty("id");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data.user).not.toHaveProperty("password");
    });

    test("should hash password in database", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: "hash-test@example.com",
          password: "password123",
        });

      const user = await User.findOne({ email: "hash-test@example.com" }).select("+password");
      expect(user.password).not.toBe("password123");
    });

    test("should reject duplicate email", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({
          name: "First User",
          email: "duplicate-test@example.com",
          password: "password123",
        });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Second User",
          email: "duplicate-test@example.com",
          password: "password456",
        })
        .expect(409);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Email already registered");
    });

    test("should reject missing name", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "no-name@example.com",
          password: "password123",
        })
        .expect(400);

      expect(response.body.message).toContain("Name");
    });

    test("should reject invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: "not-an-email",
          password: "password123",
        })
        .expect(400);

      expect(response.body.message).toContain("email");
    });

    test("should reject short password", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: "short-pw@example.com",
          password: "short",
        })
        .expect(400);

      expect(response.body.message).toContain("6 characters");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await User.create({
        name: "Test User",
        email: "login-test@example.com",
        password: "password123",
      });
    });

    test("should login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login-test@example.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.user.email).toBe("login-test@example.com");
      expect(response.body.data).toHaveProperty("token");
    });

    test("should reject incorrect password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login-test@example.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.message).toBe("Invalid email or password");
    });

    test("should reject non-existent email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.message).toBe("Invalid email or password");
    });

    test("should reject missing email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ password: "password123" })
        .expect(400);

      expect(response.body.message).toContain("Email");
    });

    test("should reject missing password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "login-test@example.com" })
        .expect(400);

      expect(response.body.message).toContain("Password");
    });
  });

  describe("GET /api/auth/me", () => {
    let token;

    beforeEach(async () => {
      const user = await User.create({
        name: "Test User",
        email: "me-test@example.com",
        password: "password123",
      });
      token = user.generateToken();
    });

    test("should return current user with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.email).toBe("me-test@example.com");
      expect(response.body.data).not.toHaveProperty("password");
    });

    test("should reject missing token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .expect(401);

      expect(response.body.message).toContain("login");
    });

    test("should reject invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalidtoken")
        .expect(401);

      expect(response.body.message).toBe("Invalid token");
    });
  });

  describe("Protected Routes", () => {
    test("should reject access to tasks without token", async () => {
      const response = await request(app)
        .get("/api/tasks")
        .expect(401);

      expect(response.body.message).toContain("login");
    });

    test("should reject access to create task without token", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({ title: "Test Task" })
        .expect(401);

      expect(response.body.message).toContain("login");
    });

    test("should allow access to tasks with valid token", async () => {
      const user = await User.create({
        name: "Test User",
        email: "protected-test@example.com",
        password: "password123",
      });
      const token = user.generateToken();

      const response = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe("success");
    });
  });
});
