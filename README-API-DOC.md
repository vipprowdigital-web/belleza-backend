
---

```markdown
# 🧭 API Documentation — Backend Service

**Base URL:**  
```

[http://localhost:3000/api/v1](http://localhost:3000/api/v1)

````

---

## 🔐 Authentication Routes

### 1️⃣ Register User  
**POST** `/auth/register`

**Description:**  
Register a new user account.

**Headers:**  
`Content-Type: application/json`

**Request Body Example:**
```json
{
  "name": "Piyush Kumar",
  "email": "piyush@example.com",
  "password": "123456",
  "branchName": "Belleza Beauty School",
  "subdomain": "belleza-main",
  "customDomain": "belleza.com"
}
```

**Request Fields:**
- `name` (required): User's full name
- `email` (required): User's email address
- `password` (required): User's password
- `branchName` (required): Name of the branch/organization
- `subdomain` (required): Unique subdomain for the branch (lowercase, no spaces)
- `customDomain` (optional): Custom domain name for the branch

**Response (201):**

```json
{
  "message": "User registered successfully.",
  "user": {
    "id": "670f21e412f4f23cfa3c6d2e",
    "name": "Piyush Kumar",
    "email": "piyush@example.com",
    "branchId": "670f21e412f4f23cfa3c6d2f",
    "branchName": "Belleza Beauty School",
    "subdomain": "belleza-main",
    "customDomain": "belleza.com"
  }
}
```

**Errors:**

* `400` → Missing required fields (name, email, password, branchName, subdomain)
* `400` → Email already registered
* `400` → Subdomain already taken
* `400` → Custom domain already in use
* `500` → Internal server error

---

### 2️⃣ Login User

**POST** `/auth/login`

**Description:**
Authenticate user and return a JWT token.

**Headers:**
`Content-Type: application/json`

**Request Body Example:**

```json
{
  "email": "piyush@example.com",
  "password": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": {
    "_id": "670f21e412f4f23cfa3c6d2e",
    "name": "Piyush Kumar",
    "email": "piyush@example.com"
  }
}
```

**Errors:**

* `401` → Invalid email or password
* `500` → Server error

---

### 3️⃣ Get Authenticated Profile

**GET** `/auth/profile`

**Description:**
Fetch logged-in user’s profile.
🔒 **Requires Authorization header.**

**Headers:**

```
Authorization: Bearer <your_token_here>
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "_id": "670f21e412f4f23cfa3c6d2e",
    "name": "Piyush Kumar",
    "email": "piyush@example.com"
  }
}
```

**Errors:**

* `401` → Not authorized or invalid token

---

## 👤 User Routes

### 4️⃣ Get Current User Profile

**GET** `/users/profile`

**Description:**
Returns the authenticated user's profile details.
🔒 **Requires Authorization header.**

**Headers:**

```
Authorization: Bearer <your_token_here>
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "_id": "670f21e412f4f23cfa3c6d2e",
    "name": "Piyush Kumar",
    "email": "piyush@example.com"
  }
}
```

---

## ⚙️ App Configuration Routes

### 5️⃣ Get Application Config

**GET** `/app-config/`

**Description:**
Retrieve current application settings/configurations.
🔒 **Requires Authorization header.**

**Headers:**

```
Authorization: Bearer <your_token_here>
```

**Response (200):**

```json
{
  "success": true,
  "config": {
    "appName": "Blog App",
    "email": "piyush@example.com",
    "phoneNumber": "123456"
  }
}
```

---

### 6️⃣ Update Application Config

**POST** `/app-config/`

**Description:**
Update application name, contact email, or phone number.
🔒 **Requires Authorization header.**

**Headers:**

```
Authorization: Bearer <your_token_here>
Content-Type: application/json
```

**Request Body Example:**

```json
{
  "appName": "Blog App",
  "email": "newmail@example.com",
  "phoneNumber": "9876543210"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "App configuration updated successfully",
  "config": {
    "appName": "Blog App",
    "email": "newmail@example.com",
    "phoneNumber": "9876543210"
  }
}
```

**Errors:**

* `400` → Validation error
* `401` → Unauthorized
* `500` → Internal server error

---

## 🚨 Global Error Response Format

All API errors return the following format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## ⚡ Notes for Frontend Team

* Always include the header:

  ```
  Authorization: Bearer <token>
  ```

  for all protected routes.
* Base API URL will differ in production (e.g., `https://api.yourdomain.com/api/v1`)
* Token is returned in login/register response → store it in `localStorage` or cookies securely.

---

## 🧰 Tech Stack Info

* **Node.js** with **Express.js**
* **MongoDB** with **Mongoose** ORM
* **JWT Authentication**
* **Passport.js** (for future OAuth integrations)
* **Helmet**, **CORS**, **Morgan** for security and logging

---

© 2025 — Backend by **Piyush Kumar Raikwar**
