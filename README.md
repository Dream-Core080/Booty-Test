# Booty Flutter Test repo

This repository contains the Booty fitness application codebase, split into a Flutter frontend and a Node.js/Express backend. Use this README as the entry point for local development and deployment.

## Project Structure

- `frontend` – Flutter application targeting mobile, desktop, and web.
- `backend` – REST API, authentication, and WooCommerce integrations built on Node.js, Express, and MongoDB.

Each subdirectory includes its own README with additional details once the project is bootstrapped.

## Prerequisites

- Flutter SDK (3.x recommended) with platform toolchains for your target devices.
- Node.js 18+ and npm.
- MongoDB instance (local or hosted).
- WooCommerce store credentials (for production features that rely on the Woo integration).

Optional but recommended:

- Android Studio and Xcode for native builds.
- Firebase project credentials if you plan to use push notifications and analytics.

## Quick Start

Clone the repo and install dependencies for both apps:

```bash
git clone <repo-url>
cd Booty-Flutter

# Backend dependencies
cd backend
npm install
cp .env.example .env  # populate with real values

# Flutter app dependencies
cd ../frontend
flutter pub get
```

### Environment Configuration

Backend expects an `.env` file based on `backend/.env.example`. Typical variables include:

- `PORT` – API port.
- `MONGODB_URI` – MongoDB connection string.
- WooCommerce API keys.
- Firebase service account paths for cloud messaging (if used).

Frontend configuration is handled via `lib` constants and Firebase options in `frontend/lib/firebase_options.dart`. Update these files with your environment-specific values.

## Running Locally

1. Start the backend:

    ```bash
    cd backend
    npm run dev
    ```

2. In a separate terminal, run the Flutter app on your chosen device/emulator:

    ```bash
    cd frontend
    flutter run
    ```

## Testing

- Backend: `npm test` (add tests under `backend/tests`).
- Frontend: `flutter test` (widget and integration tests live under `frontend/test`).

## Deployment Notes

- Containerization or cloud deployment should run the backend as a service connected to your production database and WooCommerce store.
- Distribute the Flutter app via the appropriate stores (Google Play, Apple App Store) or web hosting. Follow Flutter's official deployment guides for packaging.

## Contributing

1. Create a branch for your change.
2. Run formatting and tests for both frontend and backend.
3. Submit a pull request describing your changes and any required environment updates.

## Additional Resources

- Backend specifics: `backend/README.md`
- Flutter-specific docs: `frontend/README.md`
- Flutter documentation: <https://docs.flutter.dev>
- Node.js documentation: <https://nodejs.org/en/docs>


