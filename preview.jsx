import { useState, useEffect, useRef, useCallback } from "react";

/* ── Google Fonts ── */
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Shippori+Mincho:wght@400;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

/* ── CSS ── */
const styleEl = document.createElement("style");
styleEl.textContent = `
  @keyframes modalIn { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes notifSlideIn { from{opacity:0;transform:translateX(-50%) translateY(-110%)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes notifSlideOut { from{opacity:1;transform:translateX(-50%) translateY(0)} to{opacity:0;transform:translateX(-50%) translateY(-110%)} }
  @keyframes barGrow { from{width:0%} to{width:var(--bar-w)} }
  * { box-sizing:border-box; }
  body { margin:0; }
  input[type=range] { -webkit-appearance:none; appearance:none; height:6px; border-radius:10px; outline:none; cursor:pointer; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:50%; background:var(--accent,#2d5be3); cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.2); }
`;
document.head.appendChild(styleEl);

/* ── 定数 ── */
const GAS_URL = "https://script.google.com/macros/s/AKfycbxBHYu4xEKRCBy5E8g77hnrfPHkgLaaDaBfrchV7LGdo5JjA9aR-9psmtv7JncvY3iw/exec";
const USE_GAS = true;
const ADMIN_EMAIL = "aoichuikenbakoseitokai@gmail.com";
const PROGRESS_OPTIONS = ["未着手", "進行中", "完了"];
const PROGRESS_STYLE = {
  "未着手": { bg:"#f1f5f9", color:"#64748b", border:"#cbd5e1" },
  "進行中": { bg:"#fff7ed", color:"#c2410c", border:"#fed7aa" },
  "完了":   { bg:"#f0faf4", color:"#1a7a4a", border:"#a7dfc0" },
};
const WD = ["日","月","火","水","木","金","土"];

/* ── カラーテーマ ── */
const THEMES = {
  light: {
    ink:"#1a1a1e", inkMid:"#4a4a52", inkLight:"#8a8a95",
    rule:"#e6e6ec", wash:"#f7f7fa", paper:"#ffffff",
    accent:"#2d5be3", accentBg:"#f0f4ff",
    green:"#1a7a4a", greenBg:"#f0faf4",
    amber:"#b45309", amberBg:"#fffbeb",
    danger:"#be123c", dangerBg:"#fff1f2",
    navBg:"#ffffff", headerBg:"#ffffff",
  },
  dark: {
    ink:"#e8e8f0", inkMid:"#a0a0b0", inkLight:"#606070",
    rule:"#2e2e3e", wash:"#12121a", paper:"#1e1e2a",
    accent:"#5b7ff5", accentBg:"#1a2040",
    green:"#34c778", greenBg:"#0d2a1a",
    amber:"#f0a030", amberBg:"#2a1e00",
    danger:"#f06080", dangerBg:"#2a0d18",
    navBg:"#1e1e2a", headerBg:"#1e1e2a",
  },
};

const FB = "'Zen Kaku Gothic New', sans-serif";
const FS = "'Shippori Mincho', serif";

/* ── スタイルヘルパー（テーマ対応） ── */
const mkStyles = (C) => ({
  card:    { background:C.paper, border:`1px solid ${C.rule}`, borderRadius:16, padding:24, boxShadow:"0 1px 4px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)" },
  hdg:     (sz=17) => ({ fontFamily:FS, fontWeight:600, fontSize:sz, color:C.ink, display:"flex", alignItems:"center", gap:8, margin:0, padding:0 }),
  dot:     { width:6, height:6, borderRadius:"50%", background:C.accent, flexShrink:0, display:"inline-block" },
  lbl:     { display:"block", fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:"0.06em", color:C.inkMid, textTransform:"uppercase", marginBottom:6 },
  inp:     { width:"100%", fontFamily:FB, fontSize:14, color:C.ink, background:C.wash, border:`1px solid ${C.rule}`, borderRadius:10, padding:"10px 14px", outline:"none" },
  btnP:    { fontFamily:FB, background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 },
  btnO:    { fontFamily:FB, background:C.paper, border:`1px solid ${C.rule}`, borderRadius:10, padding:"9px 18px", fontSize:14, fontWeight:700, cursor:"pointer", color:C.inkMid, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 },
  btnSm:   { padding:"6px 12px", fontSize:12, borderRadius:6 },
  divider: { marginBottom:18, paddingBottom:12, borderBottom:`1px solid ${C.rule}` },
});

/* ── useWindowWidth ── */
function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

/* ── GAS通信 ── */
async function gasGet(action) {
  const res = await fetch(`${GAS_URL}?action=${action}`);
  return res.json();
}
async function gasPost(body) {
  const res = await fetch(GAS_URL, { method:"POST", body:JSON.stringify(body) });
  return res.json();
}

/* ── パスワードハッシュ ── */
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ── 進捗バー（アニメーション修正版） ── */
function AnimBar({ pct, color }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const start = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, pct));
    const origin = from.current;
    cancelAnimationFrame(raf.current);
    start.current = null;

    const animate = (ts) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / 600, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const cur = origin + (target - origin) * ease;
      setDisplay(Math.round(cur));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
      else { from.current = target; }
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [pct]);

  return (
    <div style={{ height:6, background:"rgba(128,128,128,0.15)", borderRadius:10, overflow:"hidden" }}>
      <div style={{ height:"100%", background:color, borderRadius:10, width:`${display}%`, transition:"none" }} />
    </div>
  );
}

/* ── 進捗スライダー（ローカルstate管理でスムーズ操作） ── */
function PctSlider({ row, pct, progress, onSetPct, onSetProgress, C }) {
  const [localPct, setLocalPct] = useState(pct);
  const timer = useRef(null);
  useEffect(() => { setLocalPct(pct); }, [pct]);
  const handleChange = (e) => {
    const val = Number(e.target.value);
    setLocalPct(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSetPct(row, val), 400);
  };
  const bg = `linear-gradient(to right, ${C.accent} ${localPct}%, ${C.rule} ${localPct}%)`;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <select value={progress} onChange={e=>onSetProgress(row, e.target.value)}
        style={{ fontFamily:"'Zen Kaku Gothic New',sans-serif", fontSize:12, color:C.ink, background:C.wash, border:`1px solid ${C.rule}`, borderRadius:6, padding:"4px 8px", outline:"none", cursor:"pointer" }}>
        {["未着手","進行中","完了"].map(p=><option key={p} value={p}>{p}</option>)}
      </select>
      <input type="range" min={0} max={100} step={1} value={localPct}
        onChange={handleChange}
        style={{ flex:1, background:bg, cursor:"pointer" }} />
      <span style={{ fontFamily:"'Zen Kaku Gothic New',sans-serif", fontSize:11, fontWeight:700, color:C.accent, minWidth:32, textAlign:"right" }}>{localPct}%</span>
    </div>
  );
}

