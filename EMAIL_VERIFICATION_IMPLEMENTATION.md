# Email Verification Implementation

## Overview
Implemented an email verification workflow for user registration using Gmail SMTP. Users must verify their email address before they can log in. The implementation integrates Firebase Authentication with a custom email verification layer.

## Objective
- Replace password reset email with email verification email during registration
- Add email verification requirement before allowing user login
- Integrate Firebase Authentication with custom email verification layer
- Send verification email with clickable link using Gmail SMTP

## Files Changed

### Backend Files

#### 0. `backend/config/firebase.js`
**Changes:**
- Created all Firebase configuration values to environment variables:
  - `apiKey` → `process.env.FIREBASE_API_KEY`
  - `authDomain` → `process.env.FIREBASE_AUTH_DOMAIN`
  - `projectId` → `process.env.FIREBASE_PROJECT_ID`
  - `storageBucket` → `process.env.FIREBASE_STORAGE_BUCKET`
  - `messagingSenderId` → `process.env.FIREBASE_MESSAGING_SENDER_ID`
  - `appId` → `process.env.FIREBASE_APP_ID`

**Purpose:** Secure Firebase credentials using environment variables

---

#### 1. `backend/models/userModel.js`
**Changes:**
- Added `isVerified` field (Boolean, default: false)
- Added `verificationToken` field (String)
- Added `verificationTokenExpires` field (Date)
- Added `password` field (String) for storing hashed passwords

**Purpose:** Store email verification status and tokens in MongoDB

---

#### 2. `backend/controllers/userController.js`
**Changes:**
- **Imports Added:**
  - `bcrypt` for password hashing
  - `crypto` for generating verification tokens
  - `sendVerificationEmail` from emailService
  - `auth` from Firebase config
  - `createUserWithEmailAndPassword` and `signInWithEmailAndPassword` from Firebase Auth

- **`registerUser` function:**
  - Removed password reset email functionality
  - Now accepts `password`, `email`, `username`, and `phone` from request body
  - Creates user in Firebase first using `createUserWithEmailAndPassword`
  - Creates user in MongoDB with hashed password
  - Generates verification token (32-byte hex string)
  - Sets token expiration to 24 hours
  - Stores user with `isVerified: false`
  - Sends verification email with link
  - Returns success message prompting user to check email

- **`verifyEmail` function (NEW):**
  - Accepts verification token from query parameter
  - Validates token and checks expiration
  - Sets `isVerified: true` in MongoDB
  - Clears verification token fields
  - Returns HTML success/error pages

- **`signinCustomer` function (NEW):**
  - Checks if user exists in MongoDB
  - Validates email verification status (blocks login if not verified)
  - Authenticates with Firebase using `signInWithEmailAndPassword`
  - Returns Firebase ID token for client authentication
  - Returns user data on successful login

**Purpose:** Handle registration, email verification, and login with verification check

---

#### 3. `backend/routes/userRoutes.js`
**Changes:**
- Added `verifyEmail` import from userController
- Added `signinCustomer` import from userController
- Added route: `GET /api/users/verify-email` for email verification
- Added route: `POST /api/users/signin_customer` for customer login

**Purpose:** Expose email verification and login endpoints

---

#### 4. `backend/utils/emailService.js`
**Changes:**
- Updated `createTransporter` function:
  - Changed hardcoded Gmail credentials to use environment variables
  - `user` now uses `process.env.GMAIL_USER`
  - `pass` now uses `process.env.GMAIL_APP_PASSWORD`
- Updated `sendVerificationEmail` function:
  - Changed default `baseUrl` to use `BACKEND_URL` instead of `FRONTEND_URL`
  - Verification link now points to backend endpoint: `${baseUrl}/api/users/verify-email?token=${verificationToken}`
  - Email template includes clickable button and plain text link
  - Email includes 24-hour expiration notice

**Purpose:** Send verification emails via Gmail SMTP using environment variables

---

#### 5. `backend/server.js`
**Changes:**
- Added error handling middleware:
  - Formats errors consistently
  - Returns JSON error responses with `success: false`
  - Includes error message and optional stack trace in development

**Purpose:** Provide consistent error responses across the API

---

#### 6. `backend/utils/files/google/gcs.js`
**Changes:**
- Updated Google Cloud Storage initialization:
  - `keyFilename` now uses `process.env.GOOGLE_CLOUD_KEY_FILE` with fallback to default path

**Purpose:** Secure Google Cloud Storage credentials using environment variables

---

#### 7. `backend/package.json`
**Changes:**
- Added dependency: `nodemailer: ^6.9.7`

**Purpose:** Enable email sending functionality

---

#### 8. `backend/.env.example` (NEW)
**Changes:**
- Created example environment variables file with dummy values
- Includes all required environment variables for the application
- Should be copied to `.env` and filled with actual values

