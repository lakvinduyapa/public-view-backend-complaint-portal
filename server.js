const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./config/db");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Test PostgreSQL connection
pool
  .query("SELECT NOW()")
  .then(() => console.log("Database connection test successful"))
  .catch((err) => console.error("Database connection test failed:", err.message));

// Connect submission routes
const submissionRoutes = require("./routes/submissionRoutes");

app.use("/api/submissions", submissionRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});