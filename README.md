# ✈ Mbogi Angani — Realtime Crash Game

Full-stack crash game with real-time WebSocket sync, powered by Node.js + Socket.io.

---

## 🗂 Project Structure

```
mbogi-angani/
├── server.js           ← Game engine (Node.js + Socket.io)
├── package.json
├── railway.toml        ← Railway deployment config
└── public/
    ├── index.html      ← Game page (players)
    └── admin.html      ← Control room (you only)
```

---

## 🚀 Deploy to Railway (FREE — Step by Step)

### Step 1 — Create GitHub account
Go to https://github.com and create a free account if you don't have one.

### Step 2 — Create a new repository
1. Click the **+** icon → **New repository**
2. Name it: `mbogi-angani`
3. Set to **Public**
4. Click **Create repository**

### Step 3 — Upload your files
You can use GitHub's web interface:
1. Click **Add file** → **Upload files**
2. Upload `server.js`, `package.json`, `railway.toml`
3. Create a folder called `public` and upload `index.html` and `admin.html` inside it
4. Click **Commit changes**

### Step 4 — Deploy on Railway
1. Go to https://railway.app
2. Click **Start a New Project**
3. Choose **Deploy from GitHub repo**
4. Authorize GitHub and select your `mbogi-angani` repo
5. Railway will auto-detect Node.js and deploy!
6. Click **Settings → Networking → Generate Domain**
7. Your URL will be something like: `mbogi-angani-production.up.railway.app`

### Step 5 — Access your game
- **Game page:** `https://your-url.up.railway.app/`
- **Admin panel:** `https://your-url.up.railway.app/admin.html`

---

## 🔐 Passwords & Secrets

| What          | Value         | Location         |
|---------------|---------------|------------------|
| Game password | `Paosiduo`    | server.js line 15 & index.html |
| Admin login   | `Paosiduo`    | server.js line 15 & admin.html |
| Admin panel PIN (old) | `2244` | Removed — replaced by server auth |

**To change the password**, edit line 15 in `server.js`:
```js
const ADMIN_PASSWORD = 'YourNewPassword';
```
And update the same value in `admin.html` at the bottom:
```js
const PASSWORD = 'YourNewPassword';
```

---

## 🎮 Admin Panel Features

Open `/admin.html` on your browser. Log in with your admin password.

| Feature | What it does |
|---------|-------------|
| **Live Status** | See current phase, multiplier, countdown, and — crucially — the **next crash point** (only visible to you) |
| **Force Start** | Skip countdown, start the round immediately |
| **Force Crash** | Stop the plane mid-flight at current multiplier |
| **Set Crash Point** | Set exactly when the next round will crash (e.g. 1.50x or 50.00x) |
| **Quick Chips** | One-tap preset crash points |
| **House Edge Slider** | Control how often early crashes happen (0% = player friendly, 100% = house wins) |
| **Sequence Planner** | Pre-set crash points for the next 5 rounds in advance |
| **Activity Log** | Real-time log of all phase changes and your admin actions |

---

## ⚙️ How it Works

```
Server (Node.js)
  │
  ├── Runs the game loop: Betting (5s countdown) → Flying → Crashed
  ├── Generates crash point (or uses your override)
  ├── Broadcasts state via Socket.io every 100ms
  └── Listens for admin commands

Players (index.html)
  └── Connect via Socket.io → receive state updates → animate in sync

Admin (admin.html)
  └── Connect via Socket.io → authenticate → send commands to server
```

All browsers see **the same game** in real time.

---

## 🛠 Local Testing

```bash
# Install dependencies
npm install

# Start server
npm start

# Open in browser:
# http://localhost:3000        ← game
# http://localhost:3000/admin.html  ← admin
```

---

## 📝 Customization

### Change game speed
In `server.js`, find `const BASE_RATE = 0.09` — increase for faster multiplier growth.

### Change countdown duration  
In `server.js`, find `state.countdown = 5` — change 5 to any seconds.

### Change brand name
Search and replace `Mbogi Angani` in `index.html` and `admin.html`.

---

## ⚠️ Important Notes

- The crash point shown in the admin panel is **only visible to you** — players cannot see it
- The "LIVE" dot on the game page shows green when connected to the server
- If the server restarts, all players auto-reconnect within seconds
- Railway free tier keeps your server running 24/7 (no sleep!)
