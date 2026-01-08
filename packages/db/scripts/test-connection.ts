#!/usr/bin/env bun

/**
 * Test database connection script
 * Usage: bun run packages/db/scripts/test-connection.ts
 */

import { disconnect_db, connect_db, get_db_info } from "../src/service/db";

const main = async () => {
  console.log("Testing database connection...\n");
  
  const connected = await connect_db();
  
  if (connected) {
    const dbInfo = get_db_info();
    console.log("Database connection successful!");
    console.log(`   Database: ${dbInfo.name}`);
    console.log(`   Host: ${dbInfo.host}:${dbInfo.port}`);
    console.log("\nConnection test passed!");
    await disconnect_db();
    process.exit(0);
  } else {
    console.log("Connection test failed!");
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
