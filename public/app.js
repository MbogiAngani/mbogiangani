const {
  useState,
  useEffect,
  useRef,
  useCallback
} = React;
const BETTING = 'betting',
  FLYING = 'flying',
  CRASHED = 'crashed';

/* ── SIMPLE IN-MEMORY USER STORE (persists via localStorage) ── */
function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem('ma_users') || '[]');
  } catch {
    return [];
  }
}
function saveUsers(u) {
  localStorage.setItem('ma_users', JSON.stringify(u));
}
function loadSession() {
  try {
    return JSON.parse(localStorage.getItem('ma_session') || 'null');
  } catch {
    return null;
  }
}
function saveSession(u) {
  localStorage.setItem('ma_session', JSON.stringify(u));
}
function clearSession() {
  localStorage.removeItem('ma_session');
}

/* ── PHONE VALIDATION ── */
function isValidSafaricom(phone) {
  let clean = phone.replace(/[\s\-]/g, '').replace(/^\+/, '');
  // Normalize: 07xx -> 2547xx, 7xx (10 digits starting 7) -> 2547xx, 01xx -> 25401xx
  if (/^0[17]/.test(clean)) clean = '254' + clean.slice(1);else if (/^[17][0-9]{8}$/.test(clean)) clean = '254' + clean;
  return /^254(7(0[0-9]|1[0-9]|2[0-9]|4[0-3]|4[5-9]|5[7-9]|6[8-9]|7[0-9]|9[0-9])|1(0[0-9]|1[0-9]))[0-9]{6}$/.test(clean);
}
function formatPhone(phone) {
  let clean = phone.replace(/[\s\-]/g, '').replace(/^\+/, '');
  if (/^0[17]/.test(clean)) clean = '254' + clean.slice(1);else if (/^[17][0-9]{8}$/.test(clean)) clean = '254' + clean;
  return '+' + clean;
}
const NAMES = ['Alex K.', 'Maria S.', 'John D.', 'Priya M.', 'Luca R.', 'Sara T.', 'Omar B.', 'Zoe W.', 'Mike P.', 'Anna L.', 'Pavel K.', 'Liu X.', 'Ravi J.', 'Nina O.', 'Carlos F.', 'Aisha N.', 'Tomas V.', 'Kemi B.', 'Jomo W.', 'Fatima H.', 'Brian O.', 'Sharon N.', 'Kevin M.', 'Grace W.', 'Dennis K.', 'Mercy J.', 'Patrick A.', 'Esther L.', 'Samuel T.', 'Winnie B.', 'Victor H.', 'Cynthia R.', 'George F.', 'Beatrice O.', 'Peter M.', 'Jacqueline N.', 'Emmanuel K.', 'Vivian S.', 'Joseph W.', 'Catherine A.', 'Daniel L.', 'Agnes B.', 'Michael T.', 'Elizabeth H.', 'Robert F.', 'Judith O.', 'David N.', 'Irene K.', 'Charles M.', 'Lilian W.', 'Francis A.', 'Doris L.', 'Andrew B.', 'Hellen T.', 'James F.', 'Rose O.', 'Isaac N.', 'Purity K.', 'Stephen M.', 'Gladys W.', 'Philip A.', 'Edith L.', 'Moses B.', 'Hannah T.', 'Joshua F.', 'Lydia O.', 'Caleb N.', 'Miriam K.', 'Elijah M.', 'Naomi W.', 'Nathan A.', 'Ruth L.', 'Simon B.', 'Esther T.', 'Timothy F.', 'Deborah O.', 'Benjamin N.', 'Sarah K.', 'Abraham M.', 'Rachel W.', 'Jacob A.', 'Leah L.', 'Isaac B.', 'Rebecca T.', 'Joel F.', 'Mary O.', 'Amos N.', 'Dorcas K.', 'Hosea M.', 'Priscilla W.', 'Ezra A.', 'Lydia L.', 'Nehemiah B.', 'Tabitha T.', 'Gideon F.', 'Jael O.', 'Samson N.', 'Delilah K.', 'Solomon M.', 'Sheba W.', 'Nando F.', 'Kendi O.', 'Zawadi N.', 'Amani K.', 'Baraka M.', 'Imani W.', 'Jua A.', 'Furaha L.', 'Upendo B.', 'Amara T.', 'Zuri F.', 'Adaeze O.', 'Chidi N.', 'Ngozi K.', 'Emeka M.', 'Nneka W.', 'Obinna A.', 'Chioma L.', 'Oluwaseun T.', 'Adeyemi F.', 'Folake O.', 'Toyin N.', 'Segun K.', 'Bukola M.', 'Taiwo W.', 'Kehinde A.'];
const AVATARS = ['🧑', '👱', '👩', '🧔', '👧', '🧑‍💼', '👨‍💻', '👩‍💼', '🧑‍🎤', '👦', '👩‍🦰', '🧑‍🦱'];
const rn = () => NAMES[Math.floor(Math.random() * NAMES.length)];
const ra = () => AVATARS[Math.floor(Math.random() * AVATARS.length)];
function mColor(m) {
  return m < 2 ? '#60A5FA' : m < 10 ? '#C084FC' : '#F472B6';
}
function mBg(m) {
  return m < 2 ? '#1E3A5F' : m < 10 ? '#3B1F5E' : '#5E1F3B';
}
function mkBet() {
  return {
    id: Math.random(),
    name: rn(),
    av: ra(),
    bet: (Math.floor(Math.random() * 50) + 1) * 10,
    cashout: null,
    lost: false
  };
}
const socket = io();

/* ════════════ BOT CHAT SYSTEM ════════════ */
const BOT_NAMES = ['Kamau_G', 'Wanjiku01', 'MburuWave', 'Akinyi_X', 'Otieno254', 'Njoro_Fly', 'SharonMtaa', 'BrianOG', 'GraceKali', 'JojoWapi', 'MercySheng', 'PatoVibes', 'EstherFlip', 'SamuelB', 'NaivaFlyer', 'KipsangBet', 'WinniePesa', 'DennoKsh', 'TotoWa254', 'Ciku_Real', 'BobbyMtaa', 'AmyFlip', 'SteveKe', 'LucyVibes', 'JamesPoa', 'FaithMtaa', 'PeterKe', 'AnneVibes', 'ChrisFlip', 'ZedKali', 'NandoG', 'KendiReal', 'BarakaMtaa', 'ImaniKe', 'JuaFlyer', 'FurahaG', 'Benja254', 'TraceyPoa', 'MikeMtaa', 'SylviaKe'];
const BOT_MSGS_BETTING = ['wacha nieka 200 hii round💸', 'aki nakaa niamini hii ni yetu🙏', 'bro unapanga kueka ngapi?', 'hii game inaniua pole pole😂', 'nalala na 500 this time', 'round hii naona inafika 5x', 'aki mimi niko broke already lmao', 'tunaeza pata 10x leo?', 'Last round ilinichoma vibaya sana😭', 'naskia server ilisema 50x next👀', 'mimi betting small, trauma imeniambia', 'vibes zangu zinasema 3x hii round', 'Manze lazima nicash out early', 'watu mnaenda kwa bet gani?', 'sijui kama hii ni smart but 500 iko', 'aki nifanye budget calculation kwanza😭', 'niko ready kulipa deni yangu leo', 'hii ndiyo round ya kwanza yangu leo', 'wewe daima unasema hivyo bro😂', 'trust the process bro', 'last round nilikimbia at 1.3 naskia peke yangu', '100 tu hii round heart yangu haiwezi', 'hii round niko na feeling kubwa', 'aki naomba tu usicrash haraka🙏', 'nimeweka 300 naskia viburi', 'round ya last ilikuwa 45x manze!', 'nimesema kesho but hapa nipo tena😂', '300 in naomba tu nikatoe at 2x', 'leo lazima nirudishe ya jana', 'sijui mbona naendelea kushinda😂', 'mimi niko na gut feeling 4x', 'server leo iko na huruma naona', 'aki kila wakati ninasema sitaweka mingi then...', 'leo niko focused hakuna distraction', 'nimefanya deposit mpya niko fresh', 'round hii naona ni ya watu wazima', 'I always say small bets but then...', 'this round feels different guys', 'okay okay 500 iko final answer', 'strategy yangu ni cash out at 2x kila wakati'];
const BOT_MSGS_FLYING = ['GO GO GO🚀', 'toa toa!!', 'cashout at 2x bro!!', 'HOLD HOLD HOLD💪', 'aki nikatoe sasa?', 'inakuja... inakuja...', 'bro cashout umelala??😭', 'TOOOA SASA!!', '2x tayari naendelea💪', 'aki niko scared😰', '3x!! toa toa toa!!', 'HOLD... hold...', 'nimeshout out tayari🔥', 'sawa nimekatoa at 2.5😅', 'bro hold bana!!', 'aki 4x already??', 'nimeshout 5x yesss', 'sijui kama nikatoe au nihold', '5x NIKATOA NIMESHINDA🎉', 'smart move!!', 'bado niko ndani... 6x...', 'aki crash itakuja sasa hivi naona', '7x?? bro uongo', 'mimi nimekatoa at 1.8 pole sana', 'TOOOA SASA BRO', 'crash inakuja nahisi mwili wangu😭', 'nimeshout 2x naenda kuomba dua', 'hold... almost... almost...', '2x nikatoa nimechoka kushinda😂', 'aki sis nimeshout at 1.5 pole', 'YESSSS 3x nimekula🔥🔥', 'hold hold hold... okay toa', 'aki inaenda juu sana manze', 'nimehold mpaka 4x aki nimechoka hold', 'toa bana crash itakuja', 'nimekatoa mapema tena😩', '5x nimeshout salamu', 'hold... hold... okay 2.5 bye', 'aki nilikuwa nahold mpaka 8x but...', 'sawa 2x ni pesa pia', '3x katoa 3x katoa!!', 'bana hold kidogo tu', 'aki nimepoteza moyo kuhold', 'niko tayari... 1.8... 2... toa!', 'aki nilikuwa nasema 5x then crash😭', 'nimeshout at 10x aki nimeenda mbinguni', 'hold sisters!! trust the plane✈️', '3.5x nikatoa naomba iende juu zaidi', 'aki nimeshout at 1.2 what was I thinking', 'KATOA SASA KATOA!!', 'guys im holding... pray for me😂'];
const BOT_MSGS_CRASHED = ['aiiii😭😭😭', 'aki nilichelewa tena😩', 'manze crash ilinichoma', 'nilikatoa at 1.2 naskia vibaya', 'LOL nilikuwa nataka 10x💀', 'next round lazima niwe smart', 'nikakatoa at 3x🙌 nimeshinda!', 'crash game ni hivi hivi tu', 'aki naanza tena from scratch😩', 'next one ndio yetu fr fr', 'hahaha nilifanya dumb decision', 'server ni mjanja kuliko sisi sote', 'nimepoteza 300😭 aki', 'ulikimbia mapema sana!', 'round hii ilikuwa fast sana', 'nilikuwa nimesema 5x lakini...', 'GG round mbaya sana', 'nimeshinda 200 leo naskia poa', 'aki nilichomeka mbaya sana😭😭', 'next time beb pole', 'next round naenda kubig bet', 'hata mimi. round ya karibu', 'aki hii ni trauma ya kweli💀', 'always next time sis', 'nilikimbia at 1.5 naskia poooole', 'sawa sawa next round', 'nilichomeka lakini niko sawa😂', 'aki sis niliomba plane iende mbali', 'manze 1.1x crash aki hii ni unyama', 'nimeshinda kidogo naenda kulipa fare', 'aki kila mtu anaomboleza pamoja😂', 'next round naenda all in naskia bold', 'sawa nimepoteza leo kesho nitarudi', 'aki nilichomeka round tano mfululizo😭', 'nimeshinda 5x nilifurahi sana', 'pole wote waliochomeka next round', 'round hii ilikuwa ya haraka sana', 'nimeshinda kidogo enough for now', 'aki server haina huruma leo', 'nimepoteza bet yangu yote😩', 'crash came so fast aki', 'GG everyone better luck next', 'I knew I shouldve cashed out at 3x😭', 'at least I got 2x guys', 'my heart bana crash inakuwa fast', 'lesson ya leo: cashout early always'];
let _botTimers = [];
function _clearBotTimers() {
  _botTimers.forEach(t => clearTimeout(t));
  _botTimers = [];
}
function _dispatchBotMsg(username, text) {
  // Push into chat via a custom event that ChatPanel listens to
  window.dispatchEvent(new CustomEvent('bot-chat', {
    detail: {
      id: Date.now() + Math.random(),
      username,
      text,
      isBot: true,
      ts: Date.now()
    }
  }));
}
function scheduleBotChat(phase) {
  _clearBotTimers();
  const pool = phase === 'flying' ? BOT_MSGS_FLYING : phase === 'betting' ? BOT_MSGS_BETTING : BOT_MSGS_CRASHED;
  const count = phase === 'flying' ? 4 + Math.floor(Math.random() * 6) : 3 + Math.floor(Math.random() * 4);
  const used = new Set();
  const picks = [];
  while (picks.length < count && picks.length < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (!used.has(i)) {
      used.add(i);
      picks.push([BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], pool[i]]);
    }
  }
  let delay = 500 + Math.random() * 500;
  picks.forEach(([name, text]) => {
    const t = setTimeout(() => _dispatchBotMsg(name, text), delay);
    _botTimers.push(t);
    delay += phase === 'flying' ? 600 + Math.random() * 1000 : 1000 + Math.random() * 2000;
  });
}

