# StudyFlow companion relay

Run the relay with Node.js 24. Set `STUDYFLOW_RELAY_ENROLLMENT_KEY` to a private random base64url string of at least 32 characters, and set `STUDYFLOW_RELAY_DB` to a SQLite path on persistent storage. Start it with `node server/companion/start.mjs`.

The service listens on loopback port 8475 by default. A production deployment must put it behind an HTTPS reverse proxy. Pass through the Authorization header and avoid logging it or request bodies. The enrollment key is entered only in the Windows app. Share the resulting single-use pairing code and relay address with the phone.

Windows Settings includes **Mobile companion**. Create a pairing code, enter it on Android, and use **Share calendar** on Windows and **Sync calendar** on Android after desktop edits. Android retains the last calendar it fetched for offline reading. The desktop can revoke pairing from Settings. Pairing codes have a ten-minute lifetime.

Run the relay tests with `node --test server/companion/relay.test.mjs`.
