# DayPilot

## Vercel deployment
Import this repository into Vercel. The included `vercel.json` installs and builds the `daypilot-app` automatically; you do not need to run terminal commands in Vercel.

## Firebase
Enable **Authentication → Sign-in method → Email/Password** in Firebase. Deploy `database.rules.json` to the DayPilot Realtime Database. The normal Sign Up flow uses Firebase Authentication and stores each user's DayPilot data under their Firebase UID.

## Admin
The built-in admin credentials are:
- Hamsath / HamNihal
- Nihal / HamNihal

For production, set `ADMIN_USERNAMES` and a stronger `ADMIN_PASSWORD_HASH` in Vercel Environment Variables. The frontend never contains the plaintext admin password.

## Optional AI
Set `OPENAI_API_KEY` in Vercel Environment Variables to enable the DayPilot AI assistant. `OPENAI_MODEL` can optionally override the default model.