/* ════════════ SOUND ENGINE (Betika Aviator authentic) ════════════ */
const _AC = window.AudioContext || window.webkitAudioContext;
let _ctx = null;
let _eng = null;

function _getCtx() {
  if (!_ctx) { try { _ctx = new _AC(); } catch(e){} }
  if (_ctx && _ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ── Continuous twin-engine turbine (Betika style) ──
function _engineStart() {
  const c = _getCtx(); if (!c) return;
  _engineStop();
  const osc1 = c.createOscillator(), osc2 = c.createOscillator();
  const oscGain = c.createGain();
  osc1.type='sawtooth'; osc1.frequency.value=55;
  osc2.type='sawtooth'; osc2.frequency.value=58.5;
  oscGain.gain.setValueAtTime(0,c.currentTime);
  oscGain.gain.linearRampToValueAtTime(0.0095,c.currentTime+1.2);
  osc1.connect(oscGain); osc2.connect(oscGain); oscGain.connect(c.destination);
  osc1.start(); osc2.start();
  const buf=c.createBuffer(1,c.sampleRate*2,c.sampleRate);
  const bd=buf.getChannelData(0);
  for(let i=0;i<bd.length;i++) bd[i]=Math.random()*2-1;
  const noise=c.createBufferSource(); noise.buffer=buf; noise.loop=true;
  const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=160; bp.Q.value=1.4;
  const noiseGain=c.createGain();
  noiseGain.gain.setValueAtTime(0,c.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.0045,c.currentTime+1.8);
  noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(c.destination); noise.start();
  const whistle=c.createOscillator(); const wGain=c.createGain();
  whistle.type='sine'; whistle.frequency.value=820;
  wGain.gain.setValueAtTime(0,c.currentTime);
  wGain.gain.linearRampToValueAtTime(0.0016,c.currentTime+2.0);
  whistle.connect(wGain); wGain.connect(c.destination); whistle.start();
  _eng={osc1,osc2,oscGain,noise,noiseGain,whistle,wGain};
}
function _engineStop() {
  if(!_eng) return;
  try{_eng.osc1.stop();}catch(e){}
  try{_eng.osc2.stop();}catch(e){}
  try{_eng.noise.stop();}catch(e){}
  try{_eng.whistle.stop();}catch(e){}
  _eng=null;
}
function _engineUpdate(mult) {
  const c=_getCtx(); if(!c||!_eng) return;
  const f=55+Math.min(mult*11,240);
  _eng.osc1.frequency.setTargetAtTime(f,c.currentTime,0.3);
  _eng.osc2.frequency.setTargetAtTime(f+3.5,c.currentTime,0.3);
  _eng.oscGain.gain.setTargetAtTime(0.0072+Math.min(mult*0.0009,0.0113),c.currentTime,0.5);
  _eng.whistle.frequency.setTargetAtTime(820+Math.min(mult*18,600),c.currentTime,0.4);
  _eng.wGain.gain.setTargetAtTime(0.0011+Math.min(mult*0.00023,0.0025),c.currentTime,0.5);
  _eng.noiseGain.gain.setTargetAtTime(0.0036+Math.min(mult*0.00045,0.005),c.currentTime,0.6);
}

// ── Round start: 3 ascending beeps then engine spool ──
function playRoundStart() {
  const c=_getCtx(); if(!c) return;
  [440,554,659].forEach((freq,i)=>{
    const t=c.currentTime+i*0.13;
    const o=c.createOscillator(),g=c.createGain();
    o.type='sine'; o.frequency.value=freq;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(0.12,t+0.015);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.11);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t+0.13);
  });
  setTimeout(()=>_engineStart(),400);
}

// ── Crash: boom + falling whine ──
function playCrash() {
  const c=_getCtx(); if(!c) return;
  _engineStop();
  const blen=Math.floor(c.sampleRate*1.8);
  const bbuf=c.createBuffer(1,blen,c.sampleRate);
  const bd=bbuf.getChannelData(0);
  for(let i=0;i<blen;i++) bd[i]=(Math.random()*2-1)*Math.pow(1-i/blen,0.25);
  const bsrc=c.createBufferSource(); bsrc.buffer=bbuf;
  const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=500;
  const bg=c.createGain();
  bg.gain.setValueAtTime(0.58,c.currentTime);
  bg.gain.exponentialRampToValueAtTime(0.001,c.currentTime+1.6);
  bsrc.connect(lp); lp.connect(bg); bg.connect(c.destination); bsrc.start();
  const wo=c.createOscillator(),wg=c.createGain();
  wo.type='sawtooth';
  wo.frequency.setValueAtTime(480,c.currentTime);
  wo.frequency.exponentialRampToValueAtTime(30,c.currentTime+1.1);
  wg.gain.setValueAtTime(0.16,c.currentTime);
  wg.gain.exponentialRampToValueAtTime(0.001,c.currentTime+1.1);
  wo.connect(wg); wg.connect(c.destination); wo.start(); wo.stop(c.currentTime+1.2);
}

// ── Cashout: 3-note ascending WIN chime ──
function playCashout(mult) {
  const c=_getCtx(); if(!c) return;
  const base=Math.min(500+mult*22,1100);
  [[base,0],[base*1.26,0.11],[base*1.5,0.24]].forEach(([freq,delay])=>{
    const o=c.createOscillator(),g=c.createGain();
    o.type='sine'; o.frequency.value=freq;
    g.gain.setValueAtTime(0,c.currentTime+delay);
    g.gain.linearRampToValueAtTime(0.15,c.currentTime+delay+0.02);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+delay+0.32);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime+delay); o.stop(c.currentTime+delay+0.38);
  });
}

// ── Bet click ──
function playBet() {
  const c=_getCtx(); if(!c) return;
  const o=c.createOscillator(),g=c.createGain();
  o.type='sine'; o.frequency.value=620;
  g.gain.setValueAtTime(0.08,c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.055);
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.065);
}

// ── Countdown tick ──
function playCountdownTick() {
  const c=_getCtx(); if(!c) return;
  const o=c.createOscillator(),g=c.createGain();
  o.type='square'; o.frequency.value=400;
  g.gain.setValueAtTime(0.055,c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.055);
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.065);
}
/* ════════════ AUTH WALL ════════════ */
function AuthWall({
  onLogin,
  initialTab,
  onClose
}) {
  const [tab, setTab] = useState(initialTab || 'login');
  const [form, setForm] = useState({
    phone: '',
    username: '',
    password: '',
    confirm: '',
    dob: ''
  });
  const [msg, setMsg] = useState({
    text: '',
    ok: false
  });
  const [shake, setShake] = useState(false);
  function err(text) {
    setMsg({
      text,
      ok: false
    });
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }
  function handle(e) {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value
    }));
    setMsg({
      text: '',
      ok: false
    });
  }
  function doLogin() {
    if (!form.phone || !form.password) {
      err('Please fill all fields.');
      return;
    }
    if (!isValidSafaricom(form.phone)) {
      err('Enter a valid Safaricom number (07xx or 01xx).');
      return;
    }
    const users = loadUsers();
    const fmt = formatPhone(form.phone);
    const user = users.find(u => u.phone === fmt);
    if (!user) {
      err('No account found. Please register first.');
      return;
    }
    if (user.password !== form.password) {
      err('Incorrect password.');
      return;
    }
    const session = {
      ...user
    };
    saveSession(session);
    setMsg({
      text: 'Welcome back! Logging you in…',
      ok: true
    });
    setTimeout(() => onLogin(session), 1000);
  }
  function doRegister() {
    if (!form.phone || !form.username || !form.password || !form.confirm || !form.dob) {
      err('Please fill all fields.');
      return;
    }
    if (!isValidSafaricom(form.phone)) {
      err('Enter a valid Safaricom number (07xx or 01xx).');
      return;
    }
    if (form.password !== form.confirm) {
      err('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      err('Password must be at least 8 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      err('Password must contain letters and numbers (e.g. Ace2024).');
      return;
    }
    // Age check from DOB
    const dob = new Date(form.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || m === 0 && today.getDate() < dob.getDate()) age--;
    if (age < 18) {
      err('You must be 18 or older to register.');
      return;
    }
    const users = loadUsers();
    const fmt = formatPhone(form.phone);
    if (users.find(u => u.phone === fmt)) {
      err('This phone number is already registered.');
      return;
    }
    const newUser = {
      phone: fmt,
      username: form.username,
      password: form.password,
      balance: 10,
      createdAt: Date.now()
    };
    users.push(newUser);
    saveUsers(users);
    saveSession(newUser);
    setMsg({
      text: 'Account created! Welcome bonus of KES 10 added 🎉',
      ok: true
    });
    setTimeout(() => onLogin(newUser), 1200);
  }
  const inp = {
    width: '100%',
    background: '#0d0d1a',
    border: '1px solid #334155',
    color: '#F9FAFB',
    borderRadius: 9,
    padding: '11px 14px',
    fontSize: 13,
    outline: 'none',
    marginBottom: 10,
    fontFamily: 'inherit'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: onClose ? 0 : 16,
      minHeight: onClose ? 'unset' : '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: onClose ? 'transparent' : 'radial-gradient(ellipse at center,#0a0e1a 0%,#060810 100%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 400,
      animation: shake ? 'shake 0.4s ease' : 'none'
    }
  }, !onClose && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
      borderRadius: 12,
      padding: '8px 20px',
      boxShadow: '0 0 30px rgba(239,68,68,0.4)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "✈"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 900,
      fontSize: 18,
      letterSpacing: 3,
      color: '#fff'
    }
  }, "MBOGI ANGANI")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#4B5563',
      letterSpacing: 2
    }
  }, "CRASH GAME PLATFORM")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#0f172a',
      borderRadius: 16,
      border: '1px solid #1e293b',
      overflow: 'hidden',
      boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: '#080810',
      borderBottom: '1px solid #1e293b',
      alignItems: 'center'
    }
  }, [['login', '🔑 Log In'], ['register', '📝 Register']].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => {
      setTab(k);
      setMsg({
        text: '',
        ok: false
      });
    },
    style: {
      flex: 1,
      padding: '14px',
      background: 'transparent',
      border: 'none',
      color: tab === k ? '#fff' : '#4B5563',
      fontSize: 12,
      fontWeight: 800,
      cursor: 'pointer',
      borderBottom: tab === k ? '2px solid #EF4444' : '2px solid transparent',
      letterSpacing: .5,
      transition: 'color 0.2s'
    }
  }, l)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      color: '#4B5563',
      fontSize: 18,
      cursor: 'pointer',
      padding: '0 14px',
      lineHeight: 1
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 24px 20px'
    }
  }, tab === 'login' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#6B7280',
      letterSpacing: 1.5,
      marginBottom: 14,
      textTransform: 'uppercase'
    }
  }, "Login with your Safaricom number"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 12,
      color: '#4B5563',
      fontWeight: 700,
      pointerEvents: 'none'
    }
  }, "🇰🇪 +254"), /*#__PURE__*/React.createElement("input", {
    name: "phone",
    value: form.phone,
    onChange: handle,
    placeholder: "07xx xxx xxx",
    style: {
      ...inp,
      paddingLeft: 72,
      marginBottom: 0
    },
    onKeyDown: e => e.key === 'Enter' && doLogin()
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("input", {
    name: "password",
    value: form.password,
    onChange: handle,
    type: "password",
    placeholder: "Password",
    style: inp,
    onKeyDown: e => e.key === 'Enter' && doLogin()
  }), msg.text && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: msg.ok ? '#4ADE80' : '#F87171',
      padding: '8px 12px',
      background: msg.ok ? '#052e16' : '#1f0000',
      border: `1px solid ${msg.ok ? '#166534' : '#7f1d1d'}`,
      borderRadius: 8,
      marginBottom: 12,
      fontWeight: 600
    }
  }, msg.text), /*#__PURE__*/React.createElement("button", {
    onClick: doLogin,
    style: {
      width: '100%',
      padding: '13px',
      background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
      border: 'none',
      borderRadius: 10,
      color: '#fff',
      fontWeight: 800,
      fontSize: 13,
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
      letterSpacing: .5
    }
  }, "LOG IN"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: 11,
      color: '#4B5563'
    }
  }, "No account? ", /*#__PURE__*/React.createElement("span", {
    onClick: () => setTab('register'),
    style: {
      color: '#F97316',
      cursor: 'pointer',
      fontWeight: 700
    }
  }, "Create one →")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 10,
      fontSize: 10,
      color: '#4B5563'
    }
  }, "Helpline: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#4ADE80',
      fontWeight: 700
    }
  }, "+254 738 425 134"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#6B7280',
      letterSpacing: 1.5,
      marginBottom: 14,
      textTransform: 'uppercase'
    }
  }, "Register with your Safaricom number"), /*#__PURE__*/React.createElement("input", {
    name: "username",
    value: form.username,
    onChange: handle,
    placeholder: "Display name (e.g. Jomo)",
    style: inp
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 12,
      color: '#4B5563',
      fontWeight: 700,
      pointerEvents: 'none'
    }
  }, "🇰🇪 +254"), /*#__PURE__*/React.createElement("input", {
    name: "phone",
    value: form.phone,
    onChange: handle,
    placeholder: "07xx xxx xxx",
    style: {
      ...inp,
      paddingLeft: 72,
      marginBottom: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#6B7280',
      letterSpacing: 1,
      marginBottom: 4,
      fontWeight: 600
    }
  }, "DATE OF BIRTH"), /*#__PURE__*/React.createElement("input", {
    name: "dob",
    value: form.dob,
    onChange: handle,
    type: "date",
    max: new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0],
    style: {
      ...inp,
      colorScheme: 'dark'
    }
  }), /*#__PURE__*/React.createElement("input", {
    name: "password",
    value: form.password,
    onChange: handle,
    type: "password",
    placeholder: "Password (8+ chars, letters & numbers)",
    style: inp
  }), /*#__PURE__*/React.createElement("input", {
    name: "confirm",
    value: form.confirm,
    onChange: handle,
    type: "password",
    placeholder: "Confirm password",
    style: inp
  }), msg.text && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: msg.ok ? '#4ADE80' : '#F87171',
      padding: '8px 12px',
      background: msg.ok ? '#052e16' : '#1f0000',
      border: `1px solid ${msg.ok ? '#166534' : '#7f1d1d'}`,
      borderRadius: 8,
      marginBottom: 12,
      fontWeight: 600
    }
  }, msg.text), /*#__PURE__*/React.createElement("button", {
    onClick: doRegister,
    style: {
      width: '100%',
      padding: '13px',
      background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
      border: 'none',
      borderRadius: 10,
      color: '#fff',
      fontWeight: 800,
      fontSize: 13,
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
      letterSpacing: .5
    }
  }, "CREATE ACCOUNT"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: 11,
      color: '#4B5563'
    }
  }, "Already have an account? ", /*#__PURE__*/React.createElement("span", {
    onClick: () => setTab('login'),
    style: {
      color: '#F97316',
      cursor: 'pointer',
      fontWeight: 700
    }
  }, "Log in →"))))), !onClose && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 20
    }
  }, [{
    i: '🔒',
    t: 'Secure',
    d: 'M-Pesa verified'
  }, {
    i: '⚡',
    t: 'Instant',
    d: 'Real-time play'
  }, {
    i: '💸',
    t: 'Fast Pay',
    d: 'Quick withdrawals'
  }].map(f => /*#__PURE__*/React.createElement("div", {
    key: f.t,
    style: {
      flex: 1,
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 10,
      padding: '10px 8px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      marginBottom: 4
    }
  }, f.i), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#D1D5DB'
    }
  }, f.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#4B5563'
    }
  }, f.d))))));
}

