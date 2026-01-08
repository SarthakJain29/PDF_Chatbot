import mongoose from "mongoose";
import { mg } from "../models";

export const connect_db = async (): Promise<boolean> => {
  try {
    const db_url = process.env.MONGODB_URI;

    if (!db_url || db_url === "NA") {
      console.error("No database URL provided, skipping connection");
      return false;
    }

    await mongoose.connect(db_url);
    const dbName = mongoose.connection.name;
    console.log(`Database [${dbName}] connected successfully`);
    return true;
  } catch (error) {
    console.error("database connection error:", error);
    return false;
  }
};

export const disconnect_db = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("Database disconnected successfully");
  } catch (error) {
    console.error("Database disconnection error:", error);
    throw error;
  }
};

export const get_db_status = (): string => {
  const state = mongoose.connection.readyState;

  const status_map: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };

  return status_map[state] || "unknown";
};

export const get_db_info = () => ({
  status: get_db_status(),
  name: mongoose.connection.name || "unknown",
  host: mongoose.connection.host || "unknown",
  port: mongoose.connection.port || "unknown",
});

/**
 * Initialize database connection and ensure all indexes are created
 */
export const init_db = async (): Promise<void> => {
  try {
    // Connect to database
    const connected = await connect_db();
    if (!connected) {
      throw new Error("Failed to connect to database");
    }

    // Import all models to register them with Mongoose
    // This ensures schemas and indexes are registered
    const models = [
      mg.user,
      mg.file,
      mg.file_page,
      mg.chat,
      mg.message,
    ];

    // Create indexes for all models
    console.log("Creating indexes...");
    for (const model of models) {
      await model.createIndexes();
      console.log(`✓ Indexes created for ${model.modelName}`);
    }

    // Get database info
    const dbInfo = get_db_info();
    console.log("Database Info:");
    console.log(`  Status: ${dbInfo.status}`);
    console.log(`  Name: ${dbInfo.name}`);
    console.log(`  Host: ${dbInfo.host}`);
    console.log(`  Port: ${dbInfo.port}`);

    console.log("Database initialization complete!");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

