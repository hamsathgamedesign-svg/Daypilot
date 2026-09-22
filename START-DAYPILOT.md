# DayPilot local startup

1. In `server`, run `npm install` (or `npm ci`).
2. In `server`, run `npm run dev`.
3. In a second terminal, in `daypilot-app`, run `npm install` (or `npm ci`).
4. In `daypilot-app`, run `npm run dev`.
5. Open the Vite URL shown in the terminal (normally http://localhost:5173).

Admin login:
- Hamsath / HamNihal
- Nihal / HamNihal

The server reads `server/.env`; the admin password is stored there as a scrypt hash. The local frontend uses `http://localhost:4000` for the API.

Do not commit `server/.env` or `daypilot-app/.env` to GitHub.
