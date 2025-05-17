# Web Admin Panel Setup and Code Guide

## Backend Setup (Node.js + MongoDB)

### Step 1: Initialize Project
- Navigate to `admin-panel/backend`.
- Run `npm init -y` to create `package.json`.
- Install dependencies:
  ```
  npm install express mongoose bcryptjs jsonwebtoken cors dotenv
  ```

### Step 2: Folder Structure
```
backend/
├── models/
│   └── Message.js
├── routes/
│   ├── auth.js
│   └── messages.js
├── middleware/
│   └── authMiddleware.js
├── server.js
├── config.js
└── package.json
```

### Step 3: MongoDB Setup
- Create a MongoDB cluster or local instance.
- Add connection string in `config.js`.

### Step 4: API Endpoints
- `POST /api/auth/login` - Admin login with passcode.
- `POST /api/auth/reset` - Reset/change passcode (admin only).
- `GET /api/messages` - Get all forwarded messages.
- `POST /api/messages` - Receive forwarded SMS from Android app.

### Step 5: Security
- Use bcryptjs to hash passcode.
- Use JWT for authentication.
- Protect routes with `authMiddleware`.

---

## Frontend Setup (React + Tailwind CSS)

### Step 1: Initialize Project
- Navigate to `admin-panel/frontend`.
- Run `npx create-react-app .` or use existing React setup.
- Install Tailwind CSS:
  ```
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- Configure Tailwind in `tailwind.config.js` and `index.css`.

### Step 2: Folder Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   ├── AdminPanel.js
│   │   └── MessageList.js
│   ├── App.js
│   ├── index.js
│   └── styles.css
├── public/
└── package.json
```

### Step 3: Components
- `Login.js` - Admin login form with passcode.
- `AdminPanel.js` - Main dashboard with admin controls.
- `MessageList.js` - Displays incoming messages.

### Step 4: Styling
- Use BMW-style dark theme with black, blue, white gradients.
- Responsive design for mobile and desktop.

### Step 5: Running the Admin Panel
- Backend: `node server.js`
- Frontend: `npm start`

---

This guide will be followed by detailed code files with comments.
