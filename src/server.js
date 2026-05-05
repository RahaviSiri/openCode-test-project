require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const startServer = async () => {
  const PORT = process.env.PORT || 3000;

  await connectDB();

  await new Promise((resolve) => {
    app.listen(PORT, resolve);
  });

  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
