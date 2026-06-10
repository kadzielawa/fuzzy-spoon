# User Authentication Troubleshooting Guide

## 🚨 "404 User Not Found" Error

When you see this error, it means the backend couldn't find your user in the mock database.

```json
{
  "error": "User not found",
  "userId": "some-id",
  "availableUsers": ["user-123", "user-456", "user-789"]
}
```

---

## ✅ Quick Fixes

### 1. **Clear Browser Cache & Login Again**

```javascript
// Open browser console (F12) and run:
localStorage.clear();
location.reload();

// Then login with one of these users:
// - Alice Johnson (user-123) - Developer
// - Bob Smith (user-456) - Developer
// - Carol White (user-789) - Admin/Architect
```

### 2. **Check if You're Using a Valid User ID**

Valid user IDs are:
- ✅ `user-123` - Alice Johnson (developer, team-lead)
- ✅ `user-456` - Bob Smith (developer)
- ✅ `user-789` - Carol White (admin, architect)

If you're seeing a different ID like `user-1234` or `undefined`, that's the problem.

### 3. **Verify Backend Mock Users Match**

In `backend/src/index.ts`, check that mockUsers contains:

```typescript
const mockUsers: Map<string, User> = new Map([
  ['user-123', { id: 'user-123', name: 'Alice Johnson', ... }],
  ['user-456', { id: 'user-456', name: 'Bob Smith', ... }],
  ['user-789', { id: 'user-789', name: 'Carol White', ... }],
]);
```

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for `[apiCall]` messages like:

```
[apiCall] GET /api/user/profile
[apiCall] UserId: user-123
[apiCall] Headers: {x-user-id: 'user-123', Content-Type: 'application/json'}
```

### Step 2: Check Browser Storage

1. Open DevTools (F12)
2. Go to **Application** → **Local Storage**
3. Look for key `userId`
4. Value should be one of: `user-123`, `user-456`, or `user-789`

**If missing:** Login page didn't save it - try logging in again

**If wrong value:** Clear and try again with correct user

### Step 3: Check Backend Logs

When you make a request, look for backend logs:

```
[Auth] Authenticating user: user-123 for GET /api/user/profile
[Auth] Available users: user-123, user-456, user-789
[Auth] User authenticated: { userId: 'user-123', name: 'Alice Johnson', ... }
```

---

## 📊 Data Flow Diagram

```
User Selects Login
    │
    ├─→ [LoginPage] Set selected user (default: user-123)
    │
    ├─→ Click "Sign in"
    │
    ├─→ handleLogin():
    │   ├─ localStorage.setItem('userId', 'user-123')  ← Stores in browser
    │   └─ api.user.getProfile()  ← Makes API call
    │
    ├─→ [API Client] apiCall():
    │   ├─ Reads userId from localStorage  ← Gets 'user-123'
    │   ├─ Adds x-user-id header  ← 'x-user-id: user-123'
    │   └─ Sends POST /api/user/profile
    │
    ├─→ [Backend] authenticateUser middleware:
    │   ├─ Reads x-user-id header  ← Gets 'user-123'
    │   ├─ Looks up in mockUsers  ← Finds Alice Johnson
    │   ├─ Attaches user to req  ← req.user = {id, name, roles, ...}
    │   └─ Calls next()  ← Proceeds to endpoint
    │
    └─→ Success! User authenticated ✅
```

---

## ❌ Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| localStorage never populated | Login button does nothing | Check browser console for errors |
| Wrong user ID format | 404 error with invalid userId | Use `user-123`, `user-456`, or `user-789` |
| x-user-id header not sent | API always fails | Check apiCall sends header |
| Backend mockUsers outdated | User exists in frontend not in backend | Restart backend server |
| Cache issues | Works once then breaks | Clear localStorage and browser cache |

---

## 🔧 Manual Testing via cURL

```bash
# Test with valid user
curl -H "x-user-id: user-123" \
  http://localhost:3001/api/user/profile

# Should return: { id, name, email, roles, ... }

# Test with invalid user
curl -H "x-user-id: user-999" \
  http://localhost:3001/api/user/profile

# Should return 401: { error: 'User not found', userId: 'user-999', availableUsers: [...] }
```

---

## 🌐 Environment Variables

Make sure these are set:

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend
PORT=3001
NODE_ENV=development
```

---

## 🔄 Complete Reset Steps

If nothing works, do a complete reset:

```bash
# 1. Clear browser storage
# Dev tools → Application → Local Storage → Clear All

# 2. Stop backend
# Ctrl+C in terminal

# 3. Stop frontend
# Ctrl+C in terminal

# 4. Clear node modules cache
rm -rf backend/node_modules frontend/.next frontend/node_modules

# 5. Reinstall
cd backend && npm install && cd ../frontend && npm install

# 6. Restart backend
cd backend && npm run dev

# 7. Restart frontend (in new terminal)
cd frontend && npm run dev

# 8. Open http://localhost:3000
# Login with: user-123 (Alice)

# 9. Check backend logs for: [Auth] User authenticated
```

---

## 📝 Checklist

- [ ] User ID exists in `backend/src/index.ts` mockUsers
- [ ] Login page displays the correct user
- [ ] localStorage has correct userId after login
- [ ] API calls include `x-user-id` header
- [ ] Backend logs show "User authenticated"
- [ ] Frontend shows dashboard after login
- [ ] Can fetch user profile successfully

---

## 💡 Why This Happens

The system uses a **mock authentication system** for development:

1. **Frontend** stores userId in localStorage after login
2. **API Client** reads userId and sends it as `x-user-id` header
3. **Backend** middleware checks header and looks up user in mockUsers map
4. If user not found → 401 error

This is intentional - in production you'd have:
- Real OAuth/JWT tokens instead of localStorage userId
- Real user database instead of mockUsers map
- Real authentication service instead of middleware

---

## 🆘 Still Not Working?

1. Check browser console for error messages
2. Check backend terminal logs for auth details
3. Verify user ID matches exactly (case-sensitive)
4. Try the "Complete Reset" section above
5. Ensure backend is running on port 3001
6. Ensure frontend is running on port 3000

If you see this in browser console:
```
[apiCall] Error response body: {"error":"User not found","userId":"user-999"}
```

Then the userId being sent doesn't exist. Make sure localStorage has a valid ID.

---

## 🎯 Test Users Quick Reference

```javascript
// Valid test users (must use these exact IDs)
const testUsers = {
  developer: {
    id: 'user-123',
    name: 'Alice Johnson',
    email: 'alice.johnson@vodafone.com',
    roles: ['developer', 'team-lead'],
  },
  backend: {
    id: 'user-456',
    name: 'Bob Smith',
    email: 'bob.martinez@vodafone.com',
    roles: ['developer'],
  },
  admin: {
    id: 'user-789',
    name: 'Carol White',
    email: 'carol.chen@vodafone.com',
    roles: ['admin', 'architect'],
  },
};
```

Copy any of these IDs into localStorage to test:

```javascript
localStorage.setItem('userId', 'user-123');
location.reload();
```

---

## ✅ Success Indicators

When authentication works:

1. ✅ Login page shows user selection
2. ✅ After clicking "Sign in", redirects to dashboard
3. ✅ Dashboard shows user name in top right
4. ✅ Can navigate to templates and create deployments
5. ✅ Backend logs show "User authenticated"
6. ✅ API calls return 200 status codes

If you see any of these:
- ❌ 401 Unauthorized
- ❌ 404 User Not Found
- ❌ Blank page after login
- ❌ Can't access dashboard

Then authentication failed. Follow debugging steps above.
