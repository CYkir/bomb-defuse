# Bomb Defuse — Game Server

Standalone Node/Express/Socket.IO/SQLite server for the Bomb Defuse booth game.

The web app (this Lovable project) is the **frontend only** — the TV screen and
each player's phone. This tiny server is what makes them talk to each other
over your local WiFi and stores the leaderboard.

## Requirements

- Node.js 18 or newer
- A laptop at the booth on the same WiFi as every player's phone and the TV

## Setup

From this `server/` folder:

```bash
npm install
npm start
```

You should see:

```
💣  Bomb Defuse server listening on http://0.0.0.0:3001
```

The server listens on port `3001`. It creates `bomb-defuse.sqlite` in this
folder to store the leaderboard.

## Point the web app at this server

1. Find your laptop's LAN IP (System Settings → Network, or `ipconfig` /
   `ifconfig`). Example: `192.168.1.42`.
2. On every device (TV browser and each phone), open the web app, click the
   **Server** setting at the bottom of the home page, and enter:
   ```
   http://192.168.1.42:3001
   ```
3. Save. That URL is remembered per device.

For a booth setup we recommend also serving the built web app from the same
laptop (any static host works — e.g. `npx serve dist` after `npm run build`),
so phones can scan the TV's QR code and load everything from one machine.

## Booth flow

1. On the booth laptop, load `/admin` on the TV screen → creates a room and
   shows the giant QR code.
2. Players scan the QR with their phones → land on `/join?code=XXXX` → enter
   nickname → press READY.
3. When 2–4 players are all READY, the host presses **Start Mission** on the
   TV.
4. Every phone shows one private clue. Team talks, cuts wires. TV is the
   spectacle.
5. Win/lose is recorded to SQLite for the leaderboard.

## Reset

Delete `bomb-defuse.sqlite` to wipe the leaderboard.
