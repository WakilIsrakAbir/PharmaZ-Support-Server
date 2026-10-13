import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

try {
  await connectDatabase(env.mongodbUri);
} catch (error) {
  // The URI isn't printed because it contains the database password.
  console.error(`Could not connect to MongoDB. Check MONGODB_URI in .env.\n${error.message}`);
  process.exit(1);
}

const server = createApp().listen(env.port, (error) => {
  if (error) throw error;
  console.log(`API ready at http://localhost:${env.port}/api`);
});

// Finish open requests and close the database connection before exiting
async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close();
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
