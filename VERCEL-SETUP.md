# DayPilot — Vercel setup

1. Import this repository into Vercel. No terminal commands are required.
2. Vercel will install `daypilot-app` and build it with the included `vercel.json`.
3. In Firebase Console, enable **Authentication → Sign-in method → Email/Password**.
4. Deploy the included `database.rules.json` to the DayPilot Realtime Database.
5. Optional Vercel environment variables for admin customization:
   - `ADMIN_USERNAMES=Hamsath,Nihal`
   - `ADMIN_PASSWORD_HASH=<scrypt salt:hash>`
6. The checked-in fallback hash supports the requested admin password `HamNihal` if those variables are not set. For a production deployment, set your own stronger hash in Vercel Environment Variables.

The normal user **Sign Up** flow creates a Firebase Authentication account and stores the DayPilot data under that Firebase user's UID in Realtime Database. The frontend uses relative `/api/...` routes, so it does not point at localhost on Vercel.
