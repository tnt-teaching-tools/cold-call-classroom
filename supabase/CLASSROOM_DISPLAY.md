# Paired classroom display

Open `display.html` on the laptop before projecting. Create the QR code, scan it with the phone, tap Connect this phone and confirm the matching six-digit code on the laptop. Keep both browser pages open and the phone awake. Devices may use different networks.

Classes must already be saved on the phone. This is a remote display, not class synchronisation. Use the existing JSON backup transfer if needed.

Only the selected name/initial, avatar, timer, pupil prompt and optional round counts enter `cleanSnapshot`. Outcomes, lists, attendance and history are excluded. The browser encrypts every update using AES-256-GCM with a fresh 96-bit IV. The relay never receives the encryption key. DOM output uses textContent.

A separate random 256-bit reader token and one-use pairing token are generated on the display device. The phone claims the pairing token once and substitutes its own 256-bit writer token. Tokens are hashed with SHA-256 in a non-exposed, RLS-protected table. Public RPC wrappers run as SECURITY INVOKER and call narrowly scoped token-checking functions in the private schema. No table access is granted to API roles. Sequence numbers reject old writes. The laptop explicitly activates the claimed phone before writes are allowed.

Credentials are held in tab sessionStorage for reload recovery, removed on disconnect, and kept out of class backups and analytics. Pairing links carry credentials in the fragment, stripped before analytics runs. Anyone with the initial code can claim it, so pair before projecting and verify the code matches the teacher phone.

The display polls once per second; the phone publishes changes with a four-second heartbeat. After fifteen seconds without phone updates, the display clears the pupil content. After a connection interruption it retries; ending either side deletes the relay record when online. Sessions expire in two hours and pg_cron purges expired rows every fifteen minutes. Supabase technical logs/backups follow its own retention policies.

Schema setup: `supabase/classroom-display.sql`. Do not add direct SELECT/INSERT/UPDATE grants or a permissive RLS policy to the session table. The publishable key is the existing public project key; no secret or service role key belongs in browser code.
