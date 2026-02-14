const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { supabaseAdmin } = require("../config/supabase");
const { authenticate, requireRole } = require("../middleware/auth.middleware");

// Get all users (Admin only)
router.get("/", authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Admin operations require SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    res.json({
      success: true,
      data: data.users,
      count: data.users.length,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user by ID (Admin only)
router.get("/:id", authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Admin operations require SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error) throw error;

    res.json({
      success: true,
      data: data.user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create new user (Admin only)
router.post("/", authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Admin operations require SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const { email, password, email_confirm = true, ...metadata } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm,
      user_metadata: metadata,
    });

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: data.user,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Update user (Admin only)
router.put("/:id", authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Admin operations require SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const { id } = req.params;
    const { email, password, email_confirm, ...metadata } = req.body;

    const updates = {};

    if (email) updates.email = email;
    if (password) updates.password = password;
    if (email_confirm !== undefined) updates.email_confirm = email_confirm;
    if (Object.keys(metadata).length > 0) updates.user_metadata = metadata;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      updates,
    );

    if (error) throw error;

    res.json({
      success: true,
      message: "User updated successfully",
      data: data.user,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete user (Admin only)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Admin operations require SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) throw error;

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Reset user password (Admin only)
router.post("/:id/reset-password", authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Admin operations require SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password,
    });

    if (error) throw error;

    res.json({
      success: true,
      message: "Password reset successfully",
      data: data.user,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
