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

/* ════════════ SOUND ENGINE ════════════ */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
function getACtx() {
  if (!actx) {
    try {
      actx = new AudioCtx();
    } catch (e) {}
  }
  return actx;
}
function playTone(freq, type, duration, vol = 0.15, fadeIn = 0, rampDown = true) {
  const ctx = getACtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(fadeIn ? 0 : vol, ctx.currentTime);
    if (fadeIn) gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + fadeIn);
    if (rampDown) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}
function playEngine(multiplier) {
  const ctx = getACtx();
  if (!ctx) return;
  try {
    const base = 55 + Math.min(multiplier * 14, 220);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}
function playCrash() {
  const ctx = getACtx();
  if (!ctx) return;
  try {
    // Explosion: filtered noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    // Descending whistle
    const w = ctx.createOscillator();
    const wg = ctx.createGain();
    w.connect(wg);
    wg.connect(ctx.destination);
    w.type = 'sine';
    w.frequency.setValueAtTime(600, ctx.currentTime);
    w.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
    wg.gain.setValueAtTime(0.2, ctx.currentTime);
    wg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    w.start();
    w.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}
function playBet() {
  playTone(440, 'sine', 0.12, 0.12, 0.01, true);
}
function playCashout(mult) {
  // Rising chime — higher pitch for bigger multiplier
  const freq = Math.min(300 + mult * 40, 1200);
  playTone(freq, 'sine', 0.3, 0.18, 0.02, true);
  setTimeout(() => playTone(freq * 1.25, 'sine', 0.25, 0.12, 0, true), 120);
  setTimeout(() => playTone(freq * 1.5, 'sine', 0.2, 0.08, 0, true), 240);
}
function playCountdownTick() {
  playTone(220, 'square', 0.06, 0.06);
}
function playRoundStart() {
  playTone(330, 'sine', 0.15, 0.15, 0.01, true);
  setTimeout(() => playTone(440, 'sine', 0.2, 0.12, 0, true), 100);
  setTimeout(() => playTone(550, 'sine', 0.25, 0.1, 0, true), 200);
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
  multiplier
}) {
  const canvasRef = useRef(null);
  const gsRef = useRef(gameState);
  const multRef = useRef(multiplier);
  gsRef.current = gameState;
  multRef.current = multiplier;
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
        st.visualStart = now;
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
function LivePanel({
  gameState,
  multiplier
}) {
  const [tab, setTab] = useState('all');
  const betsRef = useRef(Array.from({
    length: 12
  }, mkBotWithTarget));
  const [displayBets, setDisplayBets] = useState(() => betsRef.current.slice(0, 10));
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
        length: 12
      }, mkBotWithTarget);
      setDisplayBets(betsRef.current.slice(0, 10));
      return;
    }
    if (gameState === CRASHED) {
      // Any bot that hasn't cashed out yet loses
      betsRef.current = betsRef.current.map(x => x.cashout ? x : {
        ...x,
        lost: true
      });
      setDisplayBets(betsRef.current.slice(0, 10));
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
      if (changed) setDisplayBets([...betsRef.current.slice(0, 10)]);
    }, 300);
    return () => clearInterval(iv);
  }, [gameState]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#111827',
      borderRadius: 10,
      border: '1px solid #1f2937',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      borderBottom: '1px solid #1f2937'
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
  }, t.l)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      fontSize: 10,
      color: '#374151'
    }
  }, displayBets.length, " players")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 150,
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
function Game({
  user,
  onLogout
}) {
  const [balance, setBalance] = useState(user.balance || 0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [winCelebration, setWinCelebration] = useState(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [gs, setGs] = useState(BETTING);
  const [mult, setMult] = useState(1.00);
  const [history, setHistory] = useState([2.14, 1.43, 8.72, 1.07, 45.3, 3.21, 1.88, 2.66, 1.15, 12.4]);
  const [cd, setCd] = useState(5);

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
  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', data => {
      const prev = prevGsRef.current;
      // Sound triggers on phase changes
      if (prev === BETTING && data.phase === FLYING) {
        if (!window.__muted) playRoundStart();
      }
      if (prev === FLYING && data.phase === CRASHED) {
        if (!window.__muted) playCrash();
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
      }
      // Engine sound while flying
      if (data.phase === FLYING && prev === FLYING) {
        if (!engineTickRef.current) {
          engineTickRef.current = setInterval(() => {
            if (!window.__muted) playEngine(data.multiplier || 1);
          }, 300);
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
    });
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('state');
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
  }), showDeposit && /*#__PURE__*/React.createElement(DepositModal, {
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
      background: connected ? '#4ADE80' : '#EF4444',
      borderRadius: '50%',
      animation: 'pulse 2s infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: connected ? '#4ADE80' : '#EF4444',
      fontWeight: 700,
      letterSpacing: 1
    }
  }, connected ? 'LIVE' : '...')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.__muted = !window.__muted;
      setMuted(window.__muted);
    },
    style: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: 14,
      padding: '2px 4px',
      opacity: 0.7
    },
    title: muted ? 'Unmute' : 'Mute'
  }, muted ? '🔇' : '🔊')), /*#__PURE__*/React.createElement("div", {
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
  }, "LOGOUT")))), /*#__PURE__*/React.createElement("div", {
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
  }, "+254 738 425 134")), /*#__PURE__*/React.createElement("div", {
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
      fontSize: 11,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      boxShadow: '0 2px 10px rgba(22,163,74,0.35)',
      letterSpacing: .5
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12l7-7 7 7"
  })), "DEPOSIT"), /*#__PURE__*/React.createElement("button", {
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
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 19V5M5 12l7 7 7-7"
  })), "WITHDRAW"))), /*#__PURE__*/React.createElement(HistoryBar, {
    history: history
  }), /*#__PURE__*/React.createElement(GameCanvas, {
    gameState: gs,
    multiplier: mult
  }), gs === BETTING && /*#__PURE__*/React.createElement(Countdown, {
    val: cd,
    max: 5
  }), /*#__PURE__*/React.createElement("div", {
    className: "bet-row",
    style: {
      display: 'flex',
      gap: 10,
      padding: '8px max(8px,2vw) 6px'
    }
  }, /*#__PURE__*/React.createElement(BetPanel, {
    gameState: gs,
    balance: balance,
    setBalance: setBalance,
    multiplier: mult,
    onWin: handleWin
  }), /*#__PURE__*/React.createElement(BetPanel, {
    gameState: gs,
    balance: balance,
    setBalance: setBalance,
    multiplier: mult,
    onWin: handleWin
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 max(8px,2vw) 16px'
    }
  }, /*#__PURE__*/React.createElement(LivePanel, {
    gameState: gs,
    multiplier: mult
  })));
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
  }, authModal && /*#__PURE__*/React.createElement("div", {
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
      fontSize: 11,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      boxShadow: '0 2px 10px rgba(22,163,74,0.35)',
      letterSpacing: .5
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12l7-7 7 7"
  })), "DEPOSIT"), /*#__PURE__*/React.createElement("button", {
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
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 19V5M5 12l7 7 7-7"
  })), "WITHDRAW")), /*#__PURE__*/React.createElement(HistoryBar, {
    history: bgHistory
  }), /*#__PURE__*/React.createElement(GameCanvas, {
    gameState: bgGs,
    multiplier: bgMult
  }), bgGs === BETTING && /*#__PURE__*/React.createElement(Countdown, {
    val: bgCd,
    max: 5
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 max(8px,2vw) 16px'
    }
  }, /*#__PURE__*/React.createElement(LivePanel, {
    gameState: bgGs,
    multiplier: bgMult
  })));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
window.MA_CONFIG={dailyDeposit:2000,dailyLoss:2000};
window.addEventListener('load',()=>{const b=document.createElement('div');b.id='botFeed';b.style='position:fixed;right:10px;top:80px;width:220px;height:300px;background:#111;overflow:auto;z-index:9999;padding:8px;border-radius:12px';document.body.appendChild(b);const msgs=['wueh leo ni moto','toa mapema bro','eh mzee imeenda','cash out sasa','noma sana','weh usikawie'];setInterval(()=>{b.innerHTML+='<div style="margin:4px 0">🤖 '+msgs[Math.floor(Math.random()*msgs.length)]+'</div>';b.scrollTop=b.scrollHeight;},7000);});