/* ════════════ WIN CELEBRATION ════════════ */
function WinCelebration({
  amount,
  multiplier,
  onDone
}) {
  const coins = Array.from({
    length: 14
  }, (_, i) => i);
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, []);
  const big = multiplier >= 10;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      pointerEvents: 'none',
      overflow: 'hidden'
    }
  }, coins.map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      top: '-10px',
      left: `${5 + i * 6.5}%`,
      fontSize: big ? 24 : 18,
      animation: `coinRain ${0.8 + Math.random() * 1.2}s ${Math.random() * 0.6}s ease-in forwards`
    }
  }, "💰")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '38%',
      left: '50%',
      animation: 'winPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
      transform: 'translate(-50%,-50%) scale(0)',
      textAlign: 'center',
      background: 'linear-gradient(135deg,#7C3AED,#DB2777)',
      borderRadius: 20,
      padding: '20px 36px',
      boxShadow: '0 0 60px rgba(124,58,237,0.7)',
      border: '2px solid rgba(255,255,255,0.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      letterSpacing: 3,
      marginBottom: 4
    }
  }, "YOU WON"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: big ? 52 : 42,
      fontWeight: 900,
      color: '#fff',
      lineHeight: 1,
      background: 'linear-gradient(90deg,#FFD700,#FFA500,#FFD700)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      animation: 'shimmer 1.5s linear infinite'
    }
  }, "KES ", parseFloat(amount).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: '#C084FC',
      fontWeight: 700,
      marginTop: 4
    }
  }, "@ ", multiplier.toFixed(2), "x"), big && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      marginTop: 6
    }
  }, "🎉🔥🎉")));
}

/* ════════════ HISTORY BAR ════════════ */
function HistoryBar({
  history
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      padding: '6px 12px',
      background: '#080810',
      borderBottom: '1px solid #1f2937',
      overflowX: 'auto',
      alignItems: 'center',
      flexShrink: 0,
      minHeight: 34
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: '#4B5563',
      whiteSpace: 'nowrap',
      marginRight: 2,
      flexShrink: 0
    }
  }, "PREV:"), [...history].reverse().slice(0, 14).map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      background: mBg(h),
      color: mColor(h),
      whiteSpace: 'nowrap',
      flexShrink: 0,
      border: `1px solid ${mColor(h)}33`
    }
  }, h.toFixed(2), "x")));
}

/* ════════════ GAME CANVAS ════════════ */
function GameCanvas({
  gameState,
  multiplier,
  serverStartedAt
}) {
  const canvasRef = useRef(null);
  const gsRef = useRef(gameState);
  const multRef = useRef(multiplier);
  const satRef = useRef(serverStartedAt);
  gsRef.current = gameState;
  multRef.current = multiplier;
  satRef.current = serverStartedAt;
  const state = useRef({
    pts: [],
    visualStart: null,
    crashPos: null,
    crashAt: null,
    clouds: null,
    cloudScroll: 0,
    smokeParticles: []
  });
  if (!state.current.clouds) {
    state.current.clouds = Array.from({
      length: 14
    }, () => ({
      x: Math.random() * 1200,
      y: 20 + Math.random() * 160,
      r: 22 + Math.random() * 38,
      speed: 0.15 + Math.random() * 0.25,
      wobble: Math.random() * Math.PI * 2
    }));
  }
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;
    const st = state.current;
    let raf;
    function drawClouds() {
      st.clouds.forEach(c => {
        c.wobble += 0.005;
        const cx = ((c.x - st.cloudScroll * c.speed) % (W + 200) + W + 200) % (W + 200) - 100;
        const cy = c.y + Math.sin(c.wobble) * 3;
        [{
          ox: 0,
          oy: 0,
          rs: 1
        }, {
          ox: -c.r * .5,
          oy: c.r * .2,
          rs: .7
        }, {
          ox: c.r * .5,
          oy: c.r * .2,
          rs: .65
        }, {
          ox: -c.r * .8,
          oy: c.r * .42,
          rs: .5
        }, {
          ox: c.r * .8,
          oy: c.r * .42,
          rs: .48
        }].forEach(o => {
          const g = ctx.createRadialGradient(cx + o.ox, cy + o.oy, 0, cx + o.ox, cy + o.oy, c.r * o.rs);
          g.addColorStop(0, 'rgba(255,255,255,0.13)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(cx + o.ox, cy + o.oy, c.r * o.rs, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        });
      });
    }
    function frame() {
      const gs = gsRef.current;
      const mult = multRef.current;
      const now = Date.now();
      if (gs === BETTING) {
        st.pts = [];
        st.visualStart = null;
        st.crashPos = null;
        st.crashAt = null;
        st.smokeParticles = [];
      }
      if (gs === FLYING && !st.visualStart) {
        const sat = satRef.current;
        st.visualStart = (sat && sat > 0 && now - sat < 600000) ? sat : now;
      }
      if (gs === CRASHED && !st.crashAt) {
        st.crashAt = now;
        if (st.pts.length > 0) {
          const last = st.pts[st.pts.length - 1];
          st.crashPos = {
            x: last.x,
            y: last.y
          };
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, W, H);
      st.cloudScroll += gs !== BETTING ? 0.5 : 0.15;
      drawClouds();
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      if (gs === BETTING) {
        raf = requestAnimationFrame(frame);
        return;
      }
      if (gs === FLYING) {
        const elapsed = (now - st.visualStart) / 1000;
        const t = elapsed / 30;
        const rawPx2 = 40 + t * (W - 60);
        const trailPx = Math.min(rawPx2, W - 18);
        const atEdge2 = rawPx2 >= W - 18;
        const trailPy = atEdge2 ? st.pts.length > 0 ? st.pts[st.pts.length - 1].y : Math.max(10, H - 50 - Math.pow(t, 1.4) * (H - 100)) : Math.max(10, H - 50 - Math.pow(t, 1.4) * (H - 100));
        st.pts.push({
          x: trailPx,
          y: trailPy
        });
        if (st.pts.length > 900) st.pts.shift();
      }
      if (st.pts.length > 1) {
        const crashAge = gs === CRASHED && st.crashAt ? now - st.crashAt : 0;
        const lc = gs === CRASHED && crashAge > 400 ? '#EF4444' : '#F97316';
        const grad = ctx.createLinearGradient(0, H, 0, 0);
        grad.addColorStop(0, `${lc}00`);
        grad.addColorStop(1, `${lc}22`);
        ctx.beginPath();
        ctx.moveTo(40, H - 50);
        st.pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(st.pts[st.pts.length - 1].x, H - 50);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(40, H - 50);
        st.pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = `${lc}55`;
        ctx.lineWidth = 7;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(40, H - 50);
        st.pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = lc;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.fillStyle = '#374151';
      ctx.font = '10px Segoe UI';
      [1, 2, 5, 10, 25, 50, 100, 200, 500].forEach(lv => {
        if (lv <= mult + 1) {
          const frac = Math.min((lv - 1) / Math.max(mult - 1, 1), 1);
          const ly = H - 50 - frac * (H - 100) * 0.85;
          if (ly > 10 && ly < H - 10) ctx.fillText(`${lv}x`, 4, ly + 3);
        }
      });
      const PLANE_EDGE = W - 18;
      if (gs === FLYING) {
        const elapsed = (now - st.visualStart) / 1000;
        const t = elapsed / 30;
        const rawPx = 40 + t * (W - 60);
        const rawPy = H - 50 - Math.pow(t, 1.4) * (H - 100);
        const atEdge = rawPx >= PLANE_EDGE;
        const px = atEdge ? PLANE_EDGE : rawPx;
        const py = atEdge ? st.pts.length > 0 ? st.pts[st.pts.length - 1].y : Math.max(10, rawPy) : Math.max(10, rawPy);
        if (atEdge) {
          if (Math.random() < 0.4) {
            st.smokeParticles.push({
              x: px - 18,
              y: py,
              vx: -(1 + Math.random() * 2),
              vy: (Math.random() - 0.5) * 0.7,
              r: 4 + Math.random() * 5,
              life: 1
            });
          }
        }
        st.smokeParticles = st.smokeParticles.filter(s => s.life > 0);
        st.smokeParticles.forEach(s => {
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 0.028;
          s.r *= 1.02;
          ctx.save();
          ctx.globalAlpha = s.life * 0.45;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(180,180,180,1)';
          ctx.fill();
          ctx.restore();
        });
        ctx.save();
        ctx.translate(px, py);
        ctx.font = '28px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✈️', 0, 0);
        ctx.restore();
      }
      if (gs === CRASHED && st.crashPos && st.crashAt) {
        const diveT = Math.min((now - st.crashAt) / 700, 1);
        const wasAtEdge = st.crashPos.x >= PLANE_EDGE - 5;
        if (wasAtEdge) {
          ctx.save();
          ctx.translate(st.crashPos.x, st.crashPos.y);
          ctx.font = '28px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✈️', 0, 0);
          ctx.restore();
        } else {
          const px = st.crashPos.x + diveT * 30;
          const py = st.crashPos.y + diveT * 150;
          const opacity = Math.max(0, 1 - diveT * 1.3);
          const angle = diveT * 1.1;
          if (opacity > 0) {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.font = '28px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✈️', 0, 0);
            ctx.restore();
          }
          if (diveT < 0.4) {
            const boom = diveT / 0.4;
            const ef = ctx.createRadialGradient(st.crashPos.x, st.crashPos.y, 0, st.crashPos.x, st.crashPos.y, 50 * boom);
            ef.addColorStop(0, `rgba(255,200,50,${0.6 * (1 - boom)})`);
            ef.addColorStop(0.5, `rgba(239,68,68,${0.3 * (1 - boom)})`);
            ef.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = ef;
            ctx.fillRect(0, 0, W, H);
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
  const W = typeof window !== 'undefined' ? window.innerWidth : 900;
  const H = isMobile ? 220 : 320;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: '#080810',
      overflow: 'hidden',
      borderBottom: '1px solid #1f2937'
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    width: W,
    height: H,
    style: {
      display: 'block',
      width: '100%',
      height: H
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      textAlign: 'center',
      pointerEvents: 'none',
      userSelect: 'none'
    }
  }, gameState === BETTING && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'pulse 1.2s infinite'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#4B5563',
      letterSpacing: 2,
      textTransform: 'uppercase'
    }
  }, "Waiting for bets...")), gameState === FLYING && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'glow 1s infinite'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'clamp(36px,8vw,64px)',
      fontWeight: 900,
      color: '#F97316',
      letterSpacing: -1,
      lineHeight: 1
    }
  }, multiplier.toFixed(2), "x")), gameState === CRASHED && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'fadeIn 0.3s ease'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#EF4444',
      letterSpacing: 3,
      marginBottom: 2
    }
  }, "FLEW AWAY!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'clamp(32px,7vw,56px)',
      fontWeight: 900,
      color: '#EF4444',
      letterSpacing: -1,
      lineHeight: 1,
      textShadow: '0 0 30px rgba(239,68,68,0.7)'
    }
  }, multiplier.toFixed(2), "x"))));
}

