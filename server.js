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
//  BOT CHAT ENGINE
// ════════════════════════════════════════════════════
const BOT_NAMES = [
  'Kamau_G','Wanjiku01','MburuWave','Akinyi_X','Otieno254','Njoro_Fly',
  'SharonMtaa','BrianOG','GraceKali','JojoWapi','MercySheng','PatoVibes',
  'EstherFlip','SamuelB','NaivaFlyer','KipsangBet','WinniePesa','DennoKsh',
  'TotoWa254','Ciku_Real','BobbyMtaa','AmyFlip','SteveKe','LucyVibes'
];

const BOT_MSGS = {
  betting: [
    ['Njoro_Fly','wacha nieka 200 hii round'],
    ['Wanjiku01','aki nakaa niamini hii ni yetu 🙏'],
    ['MburuWave','bro unapanga kueka ngapi?'],
    ['Otieno254','hii game inaniua pole pole 😂'],
    ['SharonMtaa','nalala na 500 this time'],
    ['BrianOG','round hii naona inafika 5x'],
    ['GraceKali','aki mimi niko broke already lmao'],
    ['JojoWapi','tunaeza pata 10x leo?'],
    ['PatoVibes','Last round ilinichoma vibaya sana 😭'],
    ['KipsangBet','naskia server ilisema 50x next 👀'],
    ['WinniePesa','mimi betting small, trauma imeniambia'],
    ['DennoKsh','vibes zangu zinasema 3x hii round'],
    ['TotoWa254','Manze hii round lazima nicash out early'],
    ['Ciku_Real','watu mnaenda kwa bet gani?'],
    ['BobbyMtaa','sijui kama hii ni smart but... 500 iko'],
    ['AmyFlip','aki nifanye budget calculation kwanza 😭'],
    ['SteveKe','niko ready kulipa deni yangu leo'],
    ['LucyVibes','hii ndiyo round ya kwanza yangu leo'],
    ['Kamau_G','@Njoro_Fly wewe daima unasema hivyo bro 😂'],
    ['Akinyi_X','@Wanjiku01 trust the process sis'],
    ['MercySheng','@BrianOG 5x? ukweli? nitakuambia baadaye'],
    ['EstherFlip','last round nilikimbia at 1.3 naskia peke yangu'],
    ['SamuelB','@PatoVibes same bro nikiambia trauma ni real'],
    ['NaivaFlyer','100 tu hii round, heart yangu haiwezi'],
    ['Otieno254','@DennoKsh vibes au data? 😂'],
  ],
  flying: [
    ['Kamau_G','GO GO GO 🚀'],
    ['Wanjiku01','toa toa!!'],
    ['MburuWave','cashout at 2x bro!!'],
    ['BrianOG','HOLD HOLD HOLD 💪'],
    ['GraceKali','aki nikatoe sasa?'],
    ['Otieno254','inakuja... inakuja...'],
    ['SharonMtaa','bro cashout umelala?? 😭'],
    ['JojoWapi','TOOOA SASA!!'],
    ['PatoVibes','2x tayari naendelea 💪'],
    ['KipsangBet','aki niko scared 😰'],
    ['WinniePesa','3x!! toa toa toa!!'],
    ['DennoKsh','HOLD... hold...'],
    ['TotoWa254','nimeshout out tayari 🔥'],
    ['Ciku_Real','sawa nimekatoa at 2.5 😅'],
    ['BobbyMtaa','@BrianOG bro hold bana!!'],
    ['AmyFlip','aki 4x already??'],
    ['SteveKe','nimeshout 5x yesss'],
    ['LucyVibes','sijui kama nikatoe au nihold'],
    ['Njoro_Fly','5x NIKATOA NIMESHINDA 🎉'],
    ['Akinyi_X','@Njoro_Fly smart move!!'],
    ['MercySheng','bado niko ndani... 6x...'],
    ['EstherFlip','aki crash itakuja sasa hivi naona'],
    ['SamuelB','7x?? bro uongo'],
    ['NaivaFlyer','mimi nimekatoa at 1.8 pole sana'],
    ['Kamau_G','@MercySheng TOOOA SASA BRO'],
    ['Wanjiku01','crash inakuja nahisi mwili wangu 😭'],
    ['Otieno254','nimeshout 2x naenda kuomba dua'],
    ['BrianOG','hold... almost... almost...'],
  ],
  crashed: [
    ['Kamau_G','aiiii 😭😭😭'],
    ['Wanjiku01','aki nilichelewa tena 😩'],
    ['MburuWave','manze crash ilinichoma'],
    ['Akinyi_X','nilikatoa at 1.2 naskia vibaya'],
    ['Otieno254','LOL nilikuwa nataka 10x 💀'],
    ['SharonMtaa','next round lazima niwe smart'],
    ['BrianOG','nikakatoa at 3x 🙌 nimeshinda!'],
    ['GraceKali','crash game ni hivi hivi tu'],
    ['JojoWapi','aki naanza tena from scratch 😩'],
    ['PatoVibes','next one ndio yetu fr fr'],
    ['KipsangBet','hahaha nilifanya dumb decision'],
    ['WinniePesa','@Kamau_G same bro uchungu'],
    ['DennoKsh','server ni mjanja kuliko sisi sote'],
    ['TotoWa254','nimepoteza 300 😭 aki'],
    ['Ciku_Real','@Njoro_Fly ulikimbia mapema sana!'],
    ['BobbyMtaa','round hii ilikuwa fast sana'],
    ['AmyFlip','nilikuwa nimesema 5x lakini...'],
    ['SteveKe','GG round mbaya sana'],
    ['LucyVibes','@BrianOG pole sana bro'],
    ['Njoro_Fly','nimeshinda 200 leo naskia poa'],
    ['MercySheng','aki nilichomeka mbaya sana 😭😭'],
    ['EstherFlip','@MercySheng next time beb pole'],
    ['SamuelB','next round naenda kubig bet'],
    ['NaivaFlyer','hata mimi. round ya karibu'],
    ['Kamau_G','aki hii ni trauma ya kweli 💀'],
    ['Wanjiku01','@PatoVibes always next time sis'],
    ['Otieno254','nilikimbia at 1.5 naskia poooole'],
    ['BrianOG','sawa sawa next round'],
  ],
};

