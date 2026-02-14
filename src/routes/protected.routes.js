const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");

// Example: Protected route - requires authentication
router.get("/profile", authenticate, (req, res) => {
  res.json({
    success: true,
    message: "This is a protected route",
    user: req.user,
  });
});

// Example: Admin only route
router.get("/admin", authenticate, requireRole(["admin"]), (req, res) => {
  res.json({
    success: true,
    message: "Admin access granted",
    user: req.user,
  });
});

// Example: Public route
router.get("/public", (req, res) => {
  res.json({
    success: true,
    message: "This is a public route",
  });
});

module.exports = router;