/* ════════════ COUNTDOWN ════════════ */
function Countdown({
  val,
  max
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '6px 12px',
      background: '#0d0d1a',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderBottom: '1px solid #1f2937'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: '#6B7280',
      flexShrink: 0,
      letterSpacing: 1
    }
  }, "STARTING IN"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 3,
      background: '#1f2937',
      borderRadius: 4,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${val / max * 100}%`,
      height: '100%',
      background: 'linear-gradient(90deg,#EF4444,#F97316)',
      transition: 'width 0.1s linear',
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: '#F97316',
      fontWeight: 700,
      flexShrink: 0
    }
  }, val.toFixed(1), "s"));
}

/* ════════════ BET PANEL ════════════ */
function BetPanel({
  gameState,
  balance,
  setBalance,
  multiplier,
  onWin
}) {
  const [amt, setAmt] = useState(50);
  const [status, setStatus] = useState('idle');
  const [locked, setLocked] = useState(0);
  const [autobet, setAutobet] = useState(false);
  const [autoco, setAutoco] = useState(false);
  const [autoval, setAutoval] = useState(2.0);
  const prevGS = useRef(gameState);
  useEffect(() => {
    const prev = prevGS.current;
    if (prev === BETTING && gameState === FLYING && status === 'placed') setStatus('active');
    if (gameState === CRASHED) {
      if (status === 'active') {
        fetch('/api/limits/record-loss', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: '',
            amount: locked
          })
        }).catch(() => {});
        setStatus('lost');
        setTimeout(() => setStatus('idle'), 2500);
      }
      if (status === 'placed') setStatus('idle');
    }
    if (gameState === BETTING) {
      if (status === 'won' || status === 'lost') setStatus('idle');
      if (status === 'queued') {
        setLocked(amt);
        setStatus('placed');
      }
      if (autobet && status === 'idle' && balance >= amt) {
        setBalance(b => b - amt);
        setLocked(amt);
        setStatus('placed');
      }
    }
    prevGS.current = gameState;
  }, [gameState]);
  useEffect(() => {
    if (status === 'active' && autoco && multiplier >= autoval) doCashout();
  }, [multiplier]);
  function doBet() {
    if (status === 'idle' && gameState === BETTING) {
      if (amt < 50 || balance < amt) return;
      if (!window.__muted) playBet();
      setBalance(b => b - amt);
      setLocked(amt);
      setStatus('placed');
    } else if (status === 'idle' && gameState === FLYING) {
      if (amt < 50 || balance < amt) return;
      setBalance(b => b - amt);
      setStatus('queued');
    } else if (status === 'queued') {
      setBalance(b => b + amt);
      setStatus('idle');
    } else if (status === 'placed') {
      setBalance(b => b + locked);
      setLocked(0);
      setStatus('idle');
    }
  }
  function doCashout() {
    if (status !== 'active') return;
    const win = parseFloat((locked * multiplier).toFixed(2));
    if (!window.__muted) playCashout(multiplier);
    setBalance(b => b + win);
    onWin && onWin(win, multiplier);
    setStatus('won');
    setTimeout(() => setStatus('idle'), 3000);
  }
  function add(n) {
    if (status === 'idle') setAmt(a => Math.max(0, a + n));
  }
  function handleInput(e) {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      setAmt(0);
      return;
    }
    const n = parseInt(raw, 10);
    if (!isNaN(n)) setAmt(n);
  }
  const winAmt = (locked * multiplier).toFixed(2);
  const belowMin = amt < 50;
  let bg = 'linear-gradient(135deg,#16A34A,#15803D)',
    txt = 'PLACE BET',
    fn = doBet,
    dis = false,
    glow = '';
  if (status === 'queued') {
    bg = 'linear-gradient(135deg,#2563EB,#1D4ED8)';
    txt = 'NEXT ROUND ✓\nTAP TO CANCEL';
    glow = '0 0 16px rgba(37,99,235,0.5)';
  } else if (status === 'placed') {
    bg = 'linear-gradient(135deg,#DC2626,#B91C1C)';
    txt = 'CANCEL BET';
    glow = '0 0 14px rgba(220,38,38,0.4)';
  } else if (status === 'active') {
    bg = 'linear-gradient(135deg,#D97706,#B45309)';
    txt = `CASH OUT\nKES ${winAmt}`;
    fn = doCashout;
    glow = '0 0 22px rgba(217,119,6,0.6)';
  } else if (status === 'won') {
    bg = 'linear-gradient(135deg,#059669,#047857)';
    txt = `CASHED OUT\nKES ${winAmt}`;
    dis = true;
    glow = '0 0 18px rgba(5,150,105,0.5)';
  } else if (status === 'lost') {
    bg = '#1f2937';
    txt = 'NOT CASHED OUT';
    dis = true;
  } else if (belowMin && status === 'idle') {
    bg = '#374151';
    dis = true;
    txt = 'MIN KES 50';
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: '#0f172a',
      borderRadius: 12,
      padding: 12,
      border: '1px solid #1e293b',
      minWidth: 0,
      position: 'relative',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, [50, 100, 200, 500].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => add(n),
    disabled: status !== 'idle',
    style: {
      flex: 1,
      padding: '5px 0',
      background: '#1e293b',
      border: '1px solid #334155',
      color: status !== 'idle' ? '#475569' : '#94A3B8',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 600,
      cursor: status !== 'idle' ? 'not-allowed' : 'pointer'
    }
  }, "+", n))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: '#1e293b',
      borderRadius: 8,
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      border: `1.5px solid ${belowMin && status === 'idle' ? '#EF4444' : '#334155'}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#64748B',
      marginRight: 5,
      fontWeight: 700,
      flexShrink: 0
    }
  }, "KES"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: amt || '',
    onChange: handleInput,
    disabled: status !== 'idle',
    style: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      color: '#F1F5F9',
      fontSize: 17,
      fontWeight: 800,
      outline: 'none',
      width: 50
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: fn,
    disabled: dis,
    style: {
      flex: 1.3,
      padding: '10px 8px',
      borderRadius: 8,
      border: 'none',
      cursor: dis ? 'not-allowed' : 'pointer',
      background: bg,
      color: '#fff',
      fontWeight: 800,
      fontSize: 10,
      lineHeight: 1.4,
      whiteSpace: 'pre-line',
      textAlign: 'center',
      opacity: dis ? 0.75 : 1,
      boxShadow: glow,
      letterSpacing: .4,
      textTransform: 'uppercase'
    }
  }, txt)), belowMin && status === 'idle' && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#EF4444',
      marginBottom: 6,
      fontWeight: 600
    }
  }, "⚠ Minimum stake is KES 50"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      paddingTop: 4,
      borderTop: '1px solid #1e293b'
    }
  }, [['ab', autobet, setAutobet, 'Auto Bet'], ['ac', autoco, setAutoco, 'Auto Cash Out']].map(([k, val, setter, label]) => /*#__PURE__*/React.createElement("label", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      cursor: 'pointer',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setter(v => !v),
    style: {
      width: 30,
      height: 16,
      background: val ? '#16A34A' : '#334155',
      borderRadius: 8,
      position: 'relative',
      transition: 'background 0.2s',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 2,
      left: val ? 15 : 2,
      width: 12,
      height: 12,
      background: '#fff',
      borderRadius: '50%',
      transition: 'left 0.2s'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9.5,
      color: '#64748B',
      fontWeight: 600
    }
  }, label), k === 'ac' && autoco && /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: autoval,
    onChange: e => setAutoval(+e.target.value),
    step: "0.1",
    min: "1.1",
    style: {
      width: 36,
      background: '#1e293b',
      border: '1px solid #334155',
      color: '#FCA5A5',
      fontSize: 10,
      borderRadius: 5,
      padding: '2px 5px',
      outline: 'none',
      fontWeight: 700
    }
  })))));
}

/* ════════════ LIVE PANEL ════════════ */
function mkBotWithTarget() {
  // assign each bot a fixed target multiplier at creation — most 1.1x-3x, some higher
  const r = Math.random();
  const target = r < 0.55 ? 1.1 + Math.random() * 1.8 : r < 0.80 ? 3 + Math.random() * 4 : r < 0.93 ? 7 + Math.random() * 13 : 20 + Math.random() * 80;
  return {
    ...mkBet(),
    target: parseFloat(target.toFixed(2))
  };
}

