const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.static(path.join(__dirname, 'public')));

// ════════════════════════════════════════════════════
//  GAME STATE
// ════════════════════════════════════════════════════
const BETTING = 'betting';
const FLYING  = 'flying';
const CRASHED = 'crashed';

const ADMIN_PASSWORD = 'Paosiduo';   // change this!
const ADMIN_PIN      = '2244';       // panel PIN

let state = {
  phase:      BETTING,
  multiplier: 1.00,
  crashPoint: null,
  roundNum:   1,
  countdown:  5,
  houseEdge:  0.35,
  history:    [2.14, 1.43, 8.72, 1.07, 45.3, 3.21, 1.88, 2.66, 1.15, 12.4],
  startedAt:  null,
  adminOverride: null,   // next forced crash value
  seqQueue:   [],        // sequence of crash points to apply round by round
  connectedPlayers: 0,
};

// ════════════════════════════════════════════════════
//  CRASH POINT GENERATOR
// ════════════════════════════════════════════════════
function genCrash(houseEdge = 0.35) {
  // Sequence queue takes first priority
  if (state.seqQueue.length > 0) {
    const v = state.seqQueue.shift();
    io.to('admins').emit('admin:state', buildAdminState());
    return v;
  }
  if (state.adminOverride !== null) {
    const v = state.adminOverride;
    state.adminOverride = null;
    return v;
  }
  // Edge formula: 0=player-friendly (rare early crashes), 1=brutal (frequent early crashes)
  // Thresholds scale linearly with houseEdge so behaviour is predictable at all values
  const r = Math.random();
  const e = Math.max(0.05, Math.min(0.95, houseEdge)); // clamp to avoid degenerate extremes
  const t1 = 0.15 * e;           // ~1.0x–1.3x bust zone
  const t2 = t1 + 0.20 * e;     // ~1.3x–1.8x zone
  const t3 = t2 + 0.30;         // ~1.8x–3.5x mid zone (fixed weight)
  const t4 = t3 + 0.20;         // ~3x–10x zone
  const t5 = t4 + 0.10 * (1-e); // ~10x–40x zone (shrinks as edge rises)
  const t6 = t5 + 0.05 * (1-e); // ~40x–100x zone
  if (r < t1)  return parseFloat((1.01 + Math.random() * 0.29).toFixed(2));
  if (r < t2)  return parseFloat((1.3  + Math.random() * 0.50).toFixed(2));
  if (r < t3)  return parseFloat((1.8  + Math.random() * 1.70).toFixed(2));
  if (r < t4)  return parseFloat((3.5  + Math.random() * 6.5 ).toFixed(2));
  if (r < t5)  return parseFloat((10   + Math.random() * 30  ).toFixed(2));
  if (r < t6)  return parseFloat((40   + Math.random() * 60  ).toFixed(2));
  return parseFloat((100 + Math.random() * 300).toFixed(2));
}

// ════════════════════════════════════════════════════
//  GAME LOOP
// ════════════════════════════════════════════════════
let countdownInterval = null;
let flyInterval       = null;
let flyStart          = null;
const BASE_RATE       = 0.09;

function broadcast() {
  io.emit('state', {
    phase:      state.phase,
    multiplier: state.multiplier,
    crashPoint: state.crashPoint,
    roundNum:   state.roundNum,
    countdown:  state.countdown,
    houseEdge:  state.houseEdge,
    history:    state.history,
    connectedPlayers: state.connectedPlayers,
  });
}

function stopAll() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  if (flyInterval)       { clearInterval(flyInterval);       flyInterval = null; }
}

function startBetting() {
  stopAll();
  state.phase      = BETTING;
  state.multiplier = 1.00;
  state.crashPoint = genCrash(state.houseEdge);
  state.roundNum  += 1;
  state.countdown  = 5;
  state.startedAt  = null;

  broadcast();

  let t = 5;
  countdownInterval = setInterval(() => {
    t = parseFloat((t - 0.1).toFixed(1));
    state.countdown = Math.max(0, t);
    broadcast();
    if (t <= 0.05) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      startFlying();
    }
  }, 100);
}

function startFlying() {
  stopAll();
  state.phase     = FLYING;
  state.multiplier = 1.00;
  state.startedAt  = Date.now();
  broadcast();

  flyInterval = setInterval(() => {
    const elapsed = (Date.now() - state.startedAt) / 1000;
    let m = Math.exp(BASE_RATE * elapsed);
    if (m > 50) {
      const over = m - 50;
      m = 50 + over * Math.pow(1 + over / 80, 1.6);
    }
    m = parseFloat(Math.min(m, state.crashPoint).toFixed(2));
    state.multiplier = m;

    if (m >= state.crashPoint) {
      doCrash();
    } else {
      broadcast();
    }
  }, 100);
}

function doCrash() {
  stopAll();
  state.phase      = CRASHED;
  state.multiplier = state.crashPoint;
  state.history    = [...state.history.slice(-29), state.crashPoint];
  broadcast();
  setTimeout(startBetting, 3200);
}

