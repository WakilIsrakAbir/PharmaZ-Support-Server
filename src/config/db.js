import mongoose from "mongoose";

export async function connectDatabase(uri) {
  // Fail after 10s instead of Mongoose's default 30s, so a wrong URI shows up quickly.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
