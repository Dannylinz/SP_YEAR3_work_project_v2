# Integration Changes Applied to Standalone Auth-System

Date: January 29, 2026

## Summary

Updated the standalone auth-system with enhancements and fixes documented in the Meganet_Inventory_System recovery report. These changes enable seamless cross-system authentication between the auth-system (port 3000) and inventory system (port 3300).

---

## Changes Made

### 1. Enhanced JWT Middleware (`src/middleware/authMiddleware.js`)

**Key Improvements:**
- Added multi-secret support for token verification (supports tokens from different sources)
- Implemented environment-based configuration for JWT settings
- Added query parameter token support for cross-system navigation
- Enhanced logging with detailed token expiration information
- Added `mapDecodedUser()` function for field name normalization
- Added `selectHmacKeyForToken()` for multi-key verification

**New Functions:**
- `generateToken(req, res, next)` - Creates JWT with configurable expiration
- `sendToken(req, res)` - Sends token with HTTP-only cookie
- `verifyToken(req, res, next)` - Verifies token with multi-secret fallback support

**Features:**
- Supports tokens from Authorization header, cookies, or URL query parameters
- Auto-sets cookies from query parameter tokens for cross-port navigation
- Logs key source ('primary', 'sdk', or 'fallback') for debugging
- Maps legacy field names (`user_id`, `role_id`) to current expectations

---

### 2. Updated Environment Configuration (`.env`)

**Added Configuration Variables:**
```env
JWT_ALGORITHM=HS256
JWT_ISSUER=meganet-auth-system
JWT_AUDIENCE=meganet-api
JWT_ADDITIONAL_SECRETS=
```

**Extended Variables:**
- `JWT_SECRET_KEY=MEGANET_SECRET_KEY` (now loaded from .env)
- `JWT_EXPIRES_IN=8h` (configurable expiration)
- `PORT=3000` (explicit port configuration)

**Purpose:** Centralized JWT configuration for better security and flexibility.

---

### 3. Added Request/Response Logging (`server.js`)

**New Middleware:**
- Logs all incoming requests with timestamp, client IP, method, path, and query params
- Intercepts responses to log status code, duration, and response preview
- Uses emoji icons for visual clarity (📥 for requests, 📤 for responses)
- Tracks request duration for performance monitoring

**Benefits:**
- Visibility into cross-system API calls
- Performance debugging capability
- Complete audit trail of all requests

---

### 4. Enhanced Portal Navigation (`public/index.html`)

**New Features:**
- Token extraction and passing to inventory system
- Inventory link now triggers custom handler instead of direct navigation
- Sets token in localStorage, cookies, and attempts to set on inventory domain
- Falls back to URL query parameter if cross-domain cookie setting fails
- Enhanced logout to clear all token storage locations

**Token Handling Flow:**
1. User clicks "Inventory System" link
2. Script extracts token from localStorage
3. Sets token in local storage and cookie
4. Attempts to set cookie on inventory system domain
5. Navigates with token as URL query parameter
6. Inventory system receives fresh token and can verify authentication

**Logout Enhancement:**
- Clears both `token` and `inventoryToken` from localStorage
- Clears `authToken` cookies on both root and `/INV_users/` paths
- Uses multiple methods for cross-browser compatibility

---

### 5. Added Cross-System Cookie Endpoint (`src/routes/authRoutes.js`)

**New Route:**
```
GET /api/auth/set-auth-cookie?token={JWT}
```

**Purpose:** Allows inventory system to request auth-system set cookies for cross-domain authentication.

**Response:**
```json
{
  "message": "Auth cookie set successfully",
  "cookieSet": true
}
```

---

## Integration Architecture

```
┌─────────────────────────────────────────┐
│     Auth-System (Port 3000)             │
│  - User login/registration              │
│  - Token generation                     │
│  - JWT verification with multi-secrets  │
│  - Portal dashboard (index.html)        │
└────────────────┬────────────────────────┘
                 │
        Token + Cross-Domain Cookies
                 │
┌────────────────▼────────────────────────┐
│  Inventory-System (Port 3300)           │
│  - Equipment management                 │
│  - Role-based permissions               │
│  - Uses auth tokens from port 3000      │
└─────────────────────────────────────────┘
```

