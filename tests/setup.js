require("dotenv").config();
const mongoose = require("mongoose");

let useLocalDb = false;

const connect = async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key";

  const mongoUri = process.env.MONGODB_URI_TEST;

  if (mongoUri) {
    useLocalDb = true;
    await mongoose.connect(mongoUri);
  } else {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }
};

const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
};

module.exports = { connect, closeDatabase, clearDatabase };