/* ════════════ CHAT SIDEBAR (inline, no scroll-push) ════════════ */
function ChatSidebar({ user, socket }) {
  const [msgs, setMsgs] = React.useState([]);
  const [txt, setTxt] = React.useState('');
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    socket.on('chat:history', data => setMsgs(data || []));
    socket.on('chat', msg => setMsgs(m => [...m.slice(-49), msg]));
    const onBot = e => setMsgs(m => [...m.slice(-49), e.detail]);
    window.addEventListener('bot-chat', onBot);
    return () => {
      socket.off('chat:history'); socket.off('chat');
      window.removeEventListener('bot-chat', onBot);
    };
  }, []);

  // Auto-scroll to the latest message, but only if the user is already
  // near the bottom (so scrolling up to read history isn't yanked away)
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  function send() {
    const t = txt.trim();
    if (!t || !user) return;
    // Message is silently discarded — it vanishes after typing
    setTxt('');
  }

  const ACOLORS = ['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#A855F7','#EC4899'];
  function ac(name) {
    let h = 0; for (let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
    return ACOLORS[Math.abs(h)%ACOLORS.length];
  }

  // Full available history (capped upstream at 50) — scrollable
  const visible = msgs;

  return React.createElement('div', { style:{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 } },
    // Messages area — real scroll, newest auto-followed
    React.createElement('div', {
      ref: scrollRef,
      style: {
        flex:1, minHeight:0, overflowY:'auto', padding:'4px 6px',
        display:'flex', flexDirection:'column', gap:3,
        maskImage:'linear-gradient(to bottom, transparent 0%, black 24px)',
        WebkitMaskImage:'linear-gradient(to bottom, transparent 0%, black 24px)'
      }
    },
      visible.map(m => React.createElement('div', {
        key: m.id,
        style: { display:'flex', gap:5, alignItems:'flex-start', animation:'fadeIn 0.35s ease', flexShrink:0 }
      },
        React.createElement('div', {
          style:{ width:18, height:18, borderRadius:'50%', background:ac(m.username), display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'#fff', flexShrink:0 }
        }, m.username[0]),
        React.createElement('div', { style:{ flex:1, minWidth:0 } },
          React.createElement('span', { style:{ fontSize:9, fontWeight:700, color:'#C084FC', marginRight:4 } }, m.username),
          React.createElement('span', { style:{ fontSize:10, color:'#CBD5E1', wordBreak:'break-word', lineHeight:1.3 } }, m.text)
        )
      ))
    ),
    // Input
    React.createElement('div', { style:{ padding:'5px 6px', borderTop:'1px solid #1f2937', flexShrink:0 } },
      React.createElement('div', { style:{ display:'flex', gap:4 } },
        React.createElement('input', {
          value:txt, onChange:e=>setTxt(e.target.value),
          onKeyDown:e=>e.key==='Enter'&&send(),
          placeholder: user ? 'Type...' : 'Login to chat',
          disabled:!user,
          style:{ flex:1, minWidth:0, background:'#1a1d2e', border:'1px solid #2d3148', borderRadius:6, padding:'5px 7px', color:'#F1F5F9', fontSize:10, outline:'none' }
        }),
        React.createElement('button', {
          onClick:send, disabled:!user||!txt.trim(),
          style:{ flexShrink:0, padding:'5px 8px', background: user&&txt.trim()?'#2563EB':'#1a1d2e', border:'none', borderRadius:6, color: user&&txt.trim()?'#fff':'#374151', fontSize:10, cursor: user&&txt.trim()?'pointer':'not-allowed' }
        }, '▶')
      )
    )
  );
}

function LivePanel({
  gameState,
  multiplier,
  fill
}) {
  const [tab, setTab] = useState('all');
  const betsRef = useRef(Array.from({
    length: 24
  }, mkBotWithTarget));
  const [displayBets, setDisplayBets] = useState(() => betsRef.current.slice());
  const topBets = useRef(Array.from({
    length: 10
  }, () => ({
    name: rn(),
    av: ra(),
    bet: (Math.floor(Math.random() * 200) + 50) * 10,
    mult: (10 + Math.random() * 140).toFixed(2)
  })));
  const gsRef = useRef(gameState);
  const multRef = useRef(multiplier);
  gsRef.current = gameState;
  multRef.current = multiplier;
  useEffect(() => {
    if (gameState === BETTING) {
      // Reset all bots for new round
      betsRef.current = Array.from({
        length: 24
      }, mkBotWithTarget);
      setDisplayBets(betsRef.current.slice());
      return;
    }
    if (gameState === CRASHED) {
      // Any bot that hasn't cashed out yet loses
      betsRef.current = betsRef.current.map(x => x.cashout ? x : {
        ...x,
        lost: true
      });
      setDisplayBets(betsRef.current.slice());
      return;
    }
  }, [gameState]);
  useEffect(() => {
    if (gameState !== FLYING) return;
    // Single persistent interval — runs every 300ms throughout the flight
    const iv = setInterval(() => {
      const m = multRef.current;
      let changed = false;
      betsRef.current = betsRef.current.map(bot => {
        if (bot.cashout || bot.lost) return bot;
        // Cash out if multiplier has reached or passed bot's target
        const reached = m >= bot.target;
        // Also a small random early-cashout chance (impatient bots)
        const earlyChance = m > 1.3 ? 0.04 : 0;
        if (reached || Math.random() < earlyChance) {
          changed = true;
          const co = parseFloat((Math.min(m, bot.target) + Math.random() * 0.05).toFixed(2));
          return {
            ...bot,
            cashout: co
          };
        }
        return bot;
      });
      // Refresh a finished bot slot with a new bot occasionally
      if (Math.random() < 0.15) {
        const doneIdxs = betsRef.current.map((b, i) => b.cashout || b.lost ? i : -1).filter(i => i >= 0);
        if (doneIdxs.length > 0) {
          const ri = doneIdxs[Math.floor(Math.random() * doneIdxs.length)];
          betsRef.current[ri] = {
            ...mkBotWithTarget(),
            cashout: null,
            lost: false
          };
          changed = true;
        }
      }
      if (changed) setDisplayBets([...betsRef.current]);
    }, 300);
    return () => clearInterval(iv);
  }, [gameState]);
  return /*#__PURE__*/React.createElement("div", {
    style: fill ? {
      background: '#111827',
      border: 'none',
      borderRadius: 0,
      overflow: 'hidden',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    } : {
      background: '#111827',
      borderRadius: 10,
      border: '1px solid #1f2937',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      borderBottom: '1px solid #1f2937',
      flexShrink: 0
    }
  }, [{
    k: 'all',
    l: 'All Bets'
  }, {
    k: 'top',
    l: '🏆 Top'
  }].map(t => /*#__PURE__*/React.createElement("button", {
    key: t.k,
    onClick: () => setTab(t.k),
    style: {
      flex: 1,
      padding: '8px',
      background: 'transparent',
      border: 'none',
      color: tab === t.k ? '#F97316' : '#6B7280',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      borderBottom: tab === t.k ? '2px solid #F97316' : '2px solid transparent'
    }
  }, t.l))), /*#__PURE__*/React.createElement("div", {
    style: fill ? {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto'
    } : {
      maxHeight: 180,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 'clamp(9px,2.5vw,11px)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#080810',
      position: 'sticky',
      top: 0
    }
  }, ['Player', 'Bet', '@', 'Win'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '4px 8px',
      color: '#374151',
      fontWeight: 600,
      textAlign: 'left',
      fontSize: 10
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, tab === 'all' && displayBets.map(b => /*#__PURE__*/React.createElement("tr", {
    key: b.id,
    style: {
      borderBottom: '1px solid #0d0d1a',
      animation: 'slideIn 0.3s ease'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '4px 8px',
      color: '#9CA3AF',
      whiteSpace: 'nowrap'
    }
  }, b.av, " ", b.name), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '4px 8px',
      color: '#D1D5DB',
      fontWeight: 600
    }
  }, b.bet), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '4px 8px'
    }
  }, b.cashout ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: mColor(b.cashout),
      fontWeight: 700
    }
  }, b.cashout.toFixed(2), "x") : b.lost ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#EF4444',
      fontSize: 10
    }
  }, "bust") : /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#374151',
      animation: 'pulse 1s infinite'
    }
  }, "…")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '4px 8px'
    }
  }, b.cashout ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#4ADE80',
      fontWeight: 700
    }
  }, (b.bet * b.cashout).toFixed(0)) : b.lost ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#EF4444',
      fontSize: 10
    }
  }, "-", b.bet) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#1f2937'
    }
  }, "—")))), tab === 'top' && topBets.current.map((b, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: '1px solid #0d0d1a'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '4px 8px',
      color: '#9CA3AF'
    }
  }, b.av, " ", b.name), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '4px 8px',
      color: '#D1D5DB',
      fontWeight: 600
    }
  }, b.bet), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '4px 8px',
      color: '#F472B6',
      fontWeight: 700
    }
  }, b.mult, "x"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '4px 8px',
      color: '#4ADE80',
      fontWeight: 700
    }
  }, (b.bet * b.mult).toFixed(0))))))));
}

/* ════════════ DEPOSIT MODAL ════════════ */
function DepositModal({
  balance,
  setBalance,
  onClose
}) {
  const [amt, setAmt] = useState('');
  const [step, setStep] = useState('input'); // input | pending | done
  const [counter, setCounter] = useState(5);
  function proceed() {
    if (!amt.trim()) return;
    setStep('pending');
    let t = 5;
    setCounter(5);
    const iv = setInterval(() => {
      t--;
      setCounter(t);
      if (t <= 0) {
        clearInterval(iv);
        setStep('done');
      }
    }, 1000);
  }
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: '#0f172a',
      borderRadius: 16,
      width: '100%',
      maxWidth: 340,
      border: '1px solid #1e293b',
      boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
      overflow: 'hidden',
      animation: 'fadeIn 0.2s ease'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#052e16,#0f172a)',
      padding: '16px 20px',
      borderBottom: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,#16A34A,#15803D)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18
    }
  }, "💰"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 13,
      color: '#F1F5F9'
    }
  }, "Deposit Funds"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#4B5563'
    }
  }, "Balance: KES ", balance.toLocaleString()))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: '#1e293b',
      border: '1px solid #334155',
      color: '#64748B',
      borderRadius: 8,
      width: 28,
      height: 28,
      cursor: 'pointer',
      fontSize: 14,
      lineHeight: 1
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px'
    }
  }, step === 'input' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#052e16,#0a1f0a)',
      border: '2px solid #16A34A',
      borderRadius: 12,
      padding: '16px',
      marginBottom: 16,
      boxShadow: '0 0 20px rgba(22,163,74,0.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,#16A34A,#15803D)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      flexShrink: 0
    }
  }, "📲"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 13,
      color: '#4ADE80',
      letterSpacing: 1
    }
  }, "SEND TO:"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 900,
      color: '#4ADE80',
      letterSpacing: 2
    }
  }, "+254 738 425 134"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#0d2b0d',
      borderRadius: 8,
      padding: '12px 14px',
      border: '1px solid #16A34A55'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#4ADE80',
      marginBottom: 10,
      letterSpacing: 1
    }
  }, "HOW TO DEPOSIT:"), [{
    n: 1,
    t: 'Dial *334# on your Safaricom phone.'
  }, {
    n: 2,
    t: 'Select "Send Money."'
  }, {
    n: 3,
    t: 'Choose "Send to Other Network."'
  }, {
    n: 4,
    t: 'Enter 0738425134'
  }, {
    n: 5,
    t: 'Enter amount.'
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.n,
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 20,
      height: 20,
      borderRadius: '50%',
      background: '#16A34A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      fontWeight: 900,
      color: '#fff',
      flexShrink: 0
    }
  }, s.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#86EFAC',
      lineHeight: 1.5
    }
  }, s.t))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: '10px 12px',
      background: 'linear-gradient(135deg,#1a1a0a,#1a1200)',
      borderRadius: 8,
      border: '1px solid #ca8a0488',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 900,
      color: '#FCD34D',
      letterSpacing: 1,
      lineHeight: 1.6
    }
  }, "After sending, enter the code you receive below")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#1e293b',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 14,
      border: '1px solid #334155'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#64748B',
      fontWeight: 600,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "CODE"), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    type: "text",
    value: amt,
    onChange: e => setAmt(e.target.value),
    placeholder: "Enter code",
    style: {
      width: '100%',
      background: 'transparent',
      border: 'none',
      color: '#F1F5F9',
      fontSize: 22,
      fontWeight: 800,
      outline: 'none',
      fontFamily: 'inherit'
    }
  })), /*#__PURE__*/React.createElement("button", {
    disabled: true,
    style: {
      width: '100%',
      padding: '12px',
      background: '#1e293b',
      border: 'none',
      borderRadius: 10,
      color: '#475569',
      fontWeight: 800,
      fontSize: 13,
      cursor: 'not-allowed'
    }
  }, "CONFIRM")), step === 'pending' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '16px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 60,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,#D97706,#B45309)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 14px',
      fontSize: 24,
      fontWeight: 900,
      color: '#fff'
    }
  }, counter), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: '#FCD34D',
      marginBottom: 6
    }
  }, "Confirming Payment..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64748B'
    }
  }, "Crediting ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#F1F5F9'
    }
  }, "KES ", parseInt(amt).toLocaleString()), " to your account")), step === 'done' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '16px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 60,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,#16A34A,#15803D)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 14px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "26",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#4ADE80',
      marginBottom: 6
    }
  }, "Deposit Successful! 🎉"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#CBD5E1',
      marginBottom: 16
    }
  }, "Your deposit is being processed."), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      padding: '10px 28px',
      background: 'linear-gradient(135deg,#16A34A,#15803D)',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 12
    }
  }, "PLAY NOW")))));
}

