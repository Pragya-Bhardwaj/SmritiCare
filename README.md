# SmritiCare

SmritiCare is a caregiver–patient web app for dementia support, bringing reminders, medications, memories, and safety tracking into one calm flow.

## Features
- Patient/caregiver roles with email OTP verification and password reset
- Caregiver–patient linking via invite codes
- Reminders with optional Google Calendar sync
- Medication schedules for linked patients
- Memory board with image/audio/video uploads (Cloudinary)
- Location tracking with safe zones and email alerts
- Self-care tips for patients and caregivers

## Tech
Node.js, Express, MongoDB (Mongoose), EJS + HTML/CSS/JS, Cloudinary, Mapbox, Google Calendar API, Nodemailer, Multer.

## Quick Start
1. `npm install`
2. Create `.env` (see below)
3. `npm run dev` (or `npm start` / `start-local.bat`)
Open `http://localhost:3000`.

## Environment Variables
Required:
- `MONGO_URI`
- `SESSION_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`

Optional / feature-specific:
- `PORT`
- `NODE_ENV`
- `MAPBOX_ACCESS_TOKEN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `APP_URL` or `APP_BASE_URL`