### Token Flow:
1. **Auth-System** generates JWT with `MEGANET_SECRET_KEY`
2. **Portal Page** captures token from localStorage
3. **Navigation** passes token to inventory system via:
   - URL query parameter (primary)
   - Cookie (secondary)
   - Authorization header (when called via API)
4. **Inventory-System** verifies token against multiple secrets
5. **Fallback** support for tokens from different issuers/systems

---

## Configuration for Cross-System Operation

### .env Settings Required:

```env
# Auth-System Identity
JWT_SECRET_KEY=MEGANET_SECRET_KEY
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=8h
JWT_ISSUER=meganet-auth-system
JWT_AUDIENCE=meganet-api

# Support for additional auth sources
JWT_ADDITIONAL_SECRETS=SECONDARY_KEY_IF_NEEDED

# Port Configuration
PORT=3000
```

### Inventory-System Expects:

- Tokens signed with `MEGANET_SECRET_KEY` (configured as `MEGANET_AUTH_SDK_SECRET`)
- Token claims: `user_id`, `username`, `role_id`
- Token passed via Authorization header, cookie, or query parameter
- Expiration: 8 hours (matches auth-system `JWT_EXPIRES_IN`)

---

## Testing Cross-System Navigation

### Prerequisites:
1. Both systems running:
   - Auth-system: `npm run dev` (port 3000)
   - Inventory-system: `npm run dev` (port 3300)

2. Database initialized:
   - `npm run init-all` in auth-system

### Test Steps:
1. Navigate to `http://127.0.0.1:3000`
2. Login with valid credentials
3. Click "Inventory System" link
4. Should redirect to `http://127.0.0.1:3300/INV_users/home.html` with token
5. Inventory system should recognize authentication
6. User can navigate inventory features without re-login

### Debugging:
- Check browser console for token status logs
- Monitor server logs for `[JWT-GEN]` and `[JWT-VERIFY]` entries
- Verify cookies in browser DevTools → Application → Cookies
- Check network requests in DevTools → Network tab

---

## Security Considerations

1. **Token TTL:** 8 hours (configurable, matches both systems)
2. **HTTPOnly Cookies:** Used for automatic authentication (prevents XSS access)
3. **SameSite Policy:** 'Strict' for same-domain, 'Lax' for cross-domain scenarios
4. **Algorithm:** HS256 (HMAC-SHA256) - symmetric key signing
5. **Multi-Secret Support:** Allows gradual migration between keys
6. **Query Parameter Fallback:** Only used when cookies fail (less secure but necessary for cross-domain)

### Recommendations:
- Change `JWT_SECRET_KEY` from default `MEGANET_SECRET_KEY` in production
- Use HTTPS for production deployments
- Regularly rotate signing keys
- Monitor token verification logs for anomalies
- Set `NODE_ENV=production` to enforce secure cookies

---

## Backward Compatibility

All changes maintain backward compatibility with existing code:
- Old `authMiddleware.exports.verifyToken` still works
- Environment variables have sensible defaults
- Token format unchanged
- API endpoints same as before
- HTML UI improvements are non-breaking

---

## Future Enhancements

1. **RSA Signature Support:** Infrastructure ready in inventory-system
2. **Token Refresh:** Could add refresh tokens for extended sessions
3. **Rate Limiting:** Monitor failed verification attempts
4. **Token Revocation:** Central blacklist for logged-out tokens
5. **OAuth/OIDC:** Could integrate external identity providers

---

## File Modifications Summary

| File | Changes | Type |
|------|---------|------|
| `src/middleware/authMiddleware.js` | Complete rewrite with multi-secret support | Major |
| `.env` | Added JWT configuration variables | Minor |
| `server.js` | Added request/response logging middleware | Minor |
| `public/index.html` | Enhanced token handling and logout | Minor |
| `src/routes/authRoutes.js` | Added set-auth-cookie endpoint | Minor |

**Total Files Modified:** 5
**Lines Added:** ~300
**Lines Removed:** ~20
**Backward Compatible:** Yes

---

## Verification Checklist

- [x] Auth-system starts on port 3000
- [x] Environment variables configurable
- [x] JWT generation works with configurable expiration
- [x] Token verification supports multiple secrets
- [x] Cross-system navigation works with token passing
- [x] Logout clears all token storage
- [x] Request/response logging captures cross-system calls
- [x] Query parameter tokens work as fallback
- [x] Cookies set correctly for domain navigation

---

Date: January 29, 2026
Version: 1.0
