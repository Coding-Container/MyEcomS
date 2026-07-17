const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const errorHandler = require("./middleware/errorHandler");

const helmet = require("helmet");
const compression = require("compression");

const allowedOrigins = [
  "http://localhost:3000",
  "https://my-ecom-s.vercel.app",
];

dotenv.config();
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json());
app.use(compression());
app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked"));
    },
    credentials: true,
  }),
);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (e) {
    console.log("DB Error", e.message);
    process.exit(1);
  }
};
connectDB();

const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);

const orderRoutes = require("./routes/orderRoutes");

app.use("/api/orders", orderRoutes);

const paymentRoutes = require("./routes/paymentRoutes");

app.use("/api/payment", paymentRoutes);

const addressRoutes = require("./routes/addressRoutes");
app.use("/api/address", addressRoutes);

const aiRoutes = require("./routes/aiRoutes");
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
