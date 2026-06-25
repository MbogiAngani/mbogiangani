const express   = require('express');
const http      = require('http');
const { Server }= require('socket.io');
const path      = require('path');
const crypto    = require('crypto');
const bcrypt    = require('bcryptjs');
const { Pool }  = require('pg');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ════════════════════════════════════════════════════
//  DATABASE
// ════════════════════════════════════════════════════
const DB_URL = process.env.DATABASE_URL;
const pool = DB_URL ? new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
}) : null;
const dbReady = { ok: false };


async function initDB() {
  if(!pool){ console.log('⚠️  No DATABASE_URL — running without database (data will not persist)'); return; }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      phone       TEXT PRIMARY KEY,
      username    TEXT NOT NULL,
      password    TEXT NOT NULL,
      balance     INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS referrals (
      code        TEXT PRIMARY KEY,
      owner_phone TEXT NOT NULL,
      bonus       INTEGER NOT NULL DEFAULT 20,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS referral_uses (
      code        TEXT NOT NULL,
      used_phone  TEXT NOT NULL,
      used_at     TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (code, used_phone)
    );
    CREATE TABLE IF NOT EXISTS user_limits (
      phone           TEXT PRIMARY KEY,
      deposit_limit   INTEGER NOT NULL DEFAULT 2000,
      loss_limit      INTEGER NOT NULL DEFAULT 2000,
      daily_deposit   INTEGER NOT NULL DEFAULT 0,
      daily_loss      INTEGER NOT NULL DEFAULT 0,
      limit_date      TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS bet_history (
      id          SERIAL PRIMARY KEY,
      phone       TEXT NOT NULL,
      round_num   INTEGER NOT NULL,
      bet_amount  INTEGER NOT NULL,
      cashout_at  NUMERIC,
      win_amount  INTEGER,
      result      TEXT NOT NULL,
      played_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  dbReady.ok = true;
  console.log('✅ Database ready');
}

// ── DB HELPERS ──────────────────────────────────────
async function getUser(phone) {
  if(!dbReady.ok) return null;
  const r = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
  return r.rows[0] || null;
}
async function createUser(phone, username, hashedPw, startBalance=0) {
  await pool.query(
    'INSERT INTO users(phone,username,password,balance) VALUES($1,$2,$3,$4)',
    [phone, username, hashedPw, startBalance]
  );
  return getUser(phone);
}
async function updateBalance(phone, balance) {
  await pool.query('UPDATE users SET balance=$1 WHERE phone=$2', [balance, phone]);
}
async function getLimits(phone) {
  const today = new Date().toDateString();
  let r = await pool.query('SELECT * FROM user_limits WHERE phone=$1', [phone]);
  if (!r.rows[0]) {
    await pool.query(
      'INSERT INTO user_limits(phone,limit_date) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [phone, today]
    );
    r = await pool.query('SELECT * FROM user_limits WHERE phone=$1', [phone]);
  }
  const lim = r.rows[0];
  // Reset daily counters if new day
  if (lim.limit_date !== today) {
    await pool.query(
      'UPDATE user_limits SET daily_deposit=0, daily_loss=0, limit_date=$1 WHERE phone=$2',
      [today, phone]
    );
    lim.daily_deposit = 0; lim.daily_loss = 0; lim.limit_date = today;
  }
  return lim;
}

// ════════════════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════════════════
const BETTING        = 'betting';
const FLYING         = 'flying';
const CRASHED        = 'crashed';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Paosiduo';
const ADMIN_PIN      = process.env.ADMIN_PIN      || '2244';

// ════════════════════════════════════════════════════
//  CHAT (in-memory last 80 msgs — bots + real hidden)
// ════════════════════════════════════════════════════
const chatLog = [];

function addChat(username, text, isBot=false) {
  const msg = { id: Date.now()+Math.random(), username, text, isBot, ts: Date.now() };
  chatLog.push(msg);
  if(chatLog.length > 80) chatLog.shift();
  // Only emit bot messages to all clients — real messages are hidden
  if(isBot) io.emit('chat', msg);
}

// ════════════════════════════════════════════════════
//  GAME STATE
// ════════════════════════════════════════════════════
let state = {
  phase:      BETTING,
  multiplier: 1.00,
  crashPoint: null,
  roundNum:   1,
  countdown:  5,
  houseEdge:  0.35,
  history:    [2.14,1.43,8.72,1.07,45.3,3.21,1.88,2.66,1.15,12.4],
  startedAt:  null,
  adminOverride: null,
  seqQueue:   [],
  connectedPlayers: 0,
  serverSeed: '',
  serverHash: '',
};

// ════════════════════════════════════════════════════
//  PROVABLY FAIR
// ════════════════════════════════════════════════════
function newSeed() {
  state.serverSeed = crypto.randomBytes(16).toString('hex');
  state.serverHash = crypto.createHash('sha256').update(state.serverSeed).digest('hex');
}

// ════════════════════════════════════════════════════
//  CRASH POINT GENERATOR
// ════════════════════════════════════════════════════
function genCrash(houseEdge=0.35) {
  if(state.seqQueue.length > 0) {
    const v = state.seqQueue.shift();
    io.to('admins').emit('admin:state', buildAdminState());
    return v;
  }
  if(state.adminOverride !== null) {
    const v = state.adminOverride; state.adminOverride = null; return v;
  }
  const r = Math.random();
  const e = Math.max(0.05, Math.min(0.95, houseEdge));
  const t1 = 0.15*e, t2=t1+0.20*e, t3=t2+0.30, t4=t3+0.20, t5=t4+0.10*(1-e), t6=t5+0.05*(1-e);
  if(r<t1) return parseFloat((1.01+Math.random()*0.29).toFixed(2));
  if(r<t2) return parseFloat((1.3+Math.random()*0.50).toFixed(2));
  if(r<t3) return parseFloat((1.8+Math.random()*1.70).toFixed(2));
  if(r<t4) return parseFloat((3.5+Math.random()*6.5).toFixed(2));
  if(r<t5) return parseFloat((10+Math.random()*30).toFixed(2));
  if(r<t6) return parseFloat((40+Math.random()*60).toFixed(2));
  return parseFloat((100+Math.random()*300).toFixed(2));
}

// ════════════════════════════════════════════════════
//  LIVE BOTS — same identities power both the "All Bets"
//  table and chat reactions, all tied to the real round
// ════════════════════════════════════════════════════
const BOT_NAMES = [
  // OG 24
  'Kamau_G','Wanjiku01','MburuWave','Akinyi_X','Otieno254','Njoro_Fly',
  'SharonMtaa','BrianOG','GraceKali','JojoWapi','MercySheng','PatoVibes',
  'EstherFlip','SamuelB','NaivaFlyer','KipsangBet','WinniePesa','DennoKsh',
  'TotoWa254','Ciku_Real','BobbyMtaa','AmyFlip','SteveKe','LucyVibes',
  // Batch 2
  'Njuguna_X','FaithWahu','KibiraFlip','OmondiGo','TracyNai','DavidMtaa',
  'MwasKe254','NancyVibes','JosphatBet','AnnWanjiku','PeterOdhis','RoseFlip',
  'CalvinSheng','JudithPesa','FredMbogi','AliceKali','MaxOtis','ZippyNrb',
  'TrevorKsh','NelsonBet','PhilipFlip','BeatriceFly','SamsonWave','MillyVibes',
  // Batch 3
  'KenyanKing','NairobiGal','ShengMaster','JetFlyer254','CrashKing01','HoldBro',
  'CashoutQueen','PesaFlip','MtaaLegend','BetKing254','FlyHighKe','WinnerWahu',
  'Hustler254','NjuguBet','ManyattaFly','KiberaKid','EastlandsG','WestlandsV',
  'SouthCFlip','UpperHillK','KarenVibes','RuiruBet','JujaBoy','ThikaBoss',
  // Batch 4
  'MombiBoy','MtaaniKid','Ngugi_Fly','ChepsiBet','HalfTimeKe','JamiiFlip',
  'KennyWave','LoisNrb','MikaBoss','NjokiReal','OchiengBet','PruVibes',
  'QuinsonKe','RachelFlip','SimonMtaa','TinaMbogi','UlrichBet','VioletKali',
  'WilsonOG','XandraFly','YusufBet','ZoeVibes','AbelFlip','BarnabasPesa',
  // Batch 5
  'CalebKsh','DeborahNai','EliudFly','FlorenceWin','GideonBet','HannahKe',
  'IanMtaa','JaneFlip','KaluluBoss','LewisVibes','MabelSheng','NathanKali',
  'OlgaBet','PascalFly','QuincyKe','RebeccaWin','SolomonBet','TabithaOG',
  'UriahFlip','VeronicaPesa','WalterMtaa','XimenaKsh','YasminVibes','ZachFly',
  // Batch 6
  'AdrianKe','BrendaNai','ClementBet','DianeFly','EmanuelKsh','FidaVibes',
  'GabrielFlip','HelenaWin','IsaacMtaa','JoycePesa','KennethBet','LilianFly',
  'MartinKali','NorahOG','OswaldSheng','PenelopeKe','RafaelBet','StellaVibes',
  'TimothyFlip','UrsulaNai','VictorWin','WendyKsh','XavierMtaa','YollandaBet',
  // Batch 7
  'Zipporah_Fly','AaronKe','BethaniBoss','CyrusPesa','DelilahBet','EnochFly',
  'FinnVibes','GloriaSheng','HezekiahKsh','IsabellaWin','JeremiahFlip','KimaniOG',
  'LavinaMtaa','MalachiBet','NadiaKe','ObadiahFly','PortiaPesa','QuintinKali',
  'RubyVibes','SeraphinaBet','TitoFlip','UrikaKsh','ValentineWin','WanjalaOG',
  // Batch 8 — more street/sheng style
  'Cess_Ke','Drix254','Flexx_Nrb','Gee_Mtaa','Hype_Ke','Jae_Fly',
  'Kry_Bet','Lax_Pesa','Mex_Ksh','Nax_Vibes','Oxx_Flip','Pex_Win',
  'Qua_Boss','Rex_OG','Sax_Kali','Tax_Sheng','Ux_Nai','Vex_Bet',
  'Wax_Fly','Xen_Ke','Yen_Pesa','Zex_Flip','Ace_Mtaa','Bex_Ksh',
  // Batch 9
  'Chip_254','Drop_Ke','Envy_Fly','Fire_Bet','Glow_Pesa','Haze_Win',
  'Icy_Kali','Jolt_OG','Kush_Sheng','Lyte_Nai','Maze_Flip','Nova_Ke',
  'Onyx_Bet','Pixl_Ksh','Quake_Fly','Rave_Pesa','Skye_Win','Tide_Mtaa',
  'Urge_Bet','Volt_Ke','Wave_Fly','Xero_Ksh','Yung_Pesa','Zero_OG',
  // Batch 10
  'Afro_Ke','Blaze_Bet','Crypt_Fly','Dope_Win','Echo_Pesa','Faze_Kali',
  'Grind_OG','Hood_Sheng','Ink_Nai','Jive_Ke','Kool_Bet','Loot_Fly',
  'Myth_Ksh','Neon_Pesa','Orbit_Win','Plug_Mtaa','Quest_Bet','Rush_Ke',
  'Sync_Fly','Trap_OG','Unit_Kali','Vibe_Sheng','Woke_Nai','Xprt_Bet',
];
// per-round bot count — picks a random subset so table looks fresh every round
const BOT_COUNT_MIN = 22;
const BOT_COUNT_MAX = 38;
const BOT_AVATARS = ['🧑','👱','👩','🧔','👧','🧑‍💼','👨‍💻','👩‍💼','🧑‍🎤','👦','👩‍🦰','🧑‍🦱'];

function mkLiveBot(name) {
  // assign each bot a fixed target cashout multiplier at creation
  const r = Math.random();
  const target = r<0.55 ? 1.1+Math.random()*1.8 : r<0.80 ? 3+Math.random()*4 : r<0.93 ? 7+Math.random()*13 : 20+Math.random()*80;
  return {
    id: Math.random(),
    name,
    av: BOT_AVATARS[Math.floor(Math.random()*BOT_AVATARS.length)],
    bet: (Math.floor(Math.random()*50)+1)*10,
    target: parseFloat(target.toFixed(2)),
    cashout: null,
    lost: false,
  };
}
function mkLiveBots() {
  const count = BOT_COUNT_MIN + Math.floor(Math.random() * (BOT_COUNT_MAX - BOT_COUNT_MIN + 1));
  return shuffle(BOT_NAMES).slice(0, count).map(mkLiveBot);
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
let liveBots = mkLiveBots();
let milestonesHit = new Set();
let cashoutChatBudget = 5;
const MILESTONES = [2, 5, 10, 20, 50, 100, 200];

// ════════════════════════════════════════════════════
//  BOT CHAT ENGINE — reacts to the real round in real time
// ════════════════════════════════════════════════════
function fmtM(x){ return parseFloat(x).toFixed(2); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function fillTemplate(tpl, m){ return tpl.replace('{m}', fmtM(m)); }

// Ambient banter — no hardcoded numbers, just flavor/mood
const AMBIENT_BETTING = [
  'wacha nieka 200 hii round💸','aki nakaa niamini hii ni yetu🙏',
  'bro unapanga kueka ngapi?','hii game inaniua pole pole😂',
  'nalala na 500 this time','aki mimi niko broke already lmao',
  'mimi betting small, trauma imeniambia','Manze lazima nicash out early',
  'watu mnaenda kwa bet gani?','aki nifanye budget calculation kwanza😭',
  'niko ready kulipa deni yangu leo','hii ndiyo round ya kwanza yangu leo',
  'trust the process bro','hii round niko na feeling kubwa',
  'aki naomba tu usicrash haraka🙏','sijui mbona naendelea kushinda😂',
  'server leo iko na huruma naona','leo niko focused hakuna distraction',
  'nimefanya deposit mpya niko fresh','this round feels different guys',
  'strategy yangu ni cash out early kila wakati','I always say small bets but then...'
];
const AMBIENT_FLYING = [
  'GO GO GO🚀','toa toa!!','HOLD HOLD HOLD💪','aki nikatoe sasa?',
  'inakuja... inakuja...','bro cashout umelala??😭','TOOOA SASA!!',
  'aki niko scared😰','HOLD... hold...','nimeshout out tayari🔥',
  'bro hold bana!!','sijui kama nikatoe au nihold','smart move!!',
  'aki crash itakuja sasa hivi naona','TOOOA SASA BRO',
  'crash inakuja nahisi mwili wangu😭','hold... almost... almost...',
  'guys im holding... pray for me😂','hold sisters!! trust the plane✈️',
  'bana hold kidogo tu','aki nimepoteza moyo kuhold','toa bana crash itakuja'
];
const AMBIENT_CRASHED = [
  'aiiii😭😭😭','aki nilichelewa tena😩','manze crash ilinichoma',
  'next round lazima niwe smart','crash game ni hivi hivi tu',
  'aki naanza tena from scratch😩','next one ndio yetu fr fr',
  'hahaha nilifanya dumb decision','server ni mjanja kuliko sisi sote',
  'round hii ilikuwa fast sana','GG round mbaya sana','next time beb pole',
  'next round naenda kubig bet','hata mimi. round ya karibu',
  'aki hii ni trauma ya kweli💀','always next time sis','sawa sawa next round',
  'pole wote waliochomeka next round','aki server haina huruma leo',
  'crash came so fast aki','GG everyone better luck next',
  'my heart bana crash inakuwa fast','lesson ya leo: cashout early always'
];
// Reactive templates — {m} is filled with the real live number
const MILESTONE_LINES = [
  '{m}x tayari!! HOLD bana💪','aki {m}x already??😳',
  'inakuja... tunafika {m}x...','bado niko ndani... {m}x...',
  '{m}x na bado inapanda🚀','sasa hivi tunavuka {m}x',
  '{m}x?? bro hii ni kweli','niko ndani mpaka {m}x😤'
];
const CASHOUT_WIN_LINES = [
  '{m}x NIKATOA NIMESHINDA🎉','nimeshout {m}x yesss',
  'sawa nimekatoa at {m}x😅','nimekatoa at {m}x pole sana mapema',
  '{m}x tu lakini pesa ni pesa🙌','nilishout {m}x nikaona inatosha'
];
const CRASH_LOSE_LINES = [
  'ilianguka kwa {m}x😭😭😭','aki crash ilikuja kwa {m}x naskia vibaya',
  'nilikuwa nikiwait then {m}x ikaja crash💀','manze {m}x ilinichoma',
  'sikuamini ingeanguka kwa {m}x','nilihold mpaka {m}x kumbe ndio mwisho😩'
];
const CRASH_WIN_LINES = [
  'nimeshinda nilikatoa at {m}x🙌','nimetoka na {m}x naskia poa',
  '{m}x ilikuwa enough kwangu leo','niliskia tu kukatoa at {m}x, poa kabisa'
];
const LAST_ROUND_LINES = [
  'ile ya juzi {m}x ilikuwa noma!','naskia last round ilikuwa {m}x manze',
  'mtu alipata {m}x last round, bahati mbaya sikuwa naweka'
];

let botTimers = [];
function clearBotTimers(){ botTimers.forEach(t=>clearTimeout(t)); botTimers=[]; }
function scheduleBotReaction(name, text, delayMs=0) {
  const t = setTimeout(() => addChat(name, text, true), delayMs);
  botTimers.push(t);
}

function scheduleBotChat(phase) {
  clearBotTimers();
  const pool = phase==='flying' ? AMBIENT_FLYING : phase==='betting' ? AMBIENT_BETTING : AMBIENT_CRASHED;
  const count = phase==='flying'
    ? 2+Math.floor(Math.random()*4)   // 2-5 during flight
    : 1+Math.floor(Math.random()*3);  // 1-3 during betting/crash

  const picked = [];
  const used = new Set();
  while(picked.length < count && picked.length < pool.length) {
    const idx = Math.floor(Math.random()*pool.length);
    if(!used.has(idx)){ used.add(idx); picked.push(pool[idx]); }
  }

  let delay = 400 + Math.random()*600;
  picked.forEach(text => {
    scheduleBotReaction(pick(BOT_NAMES), text, delay);
    delay += phase==='flying'
      ? 700 + Math.random()*1300
      : 1500 + Math.random()*3000;
  });

  // Occasionally reference the real previous-round crash while betting
  if (phase === 'betting' && state.history.length && Math.random() < 0.5) {
    const prevCrash = state.history[state.history.length-1];
    scheduleBotReaction(pick(BOT_NAMES), fillTemplate(pick(LAST_ROUND_LINES), prevCrash), delay + 300);
  }
}

// ════════════════════════════════════════════════════
//  GAME LOOP
// ════════════════════════════════════════════════════
let countdownInterval=null, flyInterval=null, flyStart=null;
const BASE_RATE=0.09;

function broadcast() {
  io.emit('state', {
    phase: state.phase, multiplier: state.multiplier,
    crashPoint: state.crashPoint, roundNum: state.roundNum,
    countdown: state.countdown, houseEdge: state.houseEdge,
    history: state.history, connectedPlayers: state.connectedPlayers,
    serverHash: state.serverHash, startedAt: state.startedAt,
    bots: liveBots,
  });
}
function stopAll() {
  if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}
  if(flyInterval){clearInterval(flyInterval);flyInterval=null;}
}
function startBetting() {
  stopAll(); newSeed();
  state.phase=BETTING; state.multiplier=1.00;
  state.crashPoint=genCrash(state.houseEdge);
  state.roundNum+=1; state.countdown=5; state.startedAt=null;
  liveBots = mkLiveBots();
  milestonesHit = new Set();
  cashoutChatBudget = 5;
  broadcast();
  scheduleBotChat('betting');
  let t=5;
  countdownInterval=setInterval(()=>{
    t=parseFloat((t-0.1).toFixed(1));
    state.countdown=Math.max(0,t);
    broadcast();
    if(t<=0.05){ clearInterval(countdownInterval); countdownInterval=null; startFlying(); }
  },100);
}
function startFlying() {
  stopAll();
  state.phase=FLYING; state.multiplier=1.00; state.startedAt=Date.now();
  broadcast();
  scheduleBotChat('flying');
  flyInterval=setInterval(()=>{
    const elapsed=(Date.now()-state.startedAt)/1000;
    let m=Math.exp(BASE_RATE*elapsed);
    if(m>50){const over=m-50;m=50+over*Math.pow(1+over/80,1.6);}
    m=parseFloat(Math.min(m,state.crashPoint).toFixed(2));
    state.multiplier=m;

    // Live bot cashouts — tied to the real multiplier as it happens
    for (const bot of liveBots) {
      if (bot.cashout || bot.lost) continue;
      const reached = m >= bot.target;
      const earlyChance = m > 1.3 ? 0.01 : 0;
      if (reached || Math.random() < earlyChance) {
        bot.cashout = parseFloat(Math.min(m, bot.target).toFixed(2));
        if (cashoutChatBudget > 0 && Math.random() < 0.35) {
          cashoutChatBudget--;
          scheduleBotReaction(bot.name, fillTemplate(pick(CASHOUT_WIN_LINES), bot.cashout), 100+Math.random()*500);
        }
      }
    }

    // Live milestone reactions — fired exactly as the real multiplier crosses each line
    for (const ms of MILESTONES) {
      if (m >= ms && !milestonesHit.has(ms)) {
        milestonesHit.add(ms);
        scheduleBotReaction(pick(BOT_NAMES), fillTemplate(pick(MILESTONE_LINES), ms), 100+Math.random()*400);
      }
    }

    if(m>=state.crashPoint) doCrash(); else broadcast();
  },100);
}
function doCrash() {
  stopAll();
  const revealedSeed=state.serverSeed;
  state.phase=CRASHED; state.multiplier=state.crashPoint;
  state.history=[...state.history.slice(-29),state.crashPoint];

  // Resolve remaining bot bets against the real crash point
  const losers = [], winners = [];
  for (const bot of liveBots) {
    if (bot.cashout) winners.push(bot);
    else { bot.lost = true; losers.push(bot); }
  }

  io.emit('seed:reveal',{serverSeed:revealedSeed,serverHash:state.serverHash,crashPoint:state.crashPoint});
  broadcast();
  scheduleBotChat('crashed');

  // A few bots react with the real crash value / their real cashout
  let delay = 600 + Math.random()*500;
  shuffle(losers).slice(0,4).forEach(bot => {
    scheduleBotReaction(bot.name, fillTemplate(pick(CRASH_LOSE_LINES), state.crashPoint), delay);
    delay += 700 + Math.random()*900;
  });
  shuffle(winners).slice(0,2).forEach(bot => {
    scheduleBotReaction(bot.name, fillTemplate(pick(CRASH_WIN_LINES), bot.cashout), delay);
    delay += 700 + Math.random()*900;
  });

  setTimeout(startBetting,3200);
}

// ════════════════════════════════════════════════════
//  SOCKET.IO
// ════════════════════════════════════════════════════
io.on('connection', (socket) => {
  state.connectedPlayers=io.engine.clientsCount;
  broadcast();
  socket.emit('state',{
    phase:state.phase,multiplier:state.multiplier,crashPoint:state.crashPoint,
    roundNum:state.roundNum,countdown:state.countdown,houseEdge:state.houseEdge,
    history:state.history,connectedPlayers:state.connectedPlayers,serverHash:state.serverHash,
    startedAt:state.startedAt, bots:liveBots,
  });
  // Send recent bot chat history on connect
  socket.emit('chat:history', chatLog.filter(m=>m.isBot).slice(-20));

  // ── AUTH ──
  socket.on('admin:auth',({password},cb)=>{
    if(typeof cb!=='function')return;
    if(password===ADMIN_PASSWORD){socket.data.pwOk=true;cb({ok:true});}
    else cb({ok:false,msg:'Wrong password'});
  });
  socket.on('admin:authPin',({pin},cb)=>{
    if(typeof cb!=='function')return;
    if(socket.data.pwOk&&String(pin).trim()===String(ADMIN_PIN)){
      socket.data.pwOk=false;socket.join('admins');
      cb({ok:true});socket.emit('admin:state',buildAdminState());
    } else cb({ok:false,msg:socket.data.pwOk?'Wrong PIN':'Authenticate first'});
  });

  // ── CHAT: real user messages stored but NOT broadcast ──
  socket.on('chat:msg',({username,text})=>{
    if(!username||!text)return;
    const clean=String(text).slice(0,120).trim();
    if(!clean)return;
    addChat(username, clean, false); // isBot=false → stored but not emitted to clients
  });

  // ── ADMIN COMMANDS ──
  socket.on('admin:setCrash',({value})=>{
    if(!socket.rooms.has('admins'))return;
    const v=parseFloat(value); if(isNaN(v)||v<1.01)return;
    state.adminOverride=v;
    if(state.phase===FLYING){
      stopAll();const cur=state.multiplier;state.crashPoint=cur;
      state.phase=CRASHED;state.history=[...state.history.slice(-29),cur];
      broadcast();io.to('admins').emit('admin:state',buildAdminState());
      setTimeout(startBetting,3200);
    } else {state.crashPoint=v;broadcast();io.to('admins').emit('admin:state',buildAdminState());}
  });
  socket.on('admin:setEdge',({value})=>{
    if(!socket.rooms.has('admins'))return;
    const v=parseFloat(value);if(isNaN(v)||v<0||v>1)return;
    state.houseEdge=v;broadcast();io.to('admins').emit('admin:state',buildAdminState());
  });
  socket.on('admin:forceStart',()=>{
    if(!socket.rooms.has('admins'))return;
    if(state.phase===BETTING){clearInterval(countdownInterval);countdownInterval=null;state.countdown=0;broadcast();startFlying();}
  });
  socket.on('admin:forceCrash',()=>{
    if(!socket.rooms.has('admins'))return;
    if(state.phase===FLYING){
      stopAll();const cur=state.multiplier;state.crashPoint=cur;
      state.phase=CRASHED;state.history=[...state.history.slice(-29),cur];
      broadcast();io.to('admins').emit('admin:state',buildAdminState());
      setTimeout(startBetting,3200);
    }
  });
  socket.on('admin:setOverride',({value})=>{
    if(!socket.rooms.has('admins'))return;
    const v=parseFloat(value);if(isNaN(v)||v<1.01)return;
    state.adminOverride=v;
    if(state.phase===BETTING){state.crashPoint=v;broadcast();}
    io.to('admins').emit('admin:state',buildAdminState());
  });
  socket.on('admin:setSequence',({values})=>{
    if(!socket.rooms.has('admins'))return;
    const valid=(values||[]).map(v=>parseFloat(v)).filter(v=>!isNaN(v)&&v>=1.01);
    if(!valid.length)return;
    state.seqQueue=valid;
    if(state.phase===BETTING){state.crashPoint=state.seqQueue[0];broadcast();}
    io.to('admins').emit('admin:state',buildAdminState());
  });
  socket.on('disconnect',()=>{
    state.connectedPlayers=io.engine.clientsCount;broadcast();
  });
});

function buildAdminState() {
  const avg=state.history.length>0?(state.history.reduce((a,b)=>a+b,0)/state.history.length).toFixed(2):'-';
  const busts=state.history.filter(h=>h<2).length;
  const bustPct=state.history.length>0?((busts/state.history.length)*100).toFixed(0):0;
  return {phase:state.phase,multiplier:state.multiplier,crashPoint:state.crashPoint,
    roundNum:state.roundNum,houseEdge:state.houseEdge,history:state.history,
    adminOverride:state.adminOverride,seqQueue:state.seqQueue,countdown:state.countdown,
    connectedPlayers:state.connectedPlayers,stats:{avg,bustPct}};
}

// ════════════════════════════════════════════════════
//  REST API
// ════════════════════════════════════════════════════

// DB guard middleware for auth/balance routes
const requireDB = (req,res,next) => {
  if(!dbReady.ok) return res.json({ok:false,msg:'Database not ready yet. Try again in a moment.'});
  next();
};

// ── Auth ──
app.post('/api/register', requireDB, async (req,res)=>{
  try {
    const {phone,username,password,dob,referralCode}=req.body||{};
    if(!phone||!username||!password) return res.json({ok:false,msg:'Missing fields'});
    const existing=await getUser(phone);
    if(existing) return res.json({ok:false,msg:'Phone already registered'});
    const hash=await bcrypt.hash(password,10);
    let startBal=0;
    // Apply referral bonus
    if(referralCode){
      const ref=await pool.query('SELECT * FROM referrals WHERE code=$1',[referralCode]);
      if(ref.rows[0]&&ref.rows[0].owner_phone!==phone){
        const already=await pool.query('SELECT 1 FROM referral_uses WHERE code=$1 AND used_phone=$2',[referralCode,phone]);
        if(!already.rows[0]){
          startBal+=ref.rows[0].bonus;
          await pool.query('INSERT INTO referral_uses(code,used_phone) VALUES($1,$2)',[referralCode,phone]);
          await pool.query('UPDATE users SET balance=balance+$1 WHERE phone=$2',[ref.rows[0].bonus,ref.rows[0].owner_phone]);
        }
      }
    }
    const user=await createUser(phone,username,hash,startBal);
    res.json({ok:true,user:{phone:user.phone,username:user.username,balance:user.balance}});
  } catch(e){console.error(e);res.json({ok:false,msg:'Server error'});}
});

app.post('/api/login', requireDB, async (req,res)=>{
  try {
    const {phone,password}=req.body||{};
    if(!phone||!password) return res.json({ok:false,msg:'Missing fields'});
    const user=await getUser(phone);
    if(!user) return res.json({ok:false,msg:'Phone not registered'});
    const match=await bcrypt.compare(password,user.password);
    if(!match) return res.json({ok:false,msg:'Wrong password'});
    res.json({ok:true,user:{phone:user.phone,username:user.username,balance:user.balance}});
  } catch(e){console.error(e);res.json({ok:false,msg:'Server error'});}
});

// ── Balance ──
app.get('/api/balance/:phone', requireDB, async (req,res)=>{
  try {
    const user=await getUser(req.params.phone);
    if(!user) return res.json({ok:false});
    res.json({ok:true,balance:user.balance});
  } catch(e){res.json({ok:false});}
});

app.post('/api/balance', requireDB, async (req,res)=>{
  try {
    const {phone,balance}=req.body||{};
    if(!phone||balance===undefined) return res.json({ok:false});
    await updateBalance(phone,balance);
    res.json({ok:true});
  } catch(e){res.json({ok:false});}
});

// ── Referrals ──
app.post('/api/referral/create', async (req,res)=>{
  try {
    const {phone}=req.body||{};
    if(!phone) return res.json({ok:false});
    let r=await pool.query('SELECT * FROM referrals WHERE owner_phone=$1',[phone]);
    let code=r.rows[0]?.code;
    if(!code){
      code=phone.slice(-4)+Math.random().toString(36).slice(2,6).toUpperCase();
      await pool.query('INSERT INTO referrals(code,owner_phone,bonus) VALUES($1,$2,$3)',[code,phone,20]);
    }
    const host = req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const baseUrl = proto.includes('https') ? `https://${host}` : `http://${host}`;
    res.json({ok:true,code,link:`${baseUrl}?ref=${code}`});
  } catch(e){res.json({ok:false});}
});

// ── Limits ──
app.get('/api/limits/:phone', async (req,res)=>{
  try {
    const lim=await getLimits(req.params.phone);
    res.json({ok:true,depositLimit:lim.deposit_limit,lossLimit:lim.loss_limit,
      dailyDeposit:lim.daily_deposit,dailyLoss:lim.daily_loss});
  } catch(e){res.json({ok:false});}
});

app.post('/api/limits/set', async (req,res)=>{
  try {
    const {phone,depositLimit,lossLimit}=req.body||{};
    if(!phone) return res.json({ok:false});
    await getLimits(phone); // ensure row exists + reset if new day
    if(depositLimit!==undefined)
      await pool.query('UPDATE user_limits SET deposit_limit=$1 WHERE phone=$2',[Math.max(500,Math.min(500000,parseInt(depositLimit))),phone]);
    if(lossLimit!==undefined)
      await pool.query('UPDATE user_limits SET loss_limit=$1 WHERE phone=$2',[Math.max(500,Math.min(500000,parseInt(lossLimit))),phone]);
    const lim=await getLimits(phone);
    res.json({ok:true,depositLimit:lim.deposit_limit,lossLimit:lim.loss_limit});
  } catch(e){res.json({ok:false});}
});

app.post('/api/limits/record-loss', async (req,res)=>{
  try {
    const {phone,amount}=req.body||{};
    if(!phone) return res.json({ok:false});
    await getLimits(phone);
    await pool.query('UPDATE user_limits SET daily_loss=daily_loss+$1 WHERE phone=$2',[parseInt(amount)||0,phone]);
    const lim=await getLimits(phone);
    res.json({ok:true,blocked:lim.daily_loss>=lim.loss_limit});
  } catch(e){res.json({ok:false});}
});

// ── Chat history ──
app.get('/api/chat', (req,res)=>res.json({ok:true,messages:chatLog.filter(m=>m.isBot).slice(-30)}));

// ── Secret admin route ──
app.get('/control-room-mbo254',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('/admin.html',(req,res)=>res.status(404).send('Not found'));

// ════════════════════════════════════════════════════
//  KICK OFF
// ════════════════════════════════════════════════════
const PORT=process.env.PORT||3000;
server.listen(PORT, async ()=>{
  console.log(`\n🚀 Mbogi Angani running on port ${PORT}`);
  // Start game immediately — DB connects in background
  startBetting();
  initDB().catch(e => console.error('DB init error:', e.message));
});