**Purpose:** Template for environment variables configuration

---

### Frontend Files

#### 7. `frontend/lib/pages/register_page.dart`
**Changes:**
- **Imports:**
  - Removed `firebase_auth` import
  - Removed `email_verification_page` import
  - Added `dart:convert` for JSON parsing

- **`registerUser` function:**
  - Removed Firebase Auth dependency
  - Now sends POST request directly to backend API `/api/users/register_user`
  - Sends `email`, `password`, and `phone` in request body
  - Removed Firebase token authentication
  - Shows success dialog with message to check email
  - Navigates back to previous page after successful registration

- **Removed:**
  - `AddUserDetailInfo` function (no longer needed)
  - Firebase user creation code
  - Navigation to EmailVerificationScreen

**Purpose:** Register users via backend API instead of Firebase directly

---

## Workflow

### 1. Registration Flow
```
User fills registration form
    ↓
Frontend sends POST to /api/users/register_user
    ↓
Backend creates user in Firebase
    ↓
Backend creates user in MongoDB with isVerified: false
    ↓
Backend generates verification token
    ↓
Backend sends verification email via Gmail SMTP
    ↓
User receives email with verification link
```

### 2. Email Verification Flow
```
User clicks verification link in email
    ↓
Link opens: /api/users/verify-email?token=xxx
    ↓
Backend validates token and expiration
    ↓
Backend sets isVerified: true in MongoDB
    ↓
Backend clears verification token
    ↓
User sees success page
```

### 3. Login Flow
```
User enters email and password
    ↓
Frontend sends POST to /api/users/signin_customer
    ↓
Backend checks if user exists in MongoDB
    ↓
Backend checks if isVerified === true
    ↓
If not verified: Returns error "Please verify your email"
    ↓
If verified: Authenticates with Firebase
    ↓
Backend returns Firebase ID token and user data
    ↓
User is logged in
```

## Environment Variables Required

All sensitive values have been moved to environment variables. Copy `.env.example` to `.env` and fill in your actual values:

```bash
cp backend/.env.example backend/.env
```

### Required Environment Variables:

**Server Configuration:**
- `PORT` - Server port (default: 5004)
- `NODE_ENV` - Environment (development/production)
- `BACKEND_URL` - Backend URL for verification links

**Database:**
- `MONGO_URI` - MongoDB connection string

**Firebase:**
- `FIREBASE_API_KEY` - Firebase API key
- `FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `FIREBASE_APP_ID` - Firebase app ID
- `FIREBASE_SERVER_KEY` - Firebase server key for push notifications

**Email (Gmail SMTP):**
- `GMAIL_USER` - Gmail address for sending emails
- `GMAIL_APP_PASSWORD` - Gmail app password (not regular password)
- `GMAIL_FROM_NAME` - Sender name (optional, defaults to "Booty Test")

**Google Cloud Storage:**
- `GOOGLE_CLOUD_PROJECT_ID` - GCP project ID
- `GOOGLE_CLOUD_BUCKET_NAME` - GCS bucket name
- `GOOGLE_CLOUD_KEY_FILE` - Path to service account JSON key file

**WooCommerce (if used):**
- `WOOCOMMERCE_API_URL` - WooCommerce API URL
- `WOOCOMMERCE_CONSUMER_KEY` - WooCommerce consumer key
- `WOOCOMMERCE_CONSUMER_SECRET` - WooCommerce consumer secret
- `WOOCOMMERCE_JWT_AUTH_SECURITY_KEY` - JWT secret key
- `WOOCOMMERCE_WEBHOOK_SECRET` - Webhook secret
- `PT_SUBSCRIPTION_ID` - Personal trainer subscription ID
- `PTA_SUBSCRIPTION_ID` - PTA subscription ID

**Note:** All sensitive values in the code have been replaced with environment variables. See `backend/.env.example` for a complete list with dummy values.

## Dependencies

### Backend
- `nodemailer` - For sending emails via Gmail SMTP
- `bcrypt` - For password hashing (already installed)
- `crypto` - Built-in Node.js module for token generation
- `firebase` - For Firebase Authentication (already installed)

### Frontend
- No new dependencies required
- Removed dependency on `firebase_auth` for registration

## Testing Checklist

- [ ] User can register with email and password
- [ ] Verification email is received after registration
- [ ] Verification link works and verifies user
- [ ] Unverified users cannot log in
- [ ] Verified users can log in successfully
- [ ] Error messages are displayed correctly
- [ ] Token expiration works (24 hours)

## Notes

- Verification tokens expire after 24 hours
- Passwords are hashed using bcrypt (10 salt rounds)
- Firebase users are created during registration
- MongoDB stores user data with verification status
- Email verification is a required layer before Firebase authentication
- The `uid` field is not currently stored in MongoDB (can be added later if needed)