/* ════════════ WITHDRAW MODAL ════════════ */
function WithdrawModal({
  balance,
  setBalance,
  user,
  onClose
}) {
  const [amt, setAmt] = useState('');
  const [step, setStep] = useState('input'); // input | pending | done
  const n = parseInt(amt) || 0;
  function proceed() {
    if (!n || n < 50 || n > balance) return;
    setStep('pending');
    setBalance(b => b - n);
    setTimeout(() => setStep('done'), (Math.floor(Math.random() * 3) + 3) * 1000);
  }
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: '#0f172a',
      borderRadius: 16,
      width: '100%',
      maxWidth: 340,
      border: '1px solid #1e293b',
      boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
      overflow: 'hidden',
      animation: 'fadeIn 0.2s ease'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#1a0a2e,#0f172a)',
      padding: '16px 20px',
      borderBottom: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,#9333EA,#7C3AED)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18
    }
  }, "💵"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 13,
      color: '#F1F5F9'
    }
  }, "Withdraw Funds"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#4B5563'
    }
  }, "Available: KES ", balance.toLocaleString()))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: '#1e293b',
      border: '1px solid #334155',
      color: '#64748B',
      borderRadius: 8,
      width: 28,
      height: 28,
      cursor: 'pointer',
      fontSize: 14,
      lineHeight: 1
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px'
    }
  }, step === 'input' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#1e293b',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 6,
      border: '1px solid #334155'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#64748B',
      fontWeight: 600,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "WITHDRAWAL TO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#C084FC',
      fontWeight: 700
    }
  }, "📱 ", user.phone)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#6B7280',
      marginBottom: 12
    }
  }, "Funds will be sent to your registered Safaricom number via M-Pesa."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#1e293b',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 10,
      border: '1px solid #334155'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#64748B',
      fontWeight: 600,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "AMOUNT (KES)"), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    type: "number",
    value: amt,
    onChange: e => setAmt(e.target.value),
    placeholder: "Enter amount",
    style: {
      width: '100%',
      background: 'transparent',
      border: 'none',
      color: '#F1F5F9',
      fontSize: 22,
      fontWeight: 800,
      outline: 'none',
      fontFamily: 'inherit'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 12
    }
  }, [100, 500, 1000].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setAmt(String(Math.min(v, balance))),
    style: {
      flex: 1,
      padding: '5px 0',
      background: '#1e293b',
      border: '1px solid #334155',
      color: '#94A3B8',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, v)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAmt(String(balance)),
    style: {
      flex: 1,
      padding: '5px 0',
      background: '#1e293b',
      border: '1px solid #9333EA44',
      color: '#C084FC',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "ALL")), n > balance && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#EF4444',
      fontWeight: 600,
      marginBottom: 8
    }
  }, "⚠ Exceeds your balance"), n > 0 && n < 50 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#EF4444',
      fontWeight: 600,
      marginBottom: 8
    }
  }, "⚠ Minimum withdrawal is KES 50"), /*#__PURE__*/React.createElement("button", {
    onClick: proceed,
    disabled: !n || n < 50 || n > balance,
    style: {
      width: '100%',
      padding: '12px',
      background: n >= 50 && n <= balance ? 'linear-gradient(135deg,#9333EA,#7C3AED)' : '#1e293b',
      border: 'none',
      borderRadius: 10,
      color: n >= 50 && n <= balance ? '#fff' : '#475569',
      fontWeight: 800,
      fontSize: 13,
      cursor: n >= 50 && n <= balance ? 'pointer' : 'not-allowed',
      boxShadow: n >= 50 && n <= balance ? '0 4px 14px rgba(147,51,234,0.35)' : 'none'
    }
  }, "WITHDRAW KES ", n > 0 ? n.toLocaleString() : '—')), step === 'pending' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '16px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 60,
      borderRadius: '50%',
      background: '#1e293b',
      border: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 14px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#9CA3AF",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
  }, /*#__PURE__*/React.createElement("animateTransform", {
    attributeName: "transform",
    type: "rotate",
    from: "0 12 12",
    to: "360 12 12",
    dur: "1s",
    repeatCount: "indefinite"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: '#C084FC',
      marginBottom: 6
    }
  }, "Processing Withdrawal..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64748B'
    }
  }, "Sending KES ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#F1F5F9'
    }
  }, n.toLocaleString()), " to ", user.phone)), step === 'done' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '16px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 60,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,#9333EA,#7C3AED)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 14px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "26",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#C084FC',
      marginBottom: 6
    }
  }, "Withdrawal Sent! ✅"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#CBD5E1',
      marginBottom: 4
    }
  }, "KES ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#C084FC',
      fontSize: 16
    }
  }, n.toLocaleString()), " sent to M-Pesa"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#4B5563',
      marginBottom: 16
    }
  }, user.phone), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      padding: '10px 28px',
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: 8,
      color: '#94A3B8',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 12
    }
  }, "CLOSE")))));
}

/* ════════════════════════════════════════
   MAIN GAME
════════════════════════════════════════ */

/* ════════════ PROVABLY FAIR ════════════ */
function ProvenFair({
  serverHash,
  lastSeed
}) {
  const [open, setOpen] = React.useState(false);
  const [checked, setChecked] = React.useState(null);
  function verify() {
    if (!lastSeed || !lastSeed.seed) return;
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(lastSeed.seed)).then(buf => {
      const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      setChecked(hex === lastSeed.hash ? 'MATCH' : 'MISMATCH');
    });
  }
  if (!open) return /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      background: 'transparent',
      border: '1px solid #1e293b',
      borderRadius: 20,
      padding: '3px 10px',
      color: '#4B5563',
      fontSize: 9,
      cursor: 'pointer',
      fontWeight: 700,
      letterSpacing: 1
    }
  }, "🔒 PROVABLY FAIR");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    },
    onClick: () => setOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: '#0f172a',
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 360,
      border: '1px solid #1e293b'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 14,
      color: '#4ADE80',
      marginBottom: 4
    }
  }, "🔒 PROVABLY FAIR"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#4B5563',
      marginBottom: 16,
      lineHeight: 1.6
    }
  }, "Before each round we publish a SHA-256 hash of our server seed. After the round ends the seed is revealed so you can verify the crash point wasn't changed."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#4B5563',
      fontWeight: 700,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "CURRENT ROUND HASH"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#1e293b',
      borderRadius: 8,
      padding: '8px 10px',
      fontSize: 9,
      color: '#60A5FA',
      fontFamily: 'monospace',
      wordBreak: 'break-all',
      lineHeight: 1.6
    }
  }, serverHash || 'Loading...')), lastSeed && lastSeed.seed && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#4B5563',
      fontWeight: 700,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "LAST ROUND SEED"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#1e293b',
      borderRadius: 8,
      padding: '8px 10px',
      fontSize: 9,
      color: '#C084FC',
      fontFamily: 'monospace',
      wordBreak: 'break-all',
      lineHeight: 1.6
    }
  }, lastSeed.seed), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#4B5563',
      marginTop: 4
    }
  }, "Crashed at: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#F97316'
    }
  }, lastSeed.crashPoint, "x")), /*#__PURE__*/React.createElement("button", {
    onClick: verify,
    style: {
      marginTop: 8,
      padding: '6px 14px',
      background: '#16A34A',
      border: 'none',
      borderRadius: 6,
      color: '#fff',
      fontSize: 10,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "VERIFY NOW"), checked && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 10,
      fontWeight: 700,
      color: checked === 'MATCH' ? '#4ADE80' : '#EF4444'
    }
  }, checked === 'MATCH' ? '✅ Hash matches — fair!' : '❌ Mismatch!')), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    style: {
      marginTop: 8,
      width: '100%',
      padding: '8px',
      background: '#1e293b',
      border: 'none',
      borderRadius: 8,
      color: '#64748B',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "CLOSE")));
}

/* ════════════ CHAT PANEL ════════════ */
function ChatPanel({
  user,
  socket
}) {
  const [msgs, setMsgs] = React.useState([]);
  const [txt, setTxt] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const bottomRef = React.useRef(null);
  React.useEffect(() => {
    socket.on('chat:history', data => setMsgs(data || []));
    socket.on('chat', msg => {
      setMsgs(m => [...m.slice(-79), msg]);
      if (!open) setUnread(n => n + 1);
    });
    const onBot = e => {
      setMsgs(m => [...m.slice(-79), e.detail]);
      if (!open) setUnread(n => n + 1);
    };
    window.addEventListener('bot-chat', onBot);
    return () => {
      socket.off('chat:history');
      socket.off('chat');
      window.removeEventListener('bot-chat', onBot);
    };
  }, [open]);
  React.useEffect(() => {
    if (open) setUnread(0);
  }, [open, msgs]);
  function send() {
    const t = txt.trim();
    if (!t || !user) return;
    // Message is silently discarded — it vanishes after typing
    setTxt('');
  }
  const chatEmojis = ['🔥', '🚀', '💸', '😂', '😭', '🙏', '💀'];
  return /*#__PURE__*/React.createElement(React.Fragment, null, !open && /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    style: {
      position: 'fixed',
      bottom: 80,
      right: 0,
      background: 'linear-gradient(135deg,#1D4ED8,#1e3a8a)',
      border: 'none',
      borderTopLeftRadius: 22,
      borderBottomLeftRadius: 22,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '9px 14px 9px 11px',
      boxShadow: '-3px 2px 14px rgba(37,99,235,0.55)',
      zIndex: 500
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17
    }
  }, "💬"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#fff',
      letterSpacing: .5
    }
  }, "Live Chat"), unread > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      background: '#EF4444',
      borderRadius: 10,
      minWidth: 16,
      height: 16,
      fontSize: 9,
      fontWeight: 900,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px'
    }
  }, unread)), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: 'min(100vw,340px)',
      height: '65vh',
      background: '#0d0d1a',
      borderTop: '2px solid #1e293b',
      borderLeft: '2px solid #1e293b',
      borderTopLeftRadius: 16,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 600,
      boxShadow: '-4px 0 30px rgba(0,0,0,0.7)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      borderBottom: '1px solid #1e293b',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 12,
      color: '#F1F5F9',
      letterSpacing: 1
    }
  }, "💬 LIVE CHAT"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    style: {
      background: 'transparent',
      border: 'none',
      color: '#4B5563',
      cursor: 'pointer',
      fontSize: 16,
      lineHeight: 1
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'hidden',
      padding: '8px 12px',
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 4,
      position: 'relative',
      maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%)'
    }
  }, msgs.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#374151',
      textAlign: 'center',
      marginTop: 20
    }
  }, "Hakuna messages bado..."), [...msgs].reverse().map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'flex-start',
      animation: 'fadeIn 0.4s ease'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#C084FC',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      paddingTop: 1
    }
  }, m.username), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#CBD5E1',
      lineHeight: 1.4,
      wordBreak: 'break-word'
    }
  }, m.text))), /*#__PURE__*/React.createElement("div", {
    ref: bottomRef
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 10px',
      borderTop: '1px solid #1e293b',
      flexShrink: 0
    }
  }, user && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: '#374151',
      fontWeight: 700,
      letterSpacing: .5,
      marginBottom: 4,
      textAlign: 'center'
    }
  }, "🔒 Your messages are private"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      marginBottom: 5
    }
  }, chatEmojis.map(e => /*#__PURE__*/React.createElement("button", {
    key: e,
    onClick: () => setTxt(t => t + e),
    style: {
      background: 'transparent',
      border: 'none',
      fontSize: 15,
      cursor: 'pointer',
      padding: '1px'
    }
  }, e))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: txt,
    onChange: e => setTxt(e.target.value),
    onKeyDown: e => e.key === 'Enter' && send(),
    placeholder: user ? 'Sema kitu... (private)' : 'Login to chat',
    disabled: !user,
    style: {
      flex: 1,
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '7px 10px',
      color: '#F1F5F9',
      fontSize: 11,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: send,
    disabled: !user || !txt.trim(),
    style: {
      padding: '7px 12px',
      background: user && txt.trim() ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#1e293b',
      border: 'none',
      borderRadius: 8,
      color: user && txt.trim() ? '#fff' : '#374151',
      fontWeight: 700,
      fontSize: 11,
      cursor: user && txt.trim() ? 'pointer' : 'not-allowed'
    }
  }, "SEND")))));
}

