require("dotenv").config();

const mongoose = require("mongoose");

const requireUniqueIdentity = async (collection, field, normalize) => {
  const values = await collection.find({}, { projection: { [field]: 1 } }).toArray();
  const seen = new Set();
  for (const document of values) {
    const value = normalize(document[field]);
    if (!value) throw new Error(`Missing ${field} on record ${document._id}`);
    if (seen.has(value)) {
      throw new Error(`Duplicate ${field} value found; resolve identity conflicts before migration`);
    }
    seen.add(value);
  }
};

const migrate = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  const db = mongoose.connection.db;
  const users = db.collection("users");
  const pendingUsers = db.collection("pendingusers");
  const carts = db.collection("carts");
  const addresses = db.collection("addresses");

  await requireUniqueIdentity(users, "email", (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "",
  );
  await requireUniqueIdentity(users, "username", (value) =>
    typeof value === "string" ? value.trim() : "",
  );

  const userCursor = users.find({}, { projection: { email: 1, username: 1 } });
  for await (const user of userCursor) {
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          email: user.email.trim().toLowerCase(),
          username: user.username.trim(),
          tokenVersion: Number.isInteger(user.tokenVersion) ? user.tokenVersion : 0,
        },
      },
    );
  }

  const duplicatePendingUsers = await pendingUsers
    .aggregate([
      { $sort: { updatedAt: -1, _id: -1 } },
      { $group: { _id: "$email", ids: { $push: "$_id" } } },
      { $match: { "ids.1": { $exists: true } } },
    ])
    .toArray();
  for (const group of duplicatePendingUsers) {
    await pendingUsers.deleteMany({ _id: { $in: group.ids.slice(1) } });
  }

  const duplicateCarts = await carts
    .aggregate([
      { $group: { _id: { user: "$user", product: "$product" }, ids: { $push: "$_id" }, qty: { $sum: "$qty" } } },
      { $match: { "ids.1": { $exists: true } } },
    ])
    .toArray();
  for (const group of duplicateCarts) {
    await carts.updateOne({ _id: group.ids[0] }, { $set: { qty: group.qty } });
    await carts.deleteMany({ _id: { $in: group.ids.slice(1) } });
  }

  const duplicateDefaults = await addresses
    .aggregate([
      { $match: { isDefault: true } },
      { $sort: { updatedAt: -1, _id: -1 } },
      { $group: { _id: "$user", ids: { $push: "$_id" } } },
      { $match: { "ids.1": { $exists: true } } },
    ])
    .toArray();
  for (const group of duplicateDefaults) {
    await addresses.updateMany(
      { _id: { $in: group.ids.slice(1) } },
      { $set: { isDefault: false } },
    );
  }

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ username: 1 }, { unique: true }),
    pendingUsers.createIndex({ email: 1 }, { unique: true }),
    pendingUsers.createIndex({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 }),
    carts.createIndex({ user: 1, product: 1 }, { unique: true }),
    addresses.createIndex({ user: 1, createdAt: -1 }),
    addresses.createIndex(
      { user: 1 },
      { unique: true, partialFilterExpression: { isDefault: true } },
    ),
    db.collection("orders").createIndex({ user: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ status: 1, createdAt: -1 }),
    db.collection("orders").createIndex(
      { paymentIntent: 1 },
      { unique: true, partialFilterExpression: { paymentIntent: { $type: "objectId" } } },
    ),
    db.collection("orders").createIndex(
      { paymentId: 1 },
      { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } },
    ),
    db.collection("paymentintents").createIndex({ razorpayOrderId: 1 }, { unique: true }),
    db.collection("paymentintents").createIndex(
      { paymentId: 1 },
      { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } },
    ),
    db.collection("webhookevents").createIndex({ eventId: 1 }, { unique: true }),
    db.collection("products").createIndex({ isActive: 1, type: 1 }),
    db.collection("resetgrants").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("resetgrants").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("auditlogs").createIndex({ createdAt: -1 }),
    db.collection("auditlogs").createIndex({ actor: 1, createdAt: -1 }),
  ]);
  await db.collection("schema_migrations").updateOne(
    { _id: "production-v1" },
    { $set: { completedAt: new Date() } },
    { upsert: true },
  );
};

migrate()
  .then(() => console.log("Database index migration completed"))
  .catch((error) => {
    console.error("Database index migration failed", { message: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
