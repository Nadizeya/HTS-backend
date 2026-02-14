const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

// JWT Secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Login with employee code and password
 * @param {string} employeeCode - Employee code
 * @param {string} password - Plain text password
 * @returns {Promise<{user, token, refreshToken}>}
 */
async function login(employeeCode, password) {
  if (!employeeCode || !password) {
    throw new Error("Employee code and password are required");
  }

  // Fetch user from database
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .eq("employee_code", employeeCode)
    .limit(1);

  if (error) {
    throw new Error("Database error: " + error.message);
  }

  if (!users || users.length === 0) {
    throw new Error("Invalid employee code or password");
  }

  const user = users[0];

  // Verify password using bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error("Invalid employee code or password");
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Remove sensitive data
  const { password_hash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token: accessToken,
    refreshToken: refreshToken,
  };
}

/**
 * Verify JWT token and return user
 * @param {string} token - JWT access token
 * @returns {Promise<Object>} User object
 */
async function verifyToken(token) {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user data from database
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .limit(1);

    if (error) {
      throw new Error("Database error: " + error.message);
    }

    if (!users || users.length === 0) {
      throw new Error("User not found");
    }

    const user = users[0];
    const { password_hash, ...userWithoutPassword } = user;

    return userWithoutPassword;
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expired");
    }
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - JWT refresh token
 * @returns {Promise<{user, token, refreshToken}>}
 */
async function refreshTokens(refreshToken) {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    // Fetch user from database
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .limit(1);

    if (error) {
      throw new Error("Database error: " + error.message);
    }

    if (!users || users.length === 0) {
      throw new Error("User not found");
    }

    const user = users[0];

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Remove sensitive data
    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid refresh token");
    }
    if (error.name === "TokenExpiredError") {
      throw new Error("Refresh token expired");
    }
    throw error;
  }
}

/**
 * Generate access token
 * @param {Object} user - User object
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    employeeCode: user.employee_code,
    role: user.role,
    type: "access",
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    type: "refresh",
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Create a new user
 * @param {Object} userData - User data {employee_code, full_name, role, phone, password}
 * @returns {Promise<Object>} Created user
 */
async function createUser(userData) {
  const { employee_code, full_name, role, phone, password } = userData;

  if (!employee_code || !full_name || !role || !password) {
    throw new Error(
      "Employee code, full name, role, and password are required",
    );
  }

  // Check if employee code already exists
  const { data: existingUsers } = await supabase
    .from("users")
    .select("id")
    .eq("employee_code", employee_code)
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    throw new Error("Employee code already exists");
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        employee_code,
        full_name,
        role,
        phone: phone || null,
        password_hash,
        current_status: "available",
        active_request_count: 0,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error("Failed to create user: " + error.message);
  }

  const { password_hash: _, ...userWithoutPassword } = data;
  return userWithoutPassword;
}

module.exports = {
  login,
  verifyToken,
  refreshTokens,
  hashPassword,
  createUser,
  generateAccessToken,
  generateRefreshToken,
};