/* ════════════ REFERRAL WIDGET ════════════ */
function ReferralWidget({
  user
}) {
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [link, setLink] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (open && user && !code) {
      fetch('/api/referral/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: user.phone
        })
      }).then(r => r.json()).then(res => {
        if (res.ok) {
          setCode(res.code);
          setLink(res.link);
        }
      });
    }
  }, [open]);
  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  }
  function fallbackCopy() {
    const el = document.createElement('textarea');
    el.value = link;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {}
    document.body.removeChild(el);
  }
  if (!open) return /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      background: 'transparent',
      border: '1px solid #16A34A44',
      borderRadius: 20,
      padding: '3px 10px',
      color: '#4ADE80',
      fontSize: 9,
      cursor: 'pointer',
      fontWeight: 700,
      letterSpacing: 1
    }
  }, "🎁 REFER & EARN");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    },
    onClick: () => setOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: '#0f172a',
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 340,
      border: '1px solid #16A34A44'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 15,
      color: '#4ADE80',
      marginBottom: 4
    }
  }, "🎁 Refer & Earn KES 20"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64748B',
      marginBottom: 16,
      lineHeight: 1.6
    }
  }, "Share your link. When a friend registers and plays, you both get ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#4ADE80'
    }
  }, "KES 20"), " added to your balance."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#4B5563',
      fontWeight: 700,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "YOUR CODE"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#052e16,#0a1f0a)',
      border: '2px solid #16A34A',
      borderRadius: 10,
      padding: '12px',
      textAlign: 'center',
      fontSize: 22,
      fontWeight: 900,
      color: '#4ADE80',
      letterSpacing: 6,
      fontFamily: 'monospace'
    }
  }, code || '...')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#4B5563',
      fontWeight: 700,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "YOUR LINK"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#1e293b',
      borderRadius: 8,
      padding: '8px 10px',
      fontSize: 10,
      color: '#60A5FA',
      fontFamily: 'monospace',
      wordBreak: 'break-all',
      cursor: 'pointer'
    },
    onClick: () => link && window.open(link, '_blank')
  }, link || 'Generating...'), link && /*#__PURE__*/React.createElement("a", {
    href: `https://wa.me/?text=${encodeURIComponent('Jiunge nami kwenye Mbogi Angani crash game! 🚀 ' + link)}`,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      width: '100%',
      padding: '8px',
      marginTop: 6,
      background: '#16A34A',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      fontWeight: 700,
      fontSize: 11,
      textDecoration: 'none',
      boxSizing: 'border-box'
    }
  }, "📲 Share via WhatsApp")), /*#__PURE__*/React.createElement("button", {
    onClick: copyLink,
    style: {
      width: '100%',
      padding: '11px',
      background: copied ? '#16A34A' : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
      border: 'none',
      borderRadius: 10,
      color: '#fff',
      fontWeight: 800,
      fontSize: 12,
      cursor: 'pointer'
    }
  }, copied ? '✅ COPIED!' : '📋 COPY LINK'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    style: {
      marginTop: 8,
      width: '100%',
      padding: '8px',
      background: 'transparent',
      border: 'none',
      color: '#4B5563',
      fontSize: 11,
      cursor: 'pointer'
    }
  }, "CLOSE")));
}

/* ════════════ RESPONSIBLE GAMBLING ════════════ */
function RGWidget({
  user
}) {
  const [open, setOpen] = React.useState(false);
  const [limits, setLimits] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [depLimit, setDepLimit] = React.useState('2000');
  const [lossLimit2, setLossLimit2] = React.useState('2000');
  React.useEffect(() => {
    if (open && user) {
      fetch('/api/limits/' + encodeURIComponent(user.phone)).then(r => r.json()).then(res => {
        if (res.ok) {
          setLimits(res);
          setDepLimit(String(res.depositLimit || 2000));
          setLossLimit2(String(res.lossLimit || 2000));
        }
      });
    }
  }, [open]);
  function save() {
    setSaving(true);
    fetch('/api/limits/set', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: user.phone,
        depositLimit: depLimit,
        lossLimit: lossLimit2
      })
    }).then(r => r.json()).then(res => {
      setLimits(res);
      setSaving(false);
      setTimeout(() => setOpen(false), 600);
    });
  }
  if (!open) return /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      background: 'transparent',
      border: '1px solid #33415544',
      borderRadius: 20,
      padding: '3px 10px',
      color: '#64748B',
      fontSize: 9,
      cursor: 'pointer',
      fontWeight: 700,
      letterSpacing: 1
    }
  }, "🛡 PLAY SAFE");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    },
    onClick: () => setOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: '#0f172a',
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 340,
      border: '1px solid #334155'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 14,
      color: '#F1F5F9',
      marginBottom: 4
    }
  }, "🛡 Responsible Gambling"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#4B5563',
      marginBottom: 16,
      lineHeight: 1.6
    }
  }, "Set daily limits to stay in control. Limits reset every midnight. Help: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#4ADE80'
    }
  }, "+254 738 425 134")), limits && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: '#1e293b',
      borderRadius: 8,
      padding: '8px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: '#4B5563',
      fontWeight: 700,
      letterSpacing: 1,
      marginBottom: 2
    }
  }, "TODAY DEPOSITED"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#60A5FA'
    }
  }, "KES ", (limits.dailyDeposit || 0).toLocaleString())), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: '#1e293b',
      borderRadius: 8,
      padding: '8px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: '#4B5563',
      fontWeight: 700,
      letterSpacing: 1,
      marginBottom: 2
    }
  }, "TODAY LOST"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#EF4444'
    }
  }, "KES ", (limits.dailyLoss || 0).toLocaleString()))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#4B5563',
      fontWeight: 700,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "DAILY DEPOSIT LIMIT (KES)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: depLimit,
    onChange: e => setDepLimit(e.target.value),
    style: {
      width: '100%',
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '8px 10px',
      color: '#F1F5F9',
      fontSize: 13,
      outline: 'none',
      boxSizing: 'border-box'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#4B5563',
      fontWeight: 700,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "DAILY LOSS LIMIT (KES)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: lossLimit2,
    onChange: e => setLossLimit2(e.target.value),
    style: {
      width: '100%',
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '8px 10px',
      color: '#F1F5F9',
      fontSize: 13,
      outline: 'none',
      boxSizing: 'border-box'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    style: {
      width: '100%',
      padding: '11px',
      background: 'linear-gradient(135deg,#0284C7,#0369A1)',
      border: 'none',
      borderRadius: 10,
      color: '#fff',
      fontWeight: 800,
      fontSize: 12,
      cursor: 'pointer'
    }
  }, saving ? 'SAVING...' : 'SAVE LIMITS')), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    style: {
      marginTop: 8,
      width: '100%',
      padding: '8px',
      background: 'transparent',
      border: 'none',
      color: '#4B5563',
      fontSize: 11,
      cursor: 'pointer'
    }
  }, "CLOSE")));
}

