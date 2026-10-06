const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message:
          "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const [existingUsers] =
      await pool.execute(
        "SELECT id FROM users WHERE email = ?",
        [normalizedEmail]
      );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message:
          "An account with this email already exists.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const [result] =
      await pool.execute(
        `
        INSERT INTO users (
          name,
          email,
          password,
          role
        )
        VALUES (?, ?, ?, 'user')
        `,
        [
          name.trim(),
          normalizedEmail,
          hashedPassword,
        ]
      );

    const user = {
      id: result.insertId,
      name: name.trim(),
      email: normalizedEmail,
      role: "user",
    };

    const token = createToken(user);

    return res.status(201).json({
      message:
        "Account created successfully.",
      token,
      user,
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to create account.",
    });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } =
      req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const [users] =
      await pool.execute(
        `
        SELECT
          id,
          name,
          email,
          password,
          role
        FROM users
        WHERE email = ?
        `,
        [normalizedEmail]
      );

    if (users.length === 0) {
      return res.status(401).json({
        message:
          "Invalid email or password.",
      });
    }

    const user = users[0];

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password.",
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token =
      createToken(safeUser);

    return res.json({
      message:
        "Login successful.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to login.",
    });
  }
}

function authenticateToken(
  req,
  res,
  next
) {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith(
      "Bearer "
    )
  ) {
    return res.status(401).json({
      message:
        "Authentication required.",
    });
  }

  const token =
    authHeader.substring(7);

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message:
        "Invalid or expired token.",
    });
  }
}

/*
  Allows both guests and logged-in users.

  Guest:
  req.user = null

  Logged-in user:
  req.user = decoded user
*/
function optionalAuthenticateToken(
  req,
  res,
  next
) {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith(
      "Bearer "
    )
  ) {
    req.user = null;
    return next();
  }

  const token =
    authHeader.substring(7);

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;
  } catch (error) {
    req.user = null;
  }

  next();
}

function requireAdmin(
  req,
  res,
  next
) {
  if (
    !req.user ||
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      message:
        "Admin access required.",
    });
  }

  next();
}

module.exports = {
  registerUser,
  loginUser,
  authenticateToken,
  optionalAuthenticateToken,
  requireAdmin,
};