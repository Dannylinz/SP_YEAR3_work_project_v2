require('dotenv').config();
const jwt = require("jsonwebtoken");

//////////////////////////////////////////////////////
// SET JWT CONFIGURATION
//////////////////////////////////////////////////////
const secretKey = process.env.JWT_SECRET_KEY || 'MEGANET_SECRET_KEY';
const tokenDuration = process.env.JWT_EXPIRES_IN || '8h';
const tokenAlgorithm = process.env.JWT_ALGORITHM || 'HS256';
const additionalHmacSecrets = process.env.JWT_ADDITIONAL_SECRETS
  ? process.env.JWT_ADDITIONAL_SECRETS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];
const hmacSecretCandidates = Array.from(new Set([secretKey, ...additionalHmacSecrets].filter(Boolean)));

function mapDecodedUser(decoded = {}) {
  return {
    userId: decoded.userId || decoded.user_id,
    username: decoded.username || decoded.email || decoded.user_name,
    roleId: decoded.roleId || decoded.role_id,
  };
}

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR GENERATING JWT TOKEN
//////////////////////////////////////////////////////
exports.generateToken = (req, res, next) => {
  const payload = {
    user_id: res.locals.userId,
    username: res.locals.username,
    role_id: res.locals.roleId
  };

  const options = {
    algorithm: tokenAlgorithm,
    expiresIn: tokenDuration,
    issuer: process.env.JWT_ISSUER || 'meganet-auth-system',
    audience: process.env.JWT_AUDIENCE || 'meganet-api'
  };

  console.log(`[JWT-GEN] Generating token with expiresIn: ${tokenDuration}`);

  const callback = (err, token) => {
    if (err) {
      console.error("[JWT-GEN] Error generating token:", err);
      res.status(500).json({ error: "Failed to generate token" });
    } else {
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = decoded.exp - now;

      console.log(`[JWT-GEN] Token generated successfully`);
      console.log(`  - Algorithm: ${tokenAlgorithm}`);
      console.log(`  - expiresIn setting: ${tokenDuration}`);
      console.log(`  - Token exp (Unix): ${decoded.exp}`);
      console.log(`  - Current time (Unix): ${now}`);
      console.log(`  - Time remaining: ${timeRemaining} seconds (~${Math.ceil(timeRemaining / 3600)} hours)`);

      res.locals.token = token;
      res.locals.tokenAlgorithm = tokenAlgorithm;
      next();
    }
  };

  jwt.sign(payload, secretKey, options, callback);
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR SENDING JWT TOKEN
//////////////////////////////////////////////////////
exports.sendToken = (req, res) => {
  res.cookie('authToken', res.locals.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });

  res.status(200).json({
    message: res.locals.message || 'Token generated successfully',
    token: res.locals.token
  });
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR VERIFYING JWT TOKEN
//////////////////////////////////////////////////////
exports.verifyToken = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  } else if (req.query && req.query.token) {
    token = req.query.token;
    console.log('[JWT-VERIFY] Token found in query parameter, setting as cookie');
    res.cookie('authToken', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    });
  }

  if (!token) {
    const acceptHeader = req.get('Accept') || '';
    const isHtmlRequest = acceptHeader.includes('text/html');

    if (isHtmlRequest) {
      return res.redirect('/login.html');
    }
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Try to verify with each candidate key
    let decoded = null;
    let keySource = 'primary';

    for (let i = 0; i < hmacSecretCandidates.length; i++) {
      try {
        decoded = jwt.verify(token, hmacSecretCandidates[i], {
          algorithms: [tokenAlgorithm]
        });
        if (i > 0) {
          keySource = i === hmacSecretCandidates.length - 1 ? 'fallback' : 'additional';
        }
        break;
      } catch (err) {
        if (i === hmacSecretCandidates.length - 1) {
          throw err; // Re-throw on last attempt
        }
      }
    }

    if (!decoded) {
      throw new Error('Token verification failed with all keys');
    }

    req.user = mapDecodedUser(decoded);
    res.locals.userId = req.user.userId;
    res.locals.username = req.user.username;
    res.locals.roleId = req.user.roleId;
    res.locals.tokenKeySource = keySource;

    console.log(`[JWT-VERIFY] Token verified successfully (keySource: ${keySource}) for user: ${req.user.username}`);
    next();
  } catch (err) {
    console.error("❌ Invalid or expired token:", err.message);
    const acceptHeader = req.get('Accept') || '';
    const isHtmlRequest = acceptHeader.includes('text/html');

    if (isHtmlRequest) {
      return res.redirect('/login.html');
    }
    return res.status(401).json({ message: "Invalid or expired token", error: err.message });
  }
};