/* ── AOIローディング画面 ── */
function AoiLoading() {
  return (
    <div style={{ position:"fixed", inset:0, background:"#e8f4ff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ position:"relative", display:"inline-block", marginBottom:24 }}>
        <svg width="120" height="140" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="60" cy="105" rx="32" ry="38" fill="#29b6e8"/>
          <circle cx="60" cy="58" r="38" fill="#29b6e8"/>
          <ellipse cx="22" cy="52" rx="14" ry="22" fill="#8dd44a" transform="rotate(-15 22 52)"/>
          <ellipse cx="98" cy="52" rx="14" ry="22" fill="#8dd44a" transform="rotate(15 98 52)"/>
          <circle cx="44" cy="55" r="10" fill="white"/>
          <circle cx="76" cy="55" r="10" fill="white"/>
          <circle cx="44" cy="57" r="6" fill="#1a1a2e"/>
          <circle cx="76" cy="57" r="6" fill="#1a1a2e"/>
          <circle cx="46" cy="55" r="2" fill="white"/>
          <circle cx="78" cy="55" r="2" fill="white"/>
          <ellipse cx="60" cy="68" rx="5" ry="4" fill="#f8a4c8"/>
          <path d="M52 74 Q60 80 68 74" stroke="#1a1a2e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <circle cx="50" cy="30" r="4" fill="#8dd44a"/>
          <circle cx="60" cy="24" r="4" fill="#8dd44a"/>
          <circle cx="70" cy="30" r="4" fill="#8dd44a"/>
          <circle cx="18" cy="100" r="10" fill="#ffd44a"/>
          <circle cx="18" cy="100" r="5" fill="#f8a4c8"/>
          <circle cx="102" cy="100" r="10" fill="#ffd44a"/>
          <circle cx="102" cy="100" r="5" fill="#f8a4c8"/>
          <text x="60" y="115" textAnchor="middle" fill="#f8a4c8" fontSize="14" fontWeight="bold" fontFamily="sans-serif">AOI</text>
        </svg>
        <div style={{ position:"absolute", top:-16, left:"50%", transform:"translateX(-50%)" }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#c8e8ff" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="#29b6e8" strokeWidth="3"
              strokeDasharray="60 36" strokeLinecap="round"
              style={{ transformOrigin:"18px 18px", animation:"aoiSpin 1s linear infinite" }}/>
          </svg>
        </div>
      </div>
      <div style={{ fontFamily:"'Zen Kaku Gothic New',sans-serif", fontSize:16, fontWeight:700, color:"#29b6e8", letterSpacing:"0.05em" }}>AOIがよみこんでいるよ！</div>
      <div style={{ fontFamily:"'Zen Kaku Gothic New',sans-serif", fontSize:12, color:"#6bc8e8", marginTop:4 }}>ちょっとまってね…</div>
      <style>{`@keyframes aoiSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

/* ============================================================
   ログイン・登録画面
   ============================================================ */
function AuthPage({ onLogin, C, S }) {
  const [mode, setMode]     = useState("login");
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [pw2, setPw2]       = useState("");
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade]   = useState("");
  const [classNum, setClassNum] = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !pw) { setError("メールアドレスとパスワードを入力してください"); return; }
    setLoading(true); setError("");
    try {
      const hash = await hashPassword(pw);
      const res = await gasPost({ action:"login", email:email.trim().toLowerCase(), passwordHash:hash });
      if (res.ok) { localStorage.setItem("authUser", JSON.stringify(res.user)); onLogin(res.user); }
      else setError(res.error || "ログインに失敗しました");
    } catch(e) { setError("通信エラーが発生しました"); }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email.trim() || !pw || !displayName.trim()) { setError("必須項目を入力してください"); return; }
    if (pw !== pw2) { setError("パスワードが一致しません"); return; }
    if (pw.length < 6) { setError("パスワードは6文字以上にしてください"); return; }
    setLoading(true); setError("");
    try {
      const hash = await hashPassword(pw);
      const res = await gasPost({ action:"register", email:email.trim().toLowerCase(), passwordHash:hash, displayName:displayName.trim(), grade:grade.trim(), classNum:classNum.trim() });
      if (res.ok) { localStorage.setItem("authUser", JSON.stringify(res.user)); onLogin(res.user); }
      else setError(res.error || "登録に失敗しました");
    } catch(e) { setError("通信エラーが発生しました"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.wash, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ ...S.card, width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontFamily:FS, fontWeight:600, fontSize:22, color:C.ink, marginBottom:6 }}>みんなの意見箱</div>
          <div style={{ fontFamily:FB, fontSize:13, color:C.inkLight }}>葵中学校 生徒会</div>
        </div>
        <div style={{ display:"flex", borderRadius:10, overflow:"hidden", border:`1px solid ${C.rule}`, marginBottom:24 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex:1, fontFamily:FB, fontSize:13, fontWeight:700, padding:"10px 0", border:"none", cursor:"pointer", background:mode===m?C.accent:C.paper, color:mode===m?"#fff":C.inkMid, transition:"all .15s" }}>
              {m==="login"?"ログイン":"新規登録"}
            </button>
          ))}
        </div>
        {mode === "login" ? (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={S.lbl}>メールアドレス</label>
              <input style={S.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@gmail.com" />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={S.lbl}>パスワード</label>
              <input style={S.inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="パスワードを入力" />
            </div>
            {error && <div style={{ fontFamily:FB, fontSize:12, color:C.danger, marginBottom:14 }}>{error}</div>}
            <button style={{ ...S.btnP, width:"100%", justifyContent:"center" }} onClick={handleLogin} disabled={loading}>{loading?"ログイン中...":"ログイン"}</button>
          </>
        ) : (
          <>
            <div style={{ fontFamily:FB, fontSize:12, color:C.accent, background:C.accentBg, borderRadius:8, padding:"10px 14px", marginBottom:18, lineHeight:1.6 }}>
              💡 意見は必ず<strong>匿名</strong>で他の生徒に表示されます。
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.lbl}>メールアドレス <span style={{ color:C.danger }}>*</span></label>
              <input style={S.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@gmail.com" />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.lbl}>表示名 <span style={{ color:C.danger }}>*</span></label>
              <input style={S.inp} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="例：田中太郎" maxLength={20} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div><label style={S.lbl}>学年</label><input style={S.inp} value={grade} onChange={e=>setGrade(e.target.value)} placeholder="例：2" maxLength={1} /></div>
              <div><label style={S.lbl}>クラス</label><input style={S.inp} value={classNum} onChange={e=>setClassNum(e.target.value)} placeholder="例：3" maxLength={1} /></div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.lbl}>パスワード <span style={{ color:C.danger }}>*</span></label>
              <input style={S.inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="6文字以上" />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={S.lbl}>パスワード（確認）<span style={{ color:C.danger }}>*</span></label>
              <input style={S.inp} type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleRegister()} placeholder="もう一度入力" />
            </div>
            {error && <div style={{ fontFamily:FB, fontSize:12, color:C.danger, marginBottom:14 }}>{error}</div>}
            <button style={{ ...S.btnP, width:"100%", justifyContent:"center" }} onClick={handleRegister} disabled={loading}>{loading?"登録中...":"アカウントを作成"}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   設定ページ（アコーディオン式）
   ============================================================ */
function SettingsPage({ user, onUpdateUser, onLogout, darkMode, onToggleDark, C, S }) {
  const [open, setOpen]     = useState(null); // "profile" | "password" | "appearance"
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [grade, setGrade]   = useState(user.grade || "");
  const [classNum, setClassNum] = useState(user.classNum || "");
  const [pw, setPw]         = useState("");
  const [pw2, setPw2]       = useState("");
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = (key) => { setOpen(o => o===key ? null : key); setError(""); setSuccess(""); };

  const saveProfile = async () => {
    if (!displayName.trim()) { setError("表示名を入力してください"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await gasPost({ action:"updateProfile", email:user.email, displayName:displayName.trim(), grade:grade.trim(), classNum:classNum.trim() });
      if (res.ok) { const u={...user,displayName:displayName.trim(),grade:grade.trim(),classNum:classNum.trim()}; localStorage.setItem("authUser",JSON.stringify(u)); onUpdateUser(u); setSuccess("プロフィールを更新しました"); }
      else setError(res.error||"更新に失敗しました");
    } catch(e) { setError("通信エラー"); }
    setLoading(false);
  };

  const savePassword = async () => {
    if (pw.length < 6) { setError("パスワードは6文字以上"); return; }
    if (pw !== pw2) { setError("パスワードが一致しません"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const hash = await hashPassword(pw);
      const res = await gasPost({ action:"updateProfile", email:user.email, displayName:user.displayName, grade:user.grade||"", classNum:user.classNum||"", passwordHash:hash });
      if (res.ok) { setSuccess("パスワードを変更しました"); setPw(""); setPw2(""); }
      else setError(res.error||"変更に失敗しました");
    } catch(e) { setError("通信エラー"); }
    setLoading(false);
  };

  const sections = [
    { key:"profile", label:"プロフィール設定" },
    { key:"password", label:"パスワード変更" },
    { key:"appearance", label:"表示設定" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={S.card}>
        <div style={S.divider}><h1 style={S.hdg(17)}><span style={S.dot}/>設定</h1></div>
        <div style={{ fontFamily:FB, fontSize:13, color:C.inkMid, marginBottom:4 }}>ログイン中：<strong style={{ color:C.ink }}>{user.displayName}</strong></div>
        <div style={{ fontFamily:FB, fontSize:12, color:C.inkLight }}>{user.email}</div>
      </div>

      {sections.map(sec => (
        <div key={sec.key} style={S.card}>
          <button onClick={() => toggle(sec.key)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", padding:0, fontFamily:FB, fontSize:15, fontWeight:700, color:C.ink }}>
            <span>{sec.label}</span>
            <span style={{ color:C.inkLight, fontSize:18, transition:"transform .2s", transform:open===sec.key?"rotate(180deg)":"rotate(0)" }}>▾</span>
          </button>

          {open === "profile" && sec.key === "profile" && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontFamily:FB, fontSize:12, color:C.accent, background:C.accentBg, borderRadius:8, padding:"10px 14px", marginBottom:16, lineHeight:1.6 }}>
                💡 意見は必ず<strong>匿名</strong>で表示されます。
              </div>
              <div style={{ marginBottom:12 }}><label style={S.lbl}>表示名 <span style={{ color:C.danger }}>*</span></label><input style={S.inp} value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={20} /></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <div><label style={S.lbl}>学年</label><input style={S.inp} value={grade} onChange={e=>setGrade(e.target.value)} placeholder="例：2" maxLength={1} /></div>
                <div><label style={S.lbl}>クラス</label><input style={S.inp} value={classNum} onChange={e=>setClassNum(e.target.value)} placeholder="例：3" maxLength={1} /></div>
              </div>
              {error && <div style={{ fontFamily:FB, fontSize:12, color:C.danger, marginBottom:12 }}>{error}</div>}
              {success && <div style={{ fontFamily:FB, fontSize:12, color:C.green, marginBottom:12 }}>{success}</div>}
              <button style={{ ...S.btnP, ...S.btnSm }} onClick={saveProfile} disabled={loading}>{loading?"保存中...":"保存する"}</button>
            </div>
          )}

          {open === "password" && sec.key === "password" && (
            <div style={{ marginTop:20 }}>
              <div style={{ marginBottom:12 }}><label style={S.lbl}>新しいパスワード</label><input style={S.inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="6文字以上" /></div>
              <div style={{ marginBottom:16 }}><label style={S.lbl}>確認</label><input style={S.inp} type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="もう一度入力" /></div>
              {error && <div style={{ fontFamily:FB, fontSize:12, color:C.danger, marginBottom:12 }}>{error}</div>}
              {success && <div style={{ fontFamily:FB, fontSize:12, color:C.green, marginBottom:12 }}>{success}</div>}
              <button style={{ ...S.btnP, ...S.btnSm }} onClick={savePassword} disabled={loading}>{loading?"変更中...":"変更する"}</button>
            </div>
          )}

          {open === "appearance" && sec.key === "appearance" && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontFamily:FB, fontSize:13, color:C.inkMid, marginBottom:14 }}>テーマを選択してください</div>
              <div style={{ display:"flex", gap:10 }}>
                {[{val:false,label:"☀️ ライト"},{val:true,label:"🌙 ダーク"}].map(({val,label}) => (
                  <button key={String(val)} onClick={() => onToggleDark(val)}
                    style={{ flex:1, fontFamily:FB, fontSize:13, fontWeight:700, padding:"12px 0", border:`2px solid ${darkMode===val?C.accent:C.rule}`, borderRadius:10, cursor:"pointer", background:darkMode===val?C.accentBg:C.paper, color:darkMode===val?C.accent:C.inkMid, transition:"all .15s" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={S.card}>
        <button onClick={onLogout} style={{ ...S.btnO, ...S.btnSm, color:C.danger, borderColor:"#f9a8c0" }}>ログアウト</button>
      </div>
    </div>
  );
}

/* ── 確認ダイアログ ── */
function ConfirmDialog({ msg, onOk, onCancel, C, S }) {
  if (!msg) return null;
  return (
    <div onClick={onCancel} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"overlayIn 0.15s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.paper, borderRadius:14, padding:24, width:"100%", maxWidth:340, boxShadow:"0 16px 40px rgba(0,0,0,0.18)", animation:"modalIn 0.18s ease" }}>
        <p style={{ fontFamily:FB, fontSize:14, color:C.ink, marginBottom:20, lineHeight:1.7 }}>{msg}</p>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ ...S.btnO, ...S.btnSm }}>キャンセル</button>
          <button onClick={onOk}     style={{ ...S.btnP, ...S.btnSm }}>確認</button>
        </div>
      </div>
    </div>
  );
}

/* ── 進捗 ── */
function Progress({ C, S }) {
  return <div />;
}

/* ── 意見を送るページ ── */
function SendPage({ onSubmit, C, S }) {
  const [title, setTitle] = useState("");
  const [msg, setMsg]     = useState("");
  const [sent, setSent]   = useState(false);
  const isMobile = useWidth() < 720;

  const submit = () => {
    if (!msg.trim()) { alert("意見を入力してください"); return; }
    onSubmit({ name: title.trim() || "", message: msg.trim() });
    setMsg(""); setTitle(""); setSent(true);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 280px", gap:20, alignItems:"start" }}>
      <div style={S.card}>
        <div style={S.divider}><h1 style={S.hdg(17)}><span style={S.dot}/>意見を送る</h1></div>
        <p style={{ fontFamily:FB, fontSize:13, color:C.inkMid, marginBottom:20, lineHeight:1.7 }}>
          かなえてほしいこと、改善してほしいこと — なんでも書いてください。<br/>
          <strong style={{ color:C.accent }}>意見は匿名で表示されます。</strong>
        </p>
        <div style={{ marginBottom:18 }}>
          <label style={S.lbl}>タイトル <span style={{ textTransform:"none", fontWeight:400, color:C.inkLight }}>（任意）</span></label>
          <input style={S.inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="ここにタイトルを入力してください" maxLength={30} />
        </div>
        <div style={{ marginBottom:4 }}>
          <label style={S.lbl}>意見・要望 <span style={{ color:C.danger }}>*</span></label>
          <textarea style={{ ...S.inp, resize:"none", lineHeight:1.6, minHeight:130 }} value={msg} onChange={e=>setMsg(e.target.value)} placeholder="ここに意見を入力してください" maxLength={500} rows={6} />
          <div style={{ textAlign:"right", fontFamily:FB, fontSize:11, color:msg.length>450?C.amber:C.inkLight, marginTop:4 }}>{msg.length}/500</div>
        </div>
        <div style={{ marginTop:16 }}>
          <button style={S.btnP} onClick={submit}>送信する</button>
        </div>
        {sent && (
          <div style={{ fontFamily:FB, display:"flex", alignItems:"center", gap:10, background:C.greenBg, border:`1px solid #a7dfc0`, borderRadius:10, padding:"12px 16px", marginTop:16, fontSize:14, color:C.green, fontWeight:700 }}>
            ✓ 意見を送信しました。ありがとうございます。
          </div>
        )}
      </div>
      <aside>
        <div style={S.card}>
          <div style={S.divider}><h2 style={S.hdg(14)}><span style={S.dot}/>生徒会の進捗</h2></div>
          <Progress C={C} S={S} />
        </div>
      </aside>
    </div>
  );
}

/* ── みんなの声ページ ── */
function OpinionsPage({ opinions, isAdmin, onToggleAdopt, onSetProgress, onSetPct, onSetReply, C, S }) {
  const [filter, setFilter]   = useState("all");
  const [sortOrder, setSortOrder] = useState(isAdmin?"asc":"desc");
  const [confirmState, setConfirmState] = useState(null);
  const [replyingRow, setReplyingRow]   = useState(null);
  const [replyText, setReplyText]       = useState("");
  const [replyImageData, setReplyImageData] = useState(null);
  const isMobile = useWidth() < 720;

  const openReply  = (item) => { setReplyingRow(item.row); setReplyText(item.reply||""); setReplyImageData(item.replyImage||null); };
  const closeReply = () => { setReplyingRow(null); setReplyText(""); setReplyImageData(null); };
  const saveReply  = (row) => { onSetReply(row, replyText, replyImageData); closeReply(); };
  const handleImagePick = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setReplyImageData(ev.target.result);
    reader.readAsDataURL(file);
  };

  const sorted = [...opinions].sort((a,b) => {
    const diff = new Date(a.timestamp) - new Date(b.timestamp);
    return sortOrder==="asc" ? diff : -diff;
  });
  const filtered = filter==="all" ? sorted
    : ["採用","未採用"].includes(filter) ? sorted.filter(o=>o.status===filter)
    : sorted.filter(o=>o.progress===filter);

  const askConfirm = (row, adopt) => setConfirmState({ row, adopt, msg:adopt?"この意見を採用しますか？":"採用を取り消しますか？" });
  const doConfirm  = () => { onToggleAdopt(confirmState.row, confirmState.adopt); setConfirmState(null); };

  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 280px", gap:20, alignItems:"start" }}>
        <div style={S.card}>
          <div style={{ ...S.divider, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <h1 style={S.hdg(17)}><span style={S.dot}/>みんなの声</h1>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:`1px solid ${C.rule}` }}>
                {["desc","asc"].map(o=>(
                  <button key={o} onClick={()=>setSortOrder(o)}
                    style={{ fontFamily:FB, fontSize:12, fontWeight:700, padding:"6px 12px", border:"none", cursor:"pointer", background:sortOrder===o?C.accent:C.paper, color:sortOrder===o?"#fff":C.inkMid, transition:"all .15s" }}>
                    {o==="desc"?"新しい順":"古い順"}
                  </button>
                ))}
              </div>
              <select style={{ ...S.inp, width:"auto", minWidth:130, fontSize:13 }} value={filter} onChange={e=>setFilter(e.target.value)}>
                <option value="all">すべて表示</option>
                <option value="採用">採用済みのみ</option>
                <option value="未採用">検討中のみ</option>
                <option value="未着手">未着手のみ</option>
                <option value="進行中">進行中のみ</option>
                <option value="完了">完了のみ</option>
              </select>
            </div>
          </div>
          {isAdmin && (
            <div style={{ fontFamily:FB, background:C.amberBg, border:`1px solid ${C.amber}40`, borderRadius:10, padding:"10px 14px", fontSize:13, color:C.amber, fontWeight:700, marginBottom:16 }}>
              管理モード ON — 投稿者の情報が表示されています
            </div>
          )}
          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {filtered.length === 0 ? (
              <div style={{ fontFamily:FB, textAlign:"center", padding:"40px 0", color:C.inkLight, fontSize:13 }}>該当する意見はありません</div>
            ) : filtered.map(item => {
              const adopted = item.status==="採用";
              // タイトル表示ロジック
              const displayTitle = item.name && item.name.trim() ? item.name : "タイトルなし";
              return (
                <div key={item.row} style={{ padding:14, border:`1px solid ${C.rule}`, borderRadius:10, marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8 }}>
                    <div>
                      <div style={{ fontFamily:FB, fontSize:13, fontWeight:700, color:C.ink }}>{displayTitle}</div>
                      {isAdmin && item.authorName && (
                        <div style={{ fontFamily:FB, fontSize:12, color:C.accent, marginTop:2 }}>
                          投稿者：{item.authorName}{item.authorInfo ? `（${item.authorInfo}）` : ""}
                        </div>
                      )}
                      <div style={{ fontFamily:FB, fontSize:11, color:C.inkLight, marginTop:2 }}>{item.timestamp}</div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:100, background:adopted?C.greenBg:C.wash, color:adopted?C.green:C.inkLight, whiteSpace:"nowrap" }}>
                        {adopted?"✓ 採用":"検討中"}
                      </span>
                      {(() => { const ps=PROGRESS_STYLE[item.progress]||PROGRESS_STYLE["未着手"]; return (
                        <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:100, background:ps.bg, color:ps.color, border:`1px solid ${ps.border}`, whiteSpace:"nowrap" }}>
                          {item.progress||"未着手"}
                        </span>
                      ); })()}
                    </div>
                  </div>
                  <div style={{ fontFamily:FB, fontSize:14, lineHeight:1.75 }}>{item.message}</div>

                  {/* 進捗バー */}
                  <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.rule}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.inkMid }}>進捗状況</span>
                      <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.accent }}>{item.pct??0}%</span>
                    </div>
                    {isAdmin ? (
                      <PctSlider row={item.row} pct={item.pct??0} progress={item.progress||"未着手"} onSetPct={onSetPct} onSetProgress={onSetProgress} C={C} />
                    ) : (
                      <AnimBar pct={item.pct??0} color={C.accent} />
                    )}
                  </div>

                  {/* 返信 */}
                  {item.reply && replyingRow!==item.row && (
                    <div style={{ background:C.accentBg, borderRadius:8, padding:"10px 12px", marginTop:10 }}>
                      <div style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.accent, marginBottom:6 }}>生徒会より</div>
                      <div style={{ fontFamily:FB, fontSize:13, lineHeight:1.75, color:C.ink }}>{item.reply}</div>
                      {item.replyImage && <img src={item.replyImage} alt="返信" style={{ marginTop:10, maxWidth:"100%", maxHeight:240, borderRadius:8, objectFit:"contain", display:"block" }} />}
                    </div>
                  )}

                  {isAdmin && replyingRow===item.row && (
                    <div style={{ background:C.accentBg, borderRadius:8, padding:"12px", marginTop:10 }}>
                      <div style={{ fontFamily:FB, fontSize:12, fontWeight:700, color:C.accent, marginBottom:8 }}>返信を編集</div>
                      <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} rows={3} placeholder="返信メッセージ"
                        style={{ ...S.inp, resize:"none", fontSize:13, marginBottom:8, display:"block" }} />
                      <div style={{ marginBottom:10 }}>
                        <label style={{ ...S.lbl, display:"block", marginBottom:4 }}>画像を添付（任意）</label>
                        <input type="file" accept="image/*" onChange={handleImagePick} style={{ fontFamily:FB, fontSize:12, color:C.inkMid }} />
                        {replyImageData && <img src={replyImageData} alt="プレビュー" style={{ marginTop:8, maxWidth:"100%", maxHeight:180, borderRadius:8, objectFit:"contain", display:"block" }} />}
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={()=>saveReply(item.row)} style={{ ...S.btnP, ...S.btnSm }}>保存</button>
                        <button onClick={closeReply} style={{ ...S.btnO, ...S.btnSm }}>キャンセル</button>
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
                      <button onClick={()=>askConfirm(item.row,!adopted)}
                        style={{ fontFamily:FB, background:adopted?C.dangerBg:C.greenBg, border:`1px solid ${adopted?"#f9a8c0":"#a7dfc0"}`, color:adopted?C.danger:C.green, fontSize:12, padding:"5px 12px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>
                        {adopted?"採用を取り消す":"採用する"}
                      </button>
                      {replyingRow!==item.row && (
                        <button onClick={()=>openReply(item)}
                          style={{ fontFamily:FB, background:C.accentBg, border:`1px solid ${C.accent}`, color:C.accent, fontSize:12, padding:"5px 12px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>
                          {item.reply?"返信を編集":"返信を追加"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <aside>
          <div style={S.card}>
            <div style={S.divider}><h2 style={S.hdg(14)}><span style={S.dot}/>生徒会の進捗</h2></div>
            <Progress C={C} S={S} />
          </div>
        </aside>
      </div>
      <ConfirmDialog msg={confirmState?.msg} onOk={doConfirm} onCancel={()=>setConfirmState(null)} C={C} S={S} />
    </>
  );
}

/* ── 予定表 ── */
function EventEditForm({ form, setForm, onSave, onCancel, isNew, C, S }) {
  return (
    <div style={{ background:C.accentBg, border:`1px solid ${C.accent}`, borderRadius:10, padding:14, margin:"8px 0 4px" }}>
      <div style={{ fontFamily:FS, fontWeight:600, fontSize:13, color:C.accent, marginBottom:12 }}>{isNew?"新しい予定を追加":"予定を編集"}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:8, marginBottom:8 }}>
        <div><label style={{ ...S.lbl, fontSize:10 }}>日付</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{ ...S.inp, fontSize:12, padding:"7px 10px" }} /></div>
        <div><label style={{ ...S.lbl, fontSize:10 }}>タイトル</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="例：生徒総会" style={{ ...S.inp, fontSize:12, padding:"7px 10px" }} maxLength={40} /></div>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={{ ...S.lbl, fontSize:10 }}>説明（任意）</label>
        <input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="例：放課後 第2会議室" style={{ ...S.inp, fontSize:12, padding:"7px 10px" }} maxLength={80} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onSave} style={{ ...S.btnP, ...S.btnSm }}>保存</button>
        <button onClick={onCancel} style={{ ...S.btnO, ...S.btnSm }}>キャンセル</button>
      </div>
    </div>
  );
}

function EventsPage({ events, isAdmin, onAddEvent, onEditEvent, onDeleteEvent, C, S }) {
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState({ date:"", title:"", desc:"" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openNew   = () => { setForm({ date:"", title:"", desc:"" }); setEditingId("new"); };
  const openEdit  = (ev) => { setForm({ date:ev.date, title:ev.title, desc:ev.desc }); setEditingId(ev.id); };
  const closeForm = () => setEditingId(null);
  const saveForm  = () => {
    if (!form.date || !form.title.trim()) { alert("日付とタイトルは必須です"); return; }
    if (editingId==="new") onAddEvent(form); else onEditEvent(editingId, form);
    closeForm();
  };

  const groups = {};
  events.forEach(ev => {
    const dt = new Date(ev.date);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    const label = `${dt.getFullYear()}年 ${dt.getMonth()+1}月`;
    if (!groups[key]) groups[key] = { label, items:[] };
    groups[key].items.push({ ...ev, dt });
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={S.card}>
        <div style={S.divider}><h2 style={S.hdg(17)}><span style={S.dot}/>葵中学校 年間行事予定</h2></div>
        <p style={{ fontFamily:FB, fontSize:13, color:C.inkMid, marginBottom:16, lineHeight:1.7 }}>葵中学校 年間行事予定</p>
        <a href="https://cms.oklab.ed.jp/jh/aoi/index.cfm/1,2863,c,html/2863/20260220-134641.pdf" target="_blank" rel="noopener noreferrer" style={S.btnO}>📄 年間行事予定を開く</a>
      </div>
      <div style={S.card}>
        <div style={{ ...S.divider, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <h1 style={S.hdg(17)}><span style={S.dot}/>生徒会活動・行事予定</h1>
          {isAdmin && editingId!=="new" && <button onClick={openNew} style={{ ...S.btnP, ...S.btnSm, gap:4 }}>＋ 追加</button>}
        </div>
        {editingId==="new" && <EventEditForm form={form} setForm={setForm} onSave={saveForm} onCancel={closeForm} isNew={true} C={C} S={S} />}
        {Object.keys(groups).sort().map(key => {
          const g = groups[key];
          return (
            <div key={key} style={{ marginBottom:24 }}>
              <div style={{ fontFamily:FS, fontSize:13, fontWeight:600, color:C.inkLight, letterSpacing:"0.08em", marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.rule}` }}>{g.label}</div>
              {g.items.map((item,i) => (
                <div key={item.id}>
                  <div style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"13px 0", borderBottom:editingId===item.id?"none":(i<g.items.length-1?`1px solid ${C.rule}`:"none") }}>
                    <div style={{ minWidth:52, textAlign:"center", background:C.accentBg, borderRadius:6, padding:"6px 8px 5px", flexShrink:0 }}>
                      <div style={{ fontFamily:FB, fontSize:10, color:C.accent, fontWeight:700 }}>{item.dt.getMonth()+1}月</div>
                      <div style={{ fontFamily:FS, fontSize:22, fontWeight:600, color:C.accent, lineHeight:1.1 }}>{item.dt.getDate()}</div>
                      <div style={{ fontFamily:FB, fontSize:10, color:C.accent, opacity:0.7 }}>（{WD[item.dt.getDay()]}）</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:FB, fontSize:14, fontWeight:700, lineHeight:1.4, color:C.ink }}>{item.title}</div>
                      {item.desc && <div style={{ fontFamily:FB, fontSize:12, color:C.inkMid, marginTop:4, lineHeight:1.6 }}>{item.desc}</div>}
                      {isAdmin && editingId!==item.id && (
                        <div style={{ display:"flex", gap:8, marginTop:8 }}>
                          <button onClick={()=>openEdit(item)} style={{ fontFamily:FB, background:C.accentBg, border:`1px solid ${C.accent}`, color:C.accent, fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>編集</button>
                          <button onClick={()=>setDeleteConfirm({id:item.id,title:item.title})} style={{ fontFamily:FB, background:C.dangerBg, border:`1px solid #f9a8c0`, color:C.danger, fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>削除</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && editingId===item.id && (
                    <div style={{ borderBottom:i<g.items.length-1?`1px solid ${C.rule}`:"none", paddingBottom:8 }}>
                      <EventEditForm form={form} setForm={setForm} onSave={saveForm} onCancel={closeForm} isNew={false} C={C} S={S} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {events.length===0 && <div style={{ fontFamily:FB, textAlign:"center", padding:"32px 0", color:C.inkLight, fontSize:13 }}>予定がありません</div>}
      </div>
      <ConfirmDialog msg={deleteConfirm?`「${deleteConfirm.title}」を削除してもよいですか？`:null} onOk={()=>{onDeleteEvent(deleteConfirm.id);setDeleteConfirm(null);}} onCancel={()=>setDeleteConfirm(null)} C={C} S={S} />
    </div>
  );
}

/* ============================================================
   アンケートページ（大幅リニューアル）
   質問タイプ: choice（選択）/ free（自由記述）/ scale（スライダー）
   ============================================================ */

// 質問コンポーネント（回答フォーム用）
function QuestionAnswer({ q, answer, onChange, C, S }) {
  if (q.type === "choice") {
    return (
      <div>
        {q.options.map((opt, i) => (
          <div key={i} onClick={() => onChange(i)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, marginBottom:6, cursor:"pointer", background:answer===i?C.accent+"18":C.paper, border:`1px solid ${answer===i?C.accent:C.rule}` }}>
            <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${answer===i?C.accent:C.rule}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {answer===i && <div style={{ width:8, height:8, borderRadius:"50%", background:C.accent }} />}
            </div>
            <span style={{ fontFamily:FB, fontSize:13, color:C.ink }}>{opt}</span>
          </div>
        ))}
      </div>
    );
  }
  if (q.type === "free") {
    return (
      <textarea value={answer||""} onChange={e=>onChange(e.target.value)} rows={3} placeholder="ここに回答を入力してください"
        style={{ ...S.inp, resize:"none", fontSize:13 }} />
    );
  }
  if (q.type === "scale") {
    const min = q.scaleMin ?? 1;
    const max = q.scaleMax ?? 10;
    const val = answer ?? Math.round((min+max)/2);
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontFamily:FB, fontSize:11, color:C.inkMid }}>{q.scaleMinLabel||min}</span>
          <span style={{ fontFamily:FB, fontSize:16, fontWeight:700, color:C.accent }}>{val}</span>
          <span style={{ fontFamily:FB, fontSize:11, color:C.inkMid }}>{q.scaleMaxLabel||max}</span>
        </div>
        <input type="range" min={min} max={max} step={1} value={val} onChange={e=>onChange(Number(e.target.value))}
          style={{ width:"100%", "--accent":C.accent, background:`linear-gradient(to right, ${C.accent} ${((val-min)/(max-min))*100}%, ${C.rule} ${((val-min)/(max-min))*100}%)` }} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          {Array.from({length:max-min+1},(_,i)=>min+i).map(n=>(
            <span key={n} style={{ fontFamily:FB, fontSize:9, color:n===val?C.accent:C.inkLight, fontWeight:n===val?700:400 }}>{n}</span>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// 結果表示（管理者用）
function QuestionResult({ q, answers, C }) {
  if (q.type === "choice") {
    const total = answers.reduce((s,a)=>s+(a.count||0),0);
    return (
      <div>
        {q.options.map((opt,i)=>{
          const cnt = (answers.find(a=>a.index===i)||{}).count||0;
          const pct = total>0?Math.round(cnt/total*100):0;
          return (
            <div key={i} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontFamily:FB, fontSize:13, color:C.ink }}>{opt}</span>
                <span style={{ fontFamily:FB, fontSize:12, fontWeight:700, color:C.accent }}>{cnt}票 ({pct}%)</span>
              </div>
              <AnimBar pct={pct} color={C.accent} />
            </div>
          );
        })}
        <div style={{ fontFamily:FB, fontSize:11, color:C.inkLight, textAlign:"right", marginTop:4 }}>合計 {total}票</div>
      </div>
    );
  }
  if (q.type === "free") {
    const texts = answers.filter(a=>a.text&&a.text.trim());
    return (
      <div>
        {texts.length===0 ? <div style={{ fontFamily:FB, fontSize:12, color:C.inkLight }}>回答なし</div>
          : texts.map((a,i)=>(
            <div key={i} style={{ fontFamily:FB, fontSize:13, color:C.ink, padding:"8px 12px", background:C.wash, borderRadius:8, marginBottom:6 }}>{a.text}</div>
          ))}
        <div style={{ fontFamily:FB, fontSize:11, color:C.inkLight, marginTop:4 }}>{texts.length}件の回答</div>
      </div>
    );
  }
  if (q.type === "scale") {
    const vals = answers.filter(a=>a.value!==undefined&&a.value!==null);
    const avg = vals.length>0 ? (vals.reduce((s,a)=>s+a.value,0)/vals.length).toFixed(1) : "-";
    const min = q.scaleMin??1; const max = q.scaleMax??10;
    const dist = {};
    vals.forEach(a=>{ dist[a.value]=(dist[a.value]||0)+1; });
    return (
      <div>
        <div style={{ fontFamily:FB, fontSize:20, fontWeight:700, color:C.accent, marginBottom:12 }}>平均：{avg}</div>
        {Array.from({length:max-min+1},(_,i)=>min+i).map(n=>{
          const cnt=dist[n]||0;
          const pct=vals.length>0?Math.round(cnt/vals.length*100):0;
          return (
            <div key={n} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontFamily:FB, fontSize:11, color:C.inkMid, width:18, textAlign:"right", flexShrink:0 }}>{n}</span>
              <div style={{ flex:1 }}><AnimBar pct={pct} color={C.accent} /></div>
              <span style={{ fontFamily:FB, fontSize:11, color:C.inkMid, width:36, flexShrink:0 }}>{cnt}票</span>
            </div>
          );
        })}
        <div style={{ fontFamily:FB, fontSize:11, color:C.inkLight, marginTop:4 }}>{vals.length}件の回答</div>
      </div>
    );
  }
  return null;
}

function SurveyPage({ surveys, isAdmin, onAddSurvey, onAnswerSurvey, onDeleteSurvey, C, S }) {
  const [creating, setCreating]   = useState(false);
  const [title, setTitle]         = useState("");
  const [desc, setDesc]           = useState("");
  const [deadline, setDeadline]   = useState("");
  const [questions, setQuestions] = useState([{ type:"choice", text:"", options:["",""], scaleMin:1, scaleMax:10, scaleMinLabel:"", scaleMaxLabel:"" }]);
  const [confirmDel, setConfirmDel] = useState(null);
  const [openSv, setOpenSv]       = useState(null); // 開いているアンケートid
  const [answers, setAnswers]     = useState({}); // { [svId]: { [qIdx]: value } }
  const [tab, setTab]             = useState("active"); // active|answered|past

  const now = new Date();

  // アンケートを分類
  const activeSurveys   = surveys.filter(sv => !sv.myAnswer && (!sv.deadline || new Date(sv.deadline) >= now));
  const answeredSurveys = surveys.filter(sv => sv.myAnswer);
  const pastSurveys     = surveys.filter(sv => !sv.myAnswer && sv.deadline && new Date(sv.deadline) < now);

  const addQuestion = () => setQuestions(qs=>[...qs,{ type:"choice", text:"", options:["",""], scaleMin:1, scaleMax:10, scaleMinLabel:"", scaleMaxLabel:"" }]);
  const removeQuestion = (i) => setQuestions(qs=>qs.filter((_,idx)=>idx!==i));
  const updateQuestion = (i, key, val) => setQuestions(qs=>{ const n=[...qs]; n[i]={...n[i],[key]:val}; return n; });
  const addOption = (qi) => setQuestions(qs=>{ const n=[...qs]; n[qi]={...n[qi],options:[...n[qi].options,""]};return n; });
  const updateOption = (qi,oi,v) => setQuestions(qs=>{ const n=[...qs]; const opts=[...n[qi].options]; opts[oi]=v; n[qi]={...n[qi],options:opts}; return n; });
  const removeOption = (qi,oi) => setQuestions(qs=>{ const n=[...qs]; n[qi]={...n[qi],options:n[qi].options.filter((_,idx)=>idx!==oi)}; return n; });

  const saveNew = () => {
    if (!title.trim()) { alert("タイトルを入力してください"); return; }
    for (const q of questions) {
      if (!q.text.trim()) { alert("質問文を全て入力してください"); return; }
      if (q.type==="choice" && q.options.some(o=>!o.trim())) { alert("選択肢を全て入力してください"); return; }
    }
    onAddSurvey({ title:title.trim(), desc:desc.trim(), deadline:deadline||null, questions });
    setTitle(""); setDesc(""); setDeadline("");
    setQuestions([{ type:"choice", text:"", options:["",""], scaleMin:1, scaleMax:10, scaleMinLabel:"", scaleMaxLabel:"" }]);
    setCreating(false);
  };

  const setAnswer = (svId, qIdx, val) => {
    setAnswers(prev=>({ ...prev, [svId]:{ ...(prev[svId]||{}), [qIdx]:val } }));
  };

  const submitAnswer = (sv) => {
    const svAnswers = answers[sv.id] || {};
    // 全質問に回答があるか確認
    for (let i=0; i<sv.questions.length; i++) {
      const q = sv.questions[i];
      const a = svAnswers[i];
      if (q.type==="choice" && (a===undefined||a===null)) { alert(`質問${i+1}を選択してください`); return; }
      if (q.type==="scale"  && (a===undefined||a===null)) { /* スライダーはデフォルト値があるのでOK */ }
    }
    onAnswerSurvey(sv.id, svAnswers, sv.questions);
    setOpenSv(null);
  };

  const tabList = [
    { key:"active",   label:"未回答", count:activeSurveys.length },
    { key:"answered", label:"回答済み", count:answeredSurveys.length },
    { key:"past",     label:"過去", count:pastSurveys.length },
  ];
  const displaySurveys = tab==="active"?activeSurveys : tab==="answered"?answeredSurveys : pastSurveys;

  const renderSurveyCard = (sv) => {
    const isOpen = openSv===sv.id;
    const isPast = sv.deadline && new Date(sv.deadline) < now;
    const canEdit = sv.myAnswer && sv.deadline && new Date(sv.deadline) >= now;

    return (
      <div key={sv.id} style={{ border:`1px solid ${C.rule}`, borderRadius:12, marginBottom:12, overflow:"hidden" }}>
        {/* ヘッダー */}
        <div onClick={()=>setOpenSv(isOpen?null:sv.id)} style={{ padding:"14px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:FS, fontSize:15, fontWeight:600, color:C.ink }}>{sv.title}</div>
            {sv.desc && <div style={{ fontFamily:FB, fontSize:12, color:C.inkMid, marginTop:3 }}>{sv.desc}</div>}
            <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
              {sv.deadline && <span style={{ fontFamily:FB, fontSize:11, color:isPast?C.danger:C.amber, background:isPast?C.dangerBg:C.amberBg, padding:"2px 8px", borderRadius:100 }}>締切：{sv.deadline}</span>}
              {sv.myAnswer && <span style={{ fontFamily:FB, fontSize:11, color:C.green, background:C.greenBg, padding:"2px 8px", borderRadius:100 }}>✓ 回答済み</span>}
              {canEdit && <span style={{ fontFamily:FB, fontSize:11, color:C.accent, background:C.accentBg, padding:"2px 8px", borderRadius:100 }}>変更可</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
            {isAdmin && <button onClick={e=>{e.stopPropagation();setConfirmDel(sv.id);}} style={{ fontFamily:FB, background:C.dangerBg, border:`1px solid #f9a8c0`, color:C.danger, fontSize:11, padding:"3px 8px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>削除</button>}
            <span style={{ color:C.inkLight, fontSize:16, transition:"transform .2s", transform:isOpen?"rotate(180deg)":"rotate(0)" }}>▾</span>
          </div>
        </div>

        {/* 展開コンテンツ */}
        {isOpen && (
          <div style={{ borderTop:`1px solid ${C.rule}`, padding:"16px 16px" }}>
            {/* 管理者：結果表示 */}
            {isAdmin && (
              <div style={{ marginBottom:16 }}>
                {sv.questions.map((q,qi)=>(
                  <div key={qi} style={{ marginBottom:16, paddingBottom:16, borderBottom:qi<sv.questions.length-1?`1px solid ${C.rule}`:"none" }}>
                    <div style={{ fontFamily:FB, fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>{qi+1}. {q.text}</div>
                    <QuestionResult q={q} answers={(sv.questionAnswers||[])[qi]||[]} C={C} />
                  </div>
                ))}
              </div>
            )}

            {/* 回答フォーム */}
            {!isPast && (
              <div>
                {sv.questions.map((q,qi)=>(
                  <div key={qi} style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:FB, fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>
                      {qi+1}. {q.text}
                      {q.type==="choice" && <span style={{ fontFamily:FB, fontSize:11, color:C.inkLight, fontWeight:400, marginLeft:6 }}>（選択）</span>}
                      {q.type==="free"   && <span style={{ fontFamily:FB, fontSize:11, color:C.inkLight, fontWeight:400, marginLeft:6 }}>（自由記述）</span>}
                      {q.type==="scale"  && <span style={{ fontFamily:FB, fontSize:11, color:C.inkLight, fontWeight:400, marginLeft:6 }}>（{q.scaleMin}〜{q.scaleMax}段階）</span>}
                    </div>
                    <QuestionAnswer q={q} answer={(answers[sv.id]||{})[qi] ?? (sv.myAnswer?.[qi])} onChange={val=>setAnswer(sv.id,qi,val)} C={C} S={S} />
                  </div>
                ))}
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={()=>submitAnswer(sv)} style={{ ...S.btnP, ...S.btnSm }}>
                    {sv.myAnswer?"回答を更新する":"送信する"}
                  </button>
                  <button onClick={()=>setOpenSv(null)} style={{ ...S.btnO, ...S.btnSm }}>閉じる</button>
                </div>
              </div>
            )}
            {isPast && !isAdmin && (
              <div style={{ fontFamily:FB, fontSize:13, color:C.inkLight, textAlign:"center", padding:"20px 0" }}>このアンケートは締め切られました</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={S.card}>
        <div style={{ ...S.divider, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h1 style={S.hdg(17)}><span style={S.dot}/>アンケート</h1>
          {isAdmin && !creating && <button onClick={()=>setCreating(true)} style={{ ...S.btnP, ...S.btnSm }}>＋ 新規作成</button>}
        </div>

        {/* 新規作成フォーム */}
        {isAdmin && creating && (
          <div style={{ background:C.accentBg, border:`1px solid ${C.accent}`, borderRadius:12, padding:16, marginBottom:20 }}>
            <div style={{ fontFamily:FS, fontSize:15, fontWeight:600, color:C.accent, marginBottom:14 }}>新しいアンケートを作成</div>
            <label style={S.lbl}>タイトル</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：文化祭の出し物について" style={{ ...S.inp, marginBottom:10 }} />
            <label style={S.lbl}>説明（任意）</label>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="説明を入力" style={{ ...S.inp, marginBottom:10 }} />
            <label style={S.lbl}>締め切り（任意）</label>
            <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{ ...S.inp, marginBottom:16 }} />

            <label style={S.lbl}>質問</label>
            {questions.map((q,qi)=>(
              <div key={qi} style={{ border:`1px solid ${C.rule}`, borderRadius:10, padding:14, marginBottom:12, background:C.paper }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontFamily:FB, fontSize:13, fontWeight:700, color:C.ink }}>質問 {qi+1}</span>
                  {questions.length>1 && <button onClick={()=>removeQuestion(qi)} style={{ fontFamily:FB, background:C.dangerBg, border:`1px solid #f9a8c0`, color:C.danger, fontSize:11, padding:"2px 8px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>削除</button>}
                </div>
                <input value={q.text} onChange={e=>updateQuestion(qi,"text",e.target.value)} placeholder="質問文を入力" style={{ ...S.inp, marginBottom:10 }} />
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  {["choice","free","scale"].map(t=>(
                    <button key={t} onClick={()=>updateQuestion(qi,"type",t)}
                      style={{ flex:1, fontFamily:FB, fontSize:12, fontWeight:700, padding:"6px 0", border:`1px solid ${q.type===t?C.accent:C.rule}`, borderRadius:8, cursor:"pointer", background:q.type===t?C.accentBg:C.paper, color:q.type===t?C.accent:C.inkMid }}>
                      {t==="choice"?"選択式":t==="free"?"自由記述":"スライダー"}
                    </button>
                  ))}
                </div>
                {q.type==="choice" && (
                  <div>
                    {q.options.map((o,oi)=>(
                      <div key={oi} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center" }}>
                        <input value={o} onChange={e=>updateOption(qi,oi,e.target.value)} placeholder={`選択肢${oi+1}`} style={{ ...S.inp }} />
                        {q.options.length>2 && <button onClick={()=>removeOption(qi,oi)} style={{ fontFamily:FB, background:C.dangerBg, border:`1px solid #f9a8c0`, color:C.danger, fontSize:11, padding:"6px 10px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>削除</button>}
                      </div>
                    ))}
                    <button onClick={()=>addOption(qi)} style={{ ...S.btnO, ...S.btnSm }}>＋ 選択肢追加</button>
                  </div>
                )}
                {q.type==="scale" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                    <div><label style={{ ...S.lbl, fontSize:9 }}>最小値</label><input type="number" value={q.scaleMin} onChange={e=>updateQuestion(qi,"scaleMin",Number(e.target.value))} style={{ ...S.inp, fontSize:12 }} /></div>
                    <div><label style={{ ...S.lbl, fontSize:9 }}>最大値</label><input type="number" value={q.scaleMax} onChange={e=>updateQuestion(qi,"scaleMax",Number(e.target.value))} style={{ ...S.inp, fontSize:12 }} /></div>
                    <div><label style={{ ...S.lbl, fontSize:9 }}>最小ラベル</label><input value={q.scaleMinLabel} onChange={e=>updateQuestion(qi,"scaleMinLabel",e.target.value)} placeholder="例：低い" style={{ ...S.inp, fontSize:12 }} /></div>
                    <div><label style={{ ...S.lbl, fontSize:9 }}>最大ラベル</label><input value={q.scaleMaxLabel} onChange={e=>updateQuestion(qi,"scaleMaxLabel",e.target.value)} placeholder="例：高い" style={{ ...S.inp, fontSize:12 }} /></div>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addQuestion} style={{ ...S.btnO, ...S.btnSm, marginBottom:16 }}>＋ 質問を追加</button>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={saveNew} style={{ ...S.btnP, ...S.btnSm }}>公開する</button>
              <button onClick={()=>setCreating(false)} style={{ ...S.btnO, ...S.btnSm }}>キャンセル</button>
            </div>
          </div>
        )}

        {/* セクション別アコーディオン */}
        {tabList.map(sec => (
          <div key={sec.key} style={{ marginBottom:8 }}>
            <button onClick={()=>setTab(tab===sec.key?null:sec.key)}
              style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:tab===sec.key?C.accentBg:C.wash, border:`1px solid ${tab===sec.key?C.accent:C.rule}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", fontFamily:FB, fontSize:14, fontWeight:700, color:tab===sec.key?C.accent:C.ink, transition:"all .15s" }}>
              <span>{sec.label} {sec.count>0&&<span style={{ fontFamily:FB, fontSize:12, fontWeight:400, color:tab===sec.key?C.accent:C.inkLight }}>（{sec.count}件）</span>}</span>
              <span style={{ fontSize:16, color:C.inkLight, transition:"transform .2s", transform:tab===sec.key?"rotate(180deg)":"rotate(0)" }}>▾</span>
            </button>
            {tab===sec.key && (
              <div style={{ marginTop:8 }}>
                {(sec.key==="active"?activeSurveys:sec.key==="answered"?answeredSurveys:pastSurveys).length===0 ? (
                  <div style={{ fontFamily:FB, textAlign:"center", padding:"24px 0", color:C.inkLight, fontSize:13 }}>
                    {sec.key==="active"?"未回答のアンケートはありません":sec.key==="answered"?"回答済みのアンケートはありません":"過去のアンケートはありません"}
                  </div>
                ) : (sec.key==="active"?activeSurveys:sec.key==="answered"?answeredSurveys:pastSurveys).map(sv=>renderSurveyCard(sv))}
              </div>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog msg={confirmDel?"このアンケートを削除してもよいですか？":null} onOk={()=>{onDeleteSurvey(confirmDel);setConfirmDel(null);}} onCancel={()=>setConfirmDel(null)} C={C} S={S} />
    </div>
  );
}

/* ── 通知バナー ── */
function NotifBanner({ survey, onTap, onDismiss, C }) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    playNotifSound();
    const t = setTimeout(()=>dismiss(), 5000);
    return ()=>clearTimeout(t);
  }, [survey]);
  const dismiss = () => { setLeaving(true); setTimeout(()=>{ setVisible(false); onDismiss(); },350); };
  if (!visible||!survey) return null;
  return (
    <div onClick={()=>{onTap();dismiss();}} style={{ position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", zIndex:9000, width:"min(380px, 92vw)", background:"rgba(30,30,40,0.92)", backdropFilter:"blur(16px)", borderRadius:18, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 8px 32px rgba(0,0,0,0.28)", cursor:"pointer", animation:`${leaving?"notifSlideOut":"notifSlideIn"} 0.35s cubic-bezier(.32,1.2,.48,1) forwards` }}>
      <div style={{ width:40, height:40, borderRadius:10, background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><circle cx="6" cy="9" r="1" fill="#fff"/><circle cx="6" cy="13" r="1" fill="#fff"/></svg>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.55)", marginBottom:2 }}>みんなの意見箱 · 新しいアンケート</div>
        <div style={{ fontFamily:FB, fontSize:14, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{survey.title}</div>
        {survey.desc && <div style={{ fontFamily:FB, fontSize:12, color:"rgba(255,255,255,0.65)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{survey.desc}</div>}
      </div>
      <button onClick={e=>{e.stopPropagation();dismiss();}} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:18, cursor:"pointer", padding:4, flexShrink:0 }}>×</button>
    </div>
  );
}

/* ── トースト ── */
function Toast({ msg }) {
  if (!msg) return null;
  return <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:"#1a1a2e", color:"#fff", fontFamily:FB, fontSize:13, fontWeight:500, padding:"10px 22px", borderRadius:100, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.22)", pointerEvents:"none", animation:"toastIn 0.25s ease" }}>{msg}</div>;
}

/* ── ナビアイコン ── */
function NavIcon({ type, active, color }) {
  const col = color || (active ? "#2d5be3" : "#8a8a95");
  const bg  = active ? col+"28" : "none";
  const sz  = 24;
  const icons = {
    send:     <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 2 15 22 11 13 2 9 22 2" fill={bg}/><line x1="22" y1="2" x2="11" y2="13"/></svg>,
    opinions: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20 2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3l2 3 2-3h9a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" stroke={col} strokeWidth="1.6" fill={bg}/><line x1="7" y1="8" x2="17" y2="8" stroke={col} strokeWidth="1.4"/><line x1="7" y1="12" x2="13" y2="12" stroke={col} strokeWidth="1.4"/></svg>,
    events:   <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" fill={bg}/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    survey:   <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" fill={bg}/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>,
    settings: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" fill={bg}/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };
  return <span style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>{icons[type]}</span>;
}

/* ── ボトムナビ ── */
function BottomNav({ page, setPage, unreadCount, onClearUnread, C }) {
  const tabs = [
    { id:"send",     icon:"send",     label:"意見を送る" },
    { id:"opinions", icon:"opinions", label:"みんなの声" },
    { id:"events",   icon:"events",   label:"予定表" },
    { id:"survey",   icon:"survey",   label:"アンケート" },
    { id:"settings", icon:"settings", label:"設定" },
  ];
  const btnStyle = (active) => ({ flex:1, background:"none", border:"none", fontFamily:FB, fontSize:10, fontWeight:active?700:500, color:active?C.accent:C.inkLight, padding:"10px 4px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 });
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:C.navBg, borderTop:`1px solid ${C.rule}`, zIndex:300, display:"flex", alignItems:"stretch" }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>{ setPage(t.id); if(t.id==="survey") onClearUnread(); }} style={{ ...btnStyle(page===t.id), position:"relative" }}>
          <NavIcon type={t.icon} active={page===t.id} color={page===t.id?C.accent:C.inkLight} />
          {t.label}
          {t.id==="survey" && unreadCount>0 && (
            <span style={{ position:"absolute", top:6, right:"calc(50% - 14px)", width:14, height:14, borderRadius:"50%", background:C.danger, color:"#fff", fontSize:8, fontWeight:700, fontFamily:FB, display:"flex", alignItems:"center", justifyContent:"center" }}>{unreadCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

/* ── 通知音 ── */
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const now = ctx.currentTime;
    [{freq:1046.5,t:0,dur:0.18},{freq:1318.5,t:0.1,dur:0.18},{freq:1568.0,t:0.2,dur:0.35}].forEach(({freq,t,dur})=>{
      const osc=ctx.createOscillator(); const gain=ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type="sine"; osc.frequency.value=freq;
      gain.gain.setValueAtTime(0,now+t); gain.gain.linearRampToValueAtTime(0.18,now+t+0.015); gain.gain.exponentialRampToValueAtTime(0.001,now+t+dur);
      osc.start(now+t); osc.stop(now+t+dur+0.05);
    });
  } catch(e) {}
}

/* ============================================================
   メインアプリ
   ============================================================ */
export default function App() {
  const [darkMode, setDarkMode]   = useState(() => localStorage.getItem("darkMode")==="true");
  const C = THEMES[darkMode?"dark":"light"];
  const S = mkStyles(C);

  // CSS変数をルートに適用
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", C.accent);
    document.body.style.background = C.wash;
    document.body.style.color = C.ink;
  }, [darkMode]);

  const handleToggleDark = (val) => {
    setDarkMode(val);
    localStorage.setItem("darkMode", String(val));
  };

  const [user, setUser]           = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPageRaw]        = useState("send");
  const setPage = (p) => { setPageRaw(p); window.scrollTo({top:0,behavior:"instant"}); };
  const [opinions, setOpinions]   = useState([]);
  const [events, setEvents]       = useState([]);
  const [surveys, setSurveys]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [notifSurvey, setNotifSurvey] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast]         = useState("");
  const toastTimer                = useRef(null);
  const isMobile                  = useWidth() < 720;
  let nextEvId                    = useRef(1);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // localStorageからログイン状態復元
  useEffect(() => {
    const saved = localStorage.getItem("authUser");
    if (saved) { try { setUser(JSON.parse(saved)); } catch(e){} }
    setAuthChecked(true);
  }, []);

  // ログイン後データ取得
  useEffect(() => {
    if (!user||!USE_GAS) return;
    setLoading(true);
    Promise.all([gasGet("getOpinions"), gasGet("getEvents"), gasGet("getSurveys")])
      .then(([ops,evs,svs]) => {
        setOpinions(Array.isArray(ops)?ops:[]);
        setEvents(Array.isArray(evs)?evs.sort((a,b)=>a.date.localeCompare(b.date)):[]);
        // 回答済み状態をlocalStorageから復元（アンケートごとに独立）
        const savedAnswers = JSON.parse(localStorage.getItem("surveyAnswers")||"{}");
        setSurveys((Array.isArray(svs)?svs:[]).map(sv=>({ ...sv, myAnswer:savedAnswers[sv.id]||null })));
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [user]);

  // みんなの声 自動更新（30秒ごと）
  useEffect(() => {
    if (!user || !USE_GAS) return;
    const interval = setInterval(async () => {
      try {
        const ops = await gasGet("getOpinions");
        if (Array.isArray(ops)) setOpinions(ops);
      } catch(e) {}
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const showToast = msg => {
    setToast(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToast(""),3000);
  };

  const handleLogin   = (u) => { setUser(u); showToast("ログインしました"); };
  const handleLogout  = () => { localStorage.removeItem("authUser"); setUser(null); setOpinions([]); setEvents([]); setSurveys([]); showToast("ログアウトしました"); };
  const handleUpdateUser = (u) => { setUser(u); showToast("プロフィールを更新しました"); };

  const handleSubmit = async ({ name, message }) => {
    if (USE_GAS) {
      await gasPost({ action:"addOpinion", name, message, authorEmail:user.email, authorName:user.displayName, authorInfo:user.grade&&user.classNum?`${user.grade}年${user.classNum}組`:"" });
      const ops = await gasGet("getOpinions");
      setOpinions(Array.isArray(ops)?ops:[]);
    }
    showToast("意見を送信しました");
  };

  const handleToggleAdopt = async (row, adopt) => {
    if (USE_GAS) await gasPost({ action:"updateOpinion", row, status:adopt?"採用":"未採用" });
    setOpinions(prev=>prev.map(o=>o.row===row?{...o,status:adopt?"採用":"未採用"}:o));
    showToast(adopt?"採用しました":"採用を取り消しました");
  };
  const handleSetProgress = async (row, progress) => {
    if (USE_GAS) await gasPost({ action:"updateOpinion", row, progress });
    setOpinions(prev=>prev.map(o=>o.row===row?{...o,progress}:o));
    showToast(`「${progress}」に変更しました`);
  };
  const handleSetPct = async (row, pct) => {
    if (USE_GAS) await gasPost({ action:"updateOpinion", row, pct });
    setOpinions(prev=>prev.map(o=>o.row===row?{...o,pct}:o));
  };
  const handleSetReply = async (row, reply, replyImage) => {
    if (USE_GAS) await gasPost({ action:"updateOpinion", row, reply:reply||"" });
    setOpinions(prev=>prev.map(o=>o.row===row?{...o,reply,replyImage}:o));
    showToast("返信を保存しました");
  };

  const handleAddEvent = async ({ date, title, desc }) => {
    if (USE_GAS) { await gasPost({ action:"addEvent", date, title, desc }); const evs=await gasGet("getEvents"); setEvents(Array.isArray(evs)?evs.sort((a,b)=>a.date.localeCompare(b.date)):[]); }
    showToast("予定を追加しました");
  };
  const handleEditEvent = async (id, { date, title, desc }) => {
    if (USE_GAS) { await gasPost({ action:"editEvent", id, date, title, desc }); const evs=await gasGet("getEvents"); setEvents(Array.isArray(evs)?evs.sort((a,b)=>a.date.localeCompare(b.date)):[]); }
    showToast("予定を更新しました");
  };
  const handleDeleteEvent = async (id) => {
    if (USE_GAS) await gasPost({ action:"deleteEvent", id });
    setEvents(prev=>prev.filter(e=>e.id!==id));
    showToast("予定を削除しました");
  };

  const handleAddSurvey = async (sv) => {
    if (USE_GAS) {
      await gasPost({ action:"addSurvey", ...sv });
      const svs = await gasGet("getSurveys");
      const savedAnswers = JSON.parse(localStorage.getItem("surveyAnswers")||"{}");
      const loaded = (Array.isArray(svs)?svs:[]).map(s=>({...s,myAnswer:savedAnswers[s.id]||null}));
      setSurveys(loaded);
      const newSv = loaded[0];
      if (newSv) { setNotifSurvey(newSv); setUnreadCount(c=>c+1); }
    }
    showToast("アンケートを公開しました");
  };

  const handleAnswerSurvey = async (svId, answerMap, questions) => {
    if (USE_GAS) {
      await gasPost({ action:"answerSurvey", id:svId, answerMap, questions });
      const svs = await gasGet("getSurveys");
      // このアンケートの回答だけ保存（他のアンケートには影響しない）
      const savedAnswers = JSON.parse(localStorage.getItem("surveyAnswers")||"{}");
      savedAnswers[svId] = answerMap;
      localStorage.setItem("surveyAnswers", JSON.stringify(savedAnswers));
      const loaded = (Array.isArray(svs)?svs:[]).map(s=>({...s,myAnswer:savedAnswers[s.id]||null}));
      setSurveys(loaded);
    }
    showToast("回答しました！");
  };

  const handleDeleteSurvey = async (id) => {
    if (USE_GAS) { await gasPost({ action:"deleteSurvey", id }); const svs=await gasGet("getSurveys"); setSurveys(Array.isArray(svs)?svs:[]); }
    showToast("アンケートを削除しました");
  };

  const tabs = [
    { id:"send",     label:"意見を送る" },
    { id:"opinions", label:"みんなの声" },
    { id:"events",   label:"予定表" },
    { id:"survey",   label:"アンケート" },
  ];

  if (!authChecked) return null;
  if (!user) return <><AuthPage onLogin={handleLogin} C={C} S={S} /><Toast msg={toast} /></>;

  return (
    <div style={{ fontFamily:FB, background:C.wash, minHeight:"100vh", color:C.ink, lineHeight:1.7 }}>
      {/* ヘッダー */}
      <header style={{ background:C.headerBg, borderBottom:`1px solid ${C.rule}`, position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1060, margin:"auto", padding:"0 20px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div onClick={()=>setPage("send")} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", flexShrink:0 }}>
            <span style={{ fontFamily:FS, fontWeight:600, fontSize:16, letterSpacing:"0.04em", color:C.ink }}>みんなの意見箱</span>
            {isAdmin && <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.amber, background:C.amberBg, padding:"2px 8px", borderRadius:100 }}>管理者</span>}
          </div>
          {isMobile && (
            <button onClick={()=>{ setPage("survey"); setUnreadCount(0); }} style={{ position:"relative", background:"none", border:`1px solid ${C.rule}`, borderRadius:100, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginLeft:"auto" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.inkMid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount>0 && <span style={{ position:"absolute", top:2, right:2, width:15, height:15, borderRadius:"50%", background:C.danger, color:"#fff", fontSize:8, fontWeight:700, fontFamily:FB, display:"flex", alignItems:"center", justifyContent:"center" }}>{unreadCount}</span>}
            </button>
          )}
          {!isMobile && (
            <nav style={{ display:"flex", gap:2 }}>
              {[...tabs,{id:"settings",label:"設定"}].map(t=>(
                <button key={t.id} onClick={()=>setPage(t.id)}
                  style={{ fontFamily:FB, background:page===t.id?C.accentBg:"none", border:"none", fontSize:13, fontWeight:page===t.id?700:500, color:page===t.id?C.accent:C.inkMid, padding:"6px 12px", borderRadius:8, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, transition:"background .15s" }}>
                  <NavIcon type={t.id==="settings"?"settings":t.id} active={page===t.id} color={page===t.id?C.accent:C.inkMid} />
                  {t.label}
                </button>
              ))}
            </nav>
          )}
          {!isMobile && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>{ setPage("survey"); setUnreadCount(0); }} style={{ position:"relative", background:"none", border:`1px solid ${C.rule}`, borderRadius:100, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.inkMid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadCount>0 && <span style={{ position:"absolute", top:2, right:2, width:16, height:16, borderRadius:"50%", background:C.danger, color:"#fff", fontSize:9, fontWeight:700, fontFamily:FB, display:"flex", alignItems:"center", justifyContent:"center" }}>{unreadCount}</span>}
              </button>
              <div style={{ fontFamily:FB, fontSize:12, color:C.inkMid }}>{user.displayName}</div>
            </div>
          )}
        </div>
      </header>

      {/* メイン */}
      <main style={{ maxWidth:1060, margin:"24px auto", padding:isMobile?"0 12px":"0 24px", paddingBottom:isMobile?90:60 }}>
        {loading ? (
          <AoiLoading />
        ) : (
          <>
            {page==="send"     && <SendPage onSubmit={handleSubmit} C={C} S={S} />}
            {page==="opinions" && <OpinionsPage opinions={opinions} isAdmin={isAdmin} onToggleAdopt={handleToggleAdopt} onSetProgress={handleSetProgress} onSetPct={handleSetPct} onSetReply={handleSetReply} C={C} S={S} />}
            {page==="events"   && <EventsPage events={events} isAdmin={isAdmin} onAddEvent={handleAddEvent} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} C={C} S={S} />}
            {page==="survey"   && <SurveyPage surveys={surveys} isAdmin={isAdmin} onAddSurvey={handleAddSurvey} onAnswerSurvey={handleAnswerSurvey} onDeleteSurvey={handleDeleteSurvey} C={C} S={S} />}
            {page==="settings" && <SettingsPage user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} darkMode={darkMode} onToggleDark={handleToggleDark} C={C} S={S} />}
          </>
        )}
      </main>

      {isMobile && <BottomNav page={page} setPage={setPage} unreadCount={unreadCount} onClearUnread={()=>setUnreadCount(0)} C={C} />}
      <Toast msg={toast} />
      <NotifBanner survey={notifSurvey} onTap={()=>{ setPage("survey"); setUnreadCount(0); }} onDismiss={()=>setNotifSurvey(null)} C={C} />
    </div>
  );
}