/* ════════════ PWA INSTALL BANNER ════════════ */
function InstallBanner() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (window.__pwaReady) setShow(true);
    const h = () => setShow(true);
    window.addEventListener('pwa-ready', h);
    window.addEventListener('appinstalled', () => setShow(false));
    return () => window.removeEventListener('pwa-ready', h);
  }, []);
  if (!show) return null;
  function doInstall() {
    const prompt = window._deferredInstall || _deferredInstall;
    if (!prompt) return;
    prompt.prompt();
    prompt.userChoice.then(() => {
      window._deferredInstall = null;
      _deferredInstall = null;
      setShow(false);
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg,#0f172a,#1e1b4b)',
      borderTop: '2px solid #EF4444',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 9000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24
    }
  }, "✈️"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: '#F1F5F9',
      letterSpacing: .5
    }
  }, "Install Mbogi Angani"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#64748B'
    }
  }, "Add to home screen — plays like an app"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShow(false),
    style: {
      padding: '6px 10px',
      background: 'transparent',
      border: '1px solid #334155',
      borderRadius: 8,
      color: '#64748B',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "Later"), /*#__PURE__*/React.createElement("button", {
    onClick: doInstall,
    style: {
      padding: '6px 12px',
      background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      fontSize: 11,
      fontWeight: 800,
      cursor: 'pointer'
    }
  }, "INSTALL")));
}
function Game({
  user,
  onLogout
}) {
  const [balance, setBalance] = useState(user.balance || 0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [winCelebration, setWinCelebration] = useState(null);
  const [connected, setConnected] = useState(false);
  const [serverHash, setServerHash] = useState('');
  const [lastSeed, setLastSeed] = useState(null);
  const [muted, setMuted] = useState(false);
  const [gs, setGs] = useState(BETTING);
  const [mult, setMult] = useState(1.00);
  const [history, setHistory] = useState([2.14, 1.43, 8.72, 1.07, 45.3, 3.21, 1.88, 2.66, 1.15, 12.4]);
  const [cd, setCd] = useState(5);
  const [startedAt, setStartedAt] = useState(null);
  const [onlineCount, setOnlineCount] = useState(247);

  // Fluctuate online count 100-500
  useEffect(() => {
    const iv = setInterval(() => {
      setOnlineCount(n => {
        const delta = Math.floor(Math.random()*7)-3;
        return Math.max(100, Math.min(500, n+delta));
      });
    }, 3000);
    return ()=>clearInterval(iv);
  }, []);

  // Persist balance changes to localStorage
  useEffect(() => {
    const users = loadUsers();
    const idx = users.findIndex(u => u.phone === user.phone);
    if (idx >= 0) {
      users[idx].balance = balance;
      saveUsers(users);
    }
  }, [balance]);
  const prevGsRef = useRef(null);
  const prevCdRef = useRef(null);
  const engineTickRef = useRef(null);
  const multRef2 = useRef(1);
  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('seed:reveal', data => setLastSeed({
      seed: data.serverSeed,
      hash: data.serverHash,
      crashPoint: data.crashPoint
    }));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', data => {
      const prev = prevGsRef.current;
      // Sound triggers on phase changes
      if (prev === BETTING && data.phase === FLYING) {
        if (!window.__muted) playRoundStart();
        scheduleBotChat('flying');
      }
      if (prev === FLYING && data.phase === CRASHED) {
        if (!window.__muted) playCrash();
        scheduleBotChat('crashed');
        if (engineTickRef.current) {
          clearInterval(engineTickRef.current);
          engineTickRef.current = null;
        }
      }
      if (prev === CRASHED && data.phase === BETTING) {
        if (engineTickRef.current) {
          clearInterval(engineTickRef.current);
          engineTickRef.current = null;
        }
        scheduleBotChat('betting');
      }
      // Engine sound while flying
      if (data.phase === FLYING && prev === FLYING) {
        if (!engineTickRef.current) {
          engineTickRef.current = setInterval(() => {
            if (!window.__muted) _engineUpdate(multRef2.current || 1);
          }, 400);
        }
      }
      // Countdown tick in last 3 seconds
      if (data.phase === BETTING && data.countdown <= 3 && data.countdown > 0) {
        const prevCd = prevCdRef.current;
        if (prevCd !== null && Math.floor(prevCd) !== Math.floor(data.countdown)) {
          if (!window.__muted) playCountdownTick();
        }
      }
      prevGsRef.current = data.phase;
      prevCdRef.current = data.countdown;
      setGs(data.phase);
      setMult(data.multiplier);
      setHistory(data.history);
      setCd(data.countdown);
      if (data.serverHash) setServerHash(data.serverHash);
      if (data.startedAt) setStartedAt(data.startedAt);
      if (data.phase === BETTING) setStartedAt(null);
      multRef2.current = data.multiplier;
    });
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('state');
      socket.off('seed:reveal');
      if (engineTickRef.current) clearInterval(engineTickRef.current);
    };
  }, []);
  function handleWin(amount, m) {
    setWinCelebration({
      amount,
      multiplier: m,
      id: Date.now()
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: '#0d0d1a',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      position: 'relative'
    }
  }, winCelebration && /*#__PURE__*/React.createElement(WinCelebration, {
    key: winCelebration.id,
    amount: winCelebration.amount,
    multiplier: winCelebration.multiplier,
    onDone: () => setWinCelebration(null)
  }), /*#__PURE__*/React.createElement(InstallBanner, null), showDeposit && /*#__PURE__*/React.createElement(DepositModal, {
    balance: balance,
    setBalance: setBalance,
    onClose: () => setShowDeposit(false)
  }), showWithdraw && /*#__PURE__*/React.createElement(WithdrawModal, {
    balance: balance,
    setBalance: setBalance,
    user: user,
    onClose: () => setShowWithdraw(false)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(90deg,#08080f,#0f0f1e,#08080f)',
      borderBottom: '2px solid #EF444433',
      flexShrink: 0,
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-row",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-left",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
      borderRadius: 8,
      padding: '5px 12px',
      fontWeight: 900,
      fontSize: 'clamp(11px,4vw,16px)',
      letterSpacing: 2,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      boxShadow: '0 0 18px rgba(239,68,68,0.4)'
    }
  }, "✈ MBOGI ANGANI"), /*#__PURE__*/React.createElement("div", {
    style: { display:'flex', alignItems:'center', gap:8 }
  },
    /*#__PURE__*/React.createElement("div", {
      style: { display:'flex', alignItems:'center', gap:4 }
    },
      /*#__PURE__*/React.createElement("div", { style:{ width:6, height:6, background:connected?'#4ADE80':'#EF4444', borderRadius:'50%', animation:'pulse 2s infinite' } }),
      /*#__PURE__*/React.createElement("span", { style:{ fontSize:8, color:connected?'#4ADE80':'#EF4444', fontWeight:700, letterSpacing:1 } }, connected?'LIVE':'...')
    ),
    /*#__PURE__*/React.createElement("div", { style:{ display:'flex', alignItems:'center', gap:4, background:'#0f1218', borderRadius:6, padding:'3px 8px' } },
      /*#__PURE__*/React.createElement("div", { style:{ width:6, height:6, background:'#22C55E', borderRadius:'50%', animation:'pulse 2s infinite' } }),
      /*#__PURE__*/React.createElement("span", { style:{ fontSize:9, color:'#22C55E', fontWeight:700 } }, onlineCount, ' online')
    )
  ), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.__muted = !window.__muted;
      setMuted(window.__muted);
      if (window.__muted) { _engineStop(); } else { _getCtx(); }
    },
    style: {
      background: muted ? '#1f2937' : 'rgba(239,68,68,0.12)',
      border: muted ? '1px solid #374151' : '1px solid #EF444455',
      borderRadius: 7,
      cursor: 'pointer',
      fontSize: 14,
      padding: '4px 8px',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 3
    },
    title: muted ? 'Unmute' : 'Mute'
  }, muted ? '🔇' : '🔊', /*#__PURE__*/React.createElement('span',{style:{fontSize:8,color:muted?'#6B7280':'#F97316',fontWeight:700}},muted?'OFF':'ON'))), /*#__PURE__*/React.createElement("div", {
    className: "nav-right",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: '#4B5563',
      letterSpacing: 1
    }
  }, "BALANCE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#4ADE80'
    }
  }, "KES ", balance.toLocaleString())), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: 9,
      padding: '4px 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, "👤"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#F9FAFB'
    }
  }, user.username), /*#__PURE__*/React.createElement("div", {
    className: "phone-num",
    style: {
      fontSize: 8,
      color: '#4B5563'
    }
  }, user.phone)), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    title: "Log out",
    style: {
      background: '#1f2937',
      border: 'none',
      color: '#6B7280',
      borderRadius: 5,
      padding: '2px 6px',
      cursor: 'pointer',
      fontSize: 9,
      fontWeight: 700,
      marginLeft: 2
    }
  }, "LOGOUT")))),  /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      paddingBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeposit(true),
    style: {
      flex: 1,
      padding: '8px 0',
      background: 'linear-gradient(135deg,#16A34A,#15803D)',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      fontWeight: 800,
      fontSize: 'clamp(9px,2.5vw,11px)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      boxShadow: '0 2px 10px rgba(22,163,74,0.35)',
      letterSpacing: .5
    }
  }, "↑ DEPOSIT"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowWithdraw(true),
    style: {
      flex: 1,
      padding: '8px 0',
      background: 'linear-gradient(135deg,#9333EA,#7C3AED)',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      fontWeight: 800,
      fontSize: 11,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      boxShadow: '0 2px 10px rgba(147,51,234,0.3)',
      letterSpacing: .5
    }
  }, "↓ WITHDRAW"))), /*#__PURE__*/React.createElement(HistoryBar, {
    history: history
  }), /*#__PURE__*/React.createElement(GameCanvas, {
    gameState: gs,
    multiplier: mult,
    serverStartedAt: startedAt
  }), gs === BETTING && /*#__PURE__*/React.createElement(Countdown, {
    val: cd,
    max: 5
  }),
  /* ── BET PANELS: side by side, first below canvas ── */
  /*#__PURE__*/React.createElement("div", {
    className: "bet-row",
    style: { display:'flex', gap:8, padding:'8px 8px 0', borderTop:'1px solid #1f2937' }
  },
    /*#__PURE__*/React.createElement(BetPanel, { gameState:gs, balance:balance, setBalance:setBalance, multiplier:mult, onWin:handleWin }),
    /*#__PURE__*/React.createElement(BetPanel, { gameState:gs, balance:balance, setBalance:setBalance, multiplier:mult, onWin:handleWin })
  ),
  /* ── CHAT LEFT | BETS RIGHT ── */
  /*#__PURE__*/React.createElement("div", {
    className: "bottom-row",
    style: { display:'grid', gridTemplateColumns:'clamp(130px,36%,250px) 1fr', alignItems:'stretch', borderTop:'1px solid #1f2937', marginTop:8 }
  },
    /*#__PURE__*/React.createElement("div", {
      className: "chat-col",
      style: { minHeight:0, minWidth:0, borderRight:'1px solid #1f2937', display:'flex', flexDirection:'column', overflow:'hidden' }
    },
      /*#__PURE__*/React.createElement("div", {
        style:{ padding:'6px 10px', borderBottom:'1px solid #1f2937', fontSize:10, fontWeight:800, color:'#F97316', display:'flex', alignItems:'center', gap:5, flexShrink:0 }
      },
        /*#__PURE__*/React.createElement("div",{style:{width:6,height:6,background:'#22C55E',borderRadius:'50%',animation:'pulse 2s infinite'}}),
        "LIVE CHAT"
      ),
      /*#__PURE__*/React.createElement(ChatSidebar, { user:user, socket:socket })
    ),
    /*#__PURE__*/React.createElement("div", { style:{ minWidth:0, minHeight:0 } },
      /*#__PURE__*/React.createElement(LivePanel, { gameState:gs, multiplier:mult })
    )
  ));
}

/* ════════════════════════════════════════
   APP ROOT — orchestrates all screens
════════════════════════════════════════ */
function App() {
  const [user, setUser] = useState(() => loadSession());
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'register'

  function handleLogin(u) {
    setUser(u);
    setAuthModal(null);
  }
  function handleLogout() {
    clearSession();
    setUser(null);
  }

  // Real server state for landing page — same socket as Game
  const [bgGs, setBgGs] = React.useState(BETTING);
  const [bgMult, setBgMult] = React.useState(1.00);
  const [bgHistory, setBgHistory] = React.useState([2.14, 1.43, 8.72, 1.07, 45.3, 3.21, 1.88, 2.66, 1.15, 12.4]);
  const [bgCd, setBgCd] = React.useState(5);
  React.useEffect(() => {
    if (user) return;
    socket.on('state', data => {
      setBgGs(data.phase);
      setBgMult(data.multiplier);
      setBgHistory(data.history);
      setBgCd(data.countdown);
    });
    return () => socket.off('state');
  }, [user]);
  if (user) return /*#__PURE__*/React.createElement(Game, {
    user: user,
    onLogout: handleLogout
  });

  // Logged-out view: full game interface with Login/Register in top nav
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: '#0d0d1a',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(InstallBanner, null), authModal && /*#__PURE__*/React.createElement("div", {
    onClick: () => setAuthModal(null),
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: 400,
      animation: 'fadeIn 0.2s ease'
    }
  }, /*#__PURE__*/React.createElement(AuthWall, {
    onLogin: handleLogin,
    initialTab: authModal,
    onClose: () => setAuthModal(null)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(90deg,#08080f,#0f0f1e,#08080f)',
      borderBottom: '2px solid #EF444433',
      flexShrink: 0,
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
      borderRadius: 8,
      padding: '5px 12px',
      fontWeight: 900,
      fontSize: 'clamp(11px,4vw,16px)',
      letterSpacing: 2,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      boxShadow: '0 0 18px rgba(239,68,68,0.4)'
    }
  }, "✈ MBOGI ANGANI"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 6,
      height: 6,
      background: '#4ADE80',
      borderRadius: '50%',
      animation: 'pulse 2s infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: '#4ADE80',
      fontWeight: 700,
      letterSpacing: 1
    }
  }, "LIVE"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthModal('login'),
    style: {
      padding: '6px 18px',
      background: 'transparent',
      border: '2px solid #EF4444',
      borderRadius: 8,
      color: '#EF4444',
      fontWeight: 800,
      fontSize: 12,
      cursor: 'pointer',
      letterSpacing: .5
    }
  }, "Login"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthModal('register'),
    style: {
      padding: '6px 18px',
      background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      fontWeight: 800,
      fontSize: 12,
      cursor: 'pointer',
      boxShadow: '0 0 14px rgba(239,68,68,0.35)',
      letterSpacing: .5
    }
  }, "Register"))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 9,
      color: '#4B5563',
      paddingBottom: 4,
      letterSpacing: .5
    }
  }, "Helpline: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#4ADE80',
      fontWeight: 700
    }
  }, "+254 738 425 134"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '8px 12px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthModal('login'),
    style: {
      flex: 1,
      padding: '8px 0',
      background: 'linear-gradient(135deg,#16A34A,#15803D)',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      fontWeight: 800,
      fontSize: 'clamp(9px,2.5vw,11px)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      boxShadow: '0 2px 10px rgba(22,163,74,0.35)',
      letterSpacing: .5
    }
  }, "↑ DEPOSIT"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthModal('login'),
    style: {
      flex: 1,
      padding: '8px 0',
      background: 'linear-gradient(135deg,#9333EA,#7C3AED)',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      fontWeight: 800,
      fontSize: 11,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      boxShadow: '0 2px 10px rgba(147,51,234,0.3)',
      letterSpacing: .5
    }
  }, "↓ WITHDRAW")), /*#__PURE__*/React.createElement(HistoryBar, {
    history: bgHistory
  }), /*#__PURE__*/React.createElement(GameCanvas, {
    gameState: bgGs,
    multiplier: bgMult
  }), bgGs === BETTING && /*#__PURE__*/React.createElement(Countdown, {
    val: bgCd,
    max: 5
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 max(8px,2vw) 0',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(LivePanel, {
    gameState: bgGs,
    multiplier: bgMult,
    fill: true
  })));
}

/* ── PWA: Service Worker + Install Prompt ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
let _deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstall = e;
  window.__pwaReady = true;
  // Notify React
  window.dispatchEvent(new Event('pwa-ready'));
});
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));