// ════════════════════════════════════════════════════
//  SOCKET.IO
// ════════════════════════════════════════════════════
io.on('connection', (socket) => {
  state.connectedPlayers = io.engine.clientsCount;
  broadcast();

  // Send full state immediately on connect
  socket.emit('state', {
    phase:       state.phase,
    multiplier:  state.multiplier,
    crashPoint:  state.crashPoint,
    roundNum:    state.roundNum,
    countdown:   state.countdown,
    houseEdge:   state.houseEdge,
    history:     state.history,
    connectedPlayers: state.connectedPlayers,
  });

  // ── ADMIN AUTH — step 1: password ──
  socket.on('admin:auth', ({ password }, cb) => {
    if (password === ADMIN_PASSWORD) {
      socket.data = socket.data || {};
      socket.data.pwOk = true;  // password verified, awaiting PIN
      cb({ ok: true });
    } else {
      cb({ ok: false });
    }
  });

  // ── ADMIN AUTH — step 2: PIN ──
  socket.on('admin:authPin', ({ pin }, cb) => {
    if (socket.data && socket.data.pwOk && String(pin) === String(ADMIN_PIN)) {
      socket.data.pwOk = false;
      socket.join('admins');
      cb({ ok: true });
      socket.emit('admin:state', buildAdminState());
    } else {
      cb({ ok: false });
    }
  });

  // ── ADMIN: SET CRASH POINT ──
  socket.on('admin:setCrash', ({ value }) => {
    if (!socket.rooms.has('admins')) return;
    const v = parseFloat(value);
    if (isNaN(v) || v < 1.01) return;
    state.adminOverride = v;

    if (state.phase === FLYING) {
      // force crash now at current multiplier
      stopAll();
      const cur = state.multiplier;
      state.crashPoint = cur;
      state.phase      = CRASHED;
      state.history    = [...state.history.slice(-29), cur];
      broadcast();
      io.to('admins').emit('admin:state', buildAdminState());
      setTimeout(startBetting, 3200);
    } else {
      // will apply next round
      state.crashPoint = v;
      broadcast();
      io.to('admins').emit('admin:state', buildAdminState());
    }
  });

  // ── ADMIN: SET HOUSE EDGE ──
  socket.on('admin:setEdge', ({ value }) => {
    if (!socket.rooms.has('admins')) return;
    const v = parseFloat(value);
    if (isNaN(v) || v < 0 || v > 1) return;
    state.houseEdge = v;
    broadcast();
    io.to('admins').emit('admin:state', buildAdminState());
  });

  // ── ADMIN: FORCE START ──
  socket.on('admin:forceStart', () => {
    if (!socket.rooms.has('admins')) return;
    if (state.phase === BETTING) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      state.countdown = 0;
      broadcast();
      startFlying();
    }
  });

  // ── ADMIN: FORCE CRASH ──
  socket.on('admin:forceCrash', () => {
    if (!socket.rooms.has('admins')) return;
    if (state.phase === FLYING) {
      stopAll();
      const cur = state.multiplier;
      state.crashPoint = cur;
      state.phase      = CRASHED;
      state.history    = [...state.history.slice(-29), cur];
      broadcast();
      io.to('admins').emit('admin:state', buildAdminState());
      setTimeout(startBetting, 3200);
    }
  });

  // ── ADMIN: SET OVERRIDE (next round only) ──
  socket.on('admin:setOverride', ({ value }) => {
    if (!socket.rooms.has('admins')) return;
    const v = parseFloat(value);
    if (isNaN(v) || v < 1.01) return;
    state.adminOverride = v;
    if (state.phase === BETTING) {
      state.crashPoint = v;
      broadcast();
    }
    io.to('admins').emit('admin:state', buildAdminState());
  });

  // ── ADMIN: SET SEQUENCE ──
  socket.on('admin:setSequence', ({ values }) => {
    if (!socket.rooms.has('admins')) return;
    const valid = (values || []).map(v => parseFloat(v)).filter(v => !isNaN(v) && v >= 1.01);
    if (valid.length === 0) return;
    state.seqQueue = valid;
    // Apply first value to current betting phase immediately
    if (state.phase === BETTING) {
      state.crashPoint = state.seqQueue[0];
      broadcast();
    }
    io.to('admins').emit('admin:state', buildAdminState());
  });

  socket.on('disconnect', () => {
    state.connectedPlayers = io.engine.clientsCount;
    broadcast();
  });
});

function buildAdminState() {
  const avg  = state.history.length > 0
    ? (state.history.reduce((a, b) => a + b, 0) / state.history.length).toFixed(2)
    : '-';
  const busts    = state.history.filter(h => h < 2).length;
  const bustPct  = state.history.length > 0
    ? ((busts / state.history.length) * 100).toFixed(0)
    : 0;

  return {
    phase:         state.phase,
    multiplier:    state.multiplier,
    crashPoint:    state.crashPoint,
    roundNum:      state.roundNum,
    houseEdge:     state.houseEdge,
    history:       state.history,
    adminOverride: state.adminOverride,
    seqQueue:      state.seqQueue,
    countdown:     state.countdown,
    connectedPlayers: state.connectedPlayers,
    stats: { avg, bustPct },
  };
}

// ════════════════════════════════════════════════════
//  KICK OFF
// ════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Mbogi Angani server running on port ${PORT}`);
  console.log(`   Game:  http://localhost:${PORT}`);
  console.log(`   Admin: http://localhost:${PORT}/admin.html\n`);
  startBetting();
});
