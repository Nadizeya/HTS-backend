const express = require("express");
const router = express.Router();
const authService = require("../services/auth.service");
const { authenticate } = require("../middleware/auth.middleware");

// Login with Employee Code
router.post("/login", async (req, res) => {
  try {
    const { employeecode, password } = req.body;

    if (!employeecode || !password) {
      return res.status(400).json({
        success: false,
        message: "Employee code and password are required",
      });
    }

    const result = await authService.login(employeecode, password);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Sign Out (JWT-based - just invalidate on client side)
router.post("/logout", authenticate, async (req, res) => {
  try {
    // With JWT, logout is typically handled client-side by removing the token
    // For server-side logout, you would need to implement a token blacklist
    res.json({
      success: true,
      message:
        "Logout successful. Please remove the token from client storage.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Current User
router.get("/me", authenticate, async (req, res) => {
  try {
    // User is already attached to req by authenticate middleware
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Refresh Token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const result = await authService.refreshTokens(refreshToken);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Register new user (optional - for admin use)
router.post("/register", async (req, res) => {
  try {
    const { employeecode, fullname, role, phone, password } = req.body;

    if (!employeecode || !fullname || !role || !password) {
      return res.status(400).json({
        success: false,
        message: "Employee code, full name, role, and password are required",
      });
    }

    const user = await authService.createUser({
      employee_code: employeecode,
      full_name: fullname,
      role,
      phone,
      password,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
