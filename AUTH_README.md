# Authentication System Documentation

## Overview

This backend uses a custom JWT-based authentication system with **employee code** and **password** instead of email-based authentication.

## Features

- ✅ Login with employee code and password
- ✅ JWT access tokens (24h expiry by default)
- ✅ Refresh tokens (7d expiry by default)
- ✅ Role-based access control (nurse, porter, admin)
- ✅ Secure password hashing with bcrypt
- ✅ User registration endpoint

## Environment Variables

Add these to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

## API Endpoints

### 1. Register New User

**POST** `/api/auth/register`

```json
{
  "employeecode": "N001",
  "fullname": "Sarah Johnson",
  "role": "nurse",
  "phone": "0812345678",
  "password": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "employee_code": "N001",
    "full_name": "Sarah Johnson",
    "role": "nurse",
    "phone": "0812345678",
    "current_status": "available"
  }
}
```

### 2. Login

**POST** `/api/auth/login`

```json
{
  "employeecode": "N001",
  "password": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "employee_code": "N001",
      "full_name": "Sarah Johnson",
      "role": "nurse",
      "current_status": "available"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get Current User

**GET** `/api/auth/me`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_code": "N001",
    "full_name": "Sarah Johnson",
    "role": "nurse",
    "current_status": "available"
  }
}
```

### 4. Refresh Token

**POST** `/api/auth/refresh`

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": { ... },
    "token": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### 5. Logout

**POST** `/api/auth/logout`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Note:** With JWT, logout is primarily handled client-side by removing tokens from storage.

## Middleware Usage

### Protect Routes

```javascript
const { authenticate } = require("../middleware/auth.middleware");

router.get("/protected", authenticate, (req, res) => {
  // req.user is available here
  res.json({ user: req.user });
});
```

### Role-Based Access

```javascript
const { authenticate, requireRole } = require("../middleware/auth.middleware");

// Single role
router.get("/admin-only", authenticate, requireRole("admin"), (req, res) => {
  res.json({ message: "Admin area" });
});

// Multiple roles
router.get(
  "/staff-only",
  authenticate,
  requireRole(["nurse", "porter"]),
  (req, res) => {
    res.json({ message: "Staff area" });
  },
);
```

### Optional Authentication

```javascript
const { optionalAuthenticate } = require("../middleware/auth.middleware");

router.get("/public", optionalAuthenticate, (req, res) => {
  // req.user will be set if token is provided and valid
  // Otherwise, request continues without user
  if (req.user) {
    res.json({ message: "Hello " + req.user.full_name });
  } else {
    res.json({ message: "Hello guest" });
  }
});
```

## Database Schema

The authentication system works with the `users` table:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    employee_code TEXT UNIQUE,
    full_name TEXT NOT NULL,
    role "UserRole" NOT NULL,  -- 'nurse', 'porter', 'admin'
    phone TEXT,
    current_status "UserStatus" DEFAULT 'available',
    current_floor_id UUID REFERENCES floors(id),
    active_request_count INTEGER DEFAULT 0,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Default Test Users

From the schema, these users are created by default:

| Employee Code | Password | Role   | Name          |
| ------------- | -------- | ------ | ------------- |
| N001          | 123456   | nurse  | Sarah Johnson |
| P001          | 123456   | porter | Michael Tan   |

## Security Notes

1. **JWT_SECRET**: Always use a strong, random secret in production
2. **Password Hashing**: Uses bcrypt with salt rounds of 10
3. **Token Expiry**: Configure appropriate expiry times for your use case
4. **HTTPS**: Always use HTTPS in production to protect tokens in transit
5. **Token Storage**: Clients should store tokens securely (httpOnly cookies or secure storage)

## Client-Side Integration Example

```javascript
// Login
const response = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    employeecode: "N001",
    password: "123456",
  }),
});

const { data } = await response.json();
// Store tokens
localStorage.setItem("accessToken", data.token);
localStorage.setItem("refreshToken", data.refreshToken);

// Make authenticated requests
const protectedResponse = await fetch("http://localhost:3000/api/auth/me", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  },
});

// Refresh token when access token expires
const refreshResponse = await fetch("http://localhost:3000/api/auth/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    refreshToken: localStorage.getItem("refreshToken"),
  }),
});
```

## Troubleshooting

### "Invalid employee code or password"

- Verify the employee code exists in the database
- Check password is correct (case-sensitive)
- Ensure user record has a valid password_hash

### "Invalid or expired token"

- Token may have expired (default 24h for access tokens)
- Use refresh token to get new access token
- Check JWT_SECRET is the same across server restarts

### "Insufficient permissions"

- User role doesn't match required role for the endpoint
- Check user's role in database matches expected role

## Migration from Email-based Auth

If migrating from Supabase email-based auth:

1. Update client applications to use `employeecode` instead of `email`
2. Ensure all users have `employee_code` and `password_hash` in database
3. Update environment variables with JWT configuration
4. Test authentication flow with existing users