let botTimers = [];
function clearBotTimers(){ botTimers.forEach(t=>clearTimeout(t)); botTimers=[]; }

function scheduleBotChat(phase) {
  clearBotTimers();
  const pool = BOT_MSGS[phase] || [];
  if(!pool.length) return;

  // Pick 2-6 messages depending on phase, randomised
  const count = phase==='flying'
    ? 2+Math.floor(Math.random()*5)   // 2-6 during flight
    : 1+Math.floor(Math.random()*4);  // 1-4 during betting/crash

  const picked = [];
  const used = new Set();
  while(picked.length < count && picked.length < pool.length) {
    const idx = Math.floor(Math.random()*pool.length);
    if(!used.has(idx)){ used.add(idx); picked.push(pool[idx]); }
  }

  // Stagger them naturally — flying is faster
  let delay = 400 + Math.random()*600;
  picked.forEach(([name, text]) => {
    const t = setTimeout(() => {
      addChat(name, text, true);
    }, delay);
    botTimers.push(t);
    delay += phase==='flying'
      ? 600 + Math.random()*1200
      : 1500 + Math.random()*3000;
  });
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
    serverHash: state.serverHash,
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
    if(m>=state.crashPoint) doCrash(); else broadcast();
  },100);
}
function doCrash() {
  stopAll();
  const revealedSeed=state.serverSeed;
  state.phase=CRASHED; state.multiplier=state.crashPoint;
  state.history=[...state.history.slice(-29),state.crashPoint];
  io.emit('seed:reveal',{serverSeed:revealedSeed,serverHash:state.serverHash,crashPoint:state.crashPoint});
  broadcast();
  scheduleBotChat('crashed');
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
