const authService = require("../services/auth.service");

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message:
          "No token provided. Please include 'Bearer <token>' in Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token and get user
    const user = await authService.verifyToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Attach user to request object
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Authentication failed",
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        const user = await authService.verifyToken(token);

        if (user) {
          req.user = user;
          req.token = token;
        }
      } catch (error) {
        // Silently fail for optional authentication
        console.log("Optional auth failed:", error.message);
      }
    }

    next();
  } catch (error) {
    console.error("Optional authentication error:", error);
    next();
  }
};

/**
 * Check if user has specific role(s)
 */
const requireRole = (roles) => {
  // Ensure roles is an array
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

/**
 * Check if user status is available
 */
const requireAvailableStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.current_status !== "available") {
    return res.status(403).json({
      success: false,
      message: "User must be in available status",
    });
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAvailableStatus,
};
