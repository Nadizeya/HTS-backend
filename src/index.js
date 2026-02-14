require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./config/supabase");

// Import routes
const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const equipmentRoutes = require("./routes/equipment.routes");
const requestsRoutes = require("./routes/requests.routes");
const roomsRoutes = require("./routes/rooms.routes");
const mapRoutes = require("./routes/map.routes");
const floorsRoutes = require("./routes/floors.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Test Supabase connection
app.get("/api/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("_table_name_") // Replace with your actual table name
      .select("*")
      .limit(1);

    if (error) throw error;

    res.json({
      success: true,
      message: "Supabase connection successful",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Supabase connection failed",
      error: error.message,
    });
  }
});

// API Routes
app.get("/api", (req, res) => {
  res.json({ message: "API is running" });
});

// Auth Routes
app.use("/api/auth", authRoutes);

// Users Routes (Protected)
app.use("/api/users", usersRoutes);

// Dashboard Routes (Protected)
app.use("/api/dashboard", dashboardRoutes);

// Equipment Routes (Protected)
app.use("/api/equipment", equipmentRoutes);

// Requests Routes (Protected)
app.use("/api/requests", requestsRoutes);

// Rooms Routes (Protected)
app.use("/api/rooms", roomsRoutes);

// Map Routes (Protected)
app.use("/api/map", mapRoutes);

// Floors Routes (Protected)
app.use("/api/floors", floorsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
