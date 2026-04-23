import { useState, useEffect, useRef } from "react";

/* ── Google Fonts 読み込み ── */
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Shippori+Mincho:wght@400;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

/* ── CSS アニメーション定義 ── */
const styleEl = document.createElement("style");
styleEl.textContent = `
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);   }
  }
  @keyframes overlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
  }
  @keyframes notifSlideIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-110%); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes notifSlideOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to   { opacity: 0; transform: translateX(-50%) translateY(-110%); }
  }
  * { box-sizing: border-box; }
  body { margin: 0; }
`;
document.head.appendChild(styleEl);

/* ── 定数 ── */
const GAS_URL = "https://script.google.com/macros/s/AKfycbxBHYu4xEKRCBy5E8g77hnrfPHkgLaaDaBfrchV7LGdo5JjA9aR-9psmtv7JncvY3iw/exec";
const USE_GAS = true;
const ADMIN_EMAIL = "aoichuikenbakoseitokai@gmail.com";

const DEMO_OPINIONS_INIT = [];
const PROGRESS_OPTIONS = ["未着手", "進行中", "完了"];
const PROGRESS_STYLE = {
  "未着手": { bg:"#f1f5f9", color:"#64748b", border:"#cbd5e1" },
  "進行中": { bg:"#fff7ed", color:"#c2410c", border:"#fed7aa" },
  "完了":   { bg:"#f0faf4", color:"#1a7a4a", border:"#a7dfc0" },
};
const DEMO_PROGRESS = [];
const DEMO_EVENTS_INIT = [];
const WD = ["日","月","火","水","木","金","土"];

/* ── カラー ── */
const C = {
  ink:"#1a1a1e", inkMid:"#4a4a52", inkLight:"#8a8a95",
  rule:"#e6e6ec", wash:"#f7f7fa", paper:"#ffffff",
  accent:"#2d5be3", accentBg:"#f0f4ff",
  green:"#1a7a4a", greenBg:"#f0faf4",
  amber:"#b45309", amberBg:"#fffbeb",
  danger:"#be123c", dangerBg:"#fff1f2",
};
const FB = "'Zen Kaku Gothic New', sans-serif";
const FS = "'Shippori Mincho', serif";

/* ── 共通スタイル ── */
const card   = { background:C.paper, border:`1px solid ${C.rule}`, borderRadius:16, padding:24, boxShadow:"0 1px 4px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)" };
const hdg    = (sz=17) => ({ fontFamily:FS, fontWeight:600, fontSize:sz, color:C.ink, display:"flex", alignItems:"center", gap:8, margin:0, padding:0 });
const dot    = { width:6, height:6, borderRadius:"50%", background:C.accent, flexShrink:0, display:"inline-block" };
const lbl    = { display:"block", fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:"0.06em", color:C.inkMid, textTransform:"uppercase", marginBottom:6 };
const inp    = { width:"100%", fontFamily:FB, fontSize:14, color:C.ink, background:C.wash, border:`1px solid ${C.rule}`, borderRadius:10, padding:"10px 14px", outline:"none" };
const btnP   = { fontFamily:FB, background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 };
const btnO   = { fontFamily:FB, background:C.paper, border:`1px solid ${C.rule}`, borderRadius:10, padding:"9px 18px", fontSize:14, fontWeight:700, cursor:"pointer", color:C.inkMid, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 };
const btnSm  = { padding:"6px 12px", fontSize:12, borderRadius:6 };
const divider = { marginBottom:18, paddingBottom:12, borderBottom:`1px solid ${C.rule}` };

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

/* ── GAS通信ヘルパー ── */
async function gasGet(action) {
  const res = await fetch(`${GAS_URL}?action=${action}`);
  return res.json();
}
async function gasPost(body) {
  const res = await fetch(GAS_URL, { method:"POST", body:JSON.stringify(body) });
  return res.json();
}

/* ── パスワードハッシュ（簡易） ── */
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ============================================================
   ログイン・登録画面
   ============================================================ */
function AuthPage({ onLogin }) {
  const [mode, setMode]       = useState("login"); // login | register
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [pw2, setPw2]         = useState("");
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade]     = useState("");
  const [classNum, setClassNum] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !pw) { setError("メールアドレスとパスワードを入力してください"); return; }
    setLoading(true); setError("");
    try {
      const hash = await hashPassword(pw);
      const res = await gasPost({ action:"login", email:email.trim().toLowerCase(), passwordHash:hash });
      if (res.ok) {
        localStorage.setItem("authUser", JSON.stringify(res.user));
        onLogin(res.user);
      } else {
        setError(res.error || "ログインに失敗しました");
      }
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
      const res = await gasPost({
        action:"register",
        email: email.trim().toLowerCase(),
        passwordHash: hash,
        displayName: displayName.trim(),
        grade: grade.trim(),
        classNum: classNum.trim(),
      });
      if (res.ok) {
        localStorage.setItem("authUser", JSON.stringify(res.user));
        onLogin(res.user);
      } else {
        setError(res.error || "登録に失敗しました");
      }
    } catch(e) { setError("通信エラーが発生しました"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.wash, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ ...card, width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontFamily:FS, fontWeight:600, fontSize:22, color:C.ink, marginBottom:6 }}>みんなの意見箱</div>
          <div style={{ fontFamily:FB, fontSize:13, color:C.inkLight }}>葵中学校 生徒会</div>
        </div>

        {/* タブ */}
        <div style={{ display:"flex", borderRadius:10, overflow:"hidden", border:`1px solid ${C.rule}`, marginBottom:24 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex:1, fontFamily:FB, fontSize:13, fontWeight:700, padding:"10px 0", border:"none", cursor:"pointer",
                background: mode===m ? C.accent : C.paper, color: mode===m ? "#fff" : C.inkMid, transition:"all .15s" }}>
              {m === "login" ? "ログイン" : "新規登録"}
            </button>
          ))}
        </div>

        {mode === "login" ? (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>メールアドレス</label>
              <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@gmail.com" />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>パスワード</label>
              <input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="パスワードを入力" />
            </div>
            {error && <div style={{ fontFamily:FB, fontSize:12, color:C.danger, marginBottom:14 }}>{error}</div>}
            <button style={{ ...btnP, width:"100%", justifyContent:"center" }} onClick={handleLogin} disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily:FB, fontSize:12, color:C.accent, background:C.accentBg, borderRadius:8, padding:"10px 14px", marginBottom:18, lineHeight:1.6 }}>
              💡 意見は必ず<strong>匿名</strong>で他の生徒に表示されます。名前が公開されることはありません。
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>メールアドレス <span style={{ color:C.danger }}>*</span></label>
              <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@gmail.com" />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>表示名（ニックネームでも可）<span style={{ color:C.danger }}>*</span></label>
              <input style={inp} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="例：田中太郎" maxLength={20} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <label style={lbl}>学年 <span style={{ fontWeight:400, color:C.inkLight }}>(任意)</span></label>
                <input style={inp} value={grade} onChange={e=>setGrade(e.target.value)} placeholder="例：2" maxLength={1} />
              </div>
              <div>
                <label style={lbl}>クラス <span style={{ fontWeight:400, color:C.inkLight }}>(任意)</span></label>
                <input style={inp} value={classNum} onChange={e=>setClassNum(e.target.value)} placeholder="例：3" maxLength={1} />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>パスワード <span style={{ color:C.danger }}>*</span></label>
              <input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="6文字以上" />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>パスワード（確認）<span style={{ color:C.danger }}>*</span></label>
              <input style={inp} type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleRegister()} placeholder="もう一度入力" />
            </div>
            {error && <div style={{ fontFamily:FB, fontSize:12, color:C.danger, marginBottom:14 }}>{error}</div>}
            <button style={{ ...btnP, width:"100%", justifyContent:"center" }} onClick={handleRegister} disabled={loading}>
              {loading ? "登録中..." : "アカウントを作成"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   設定ページ
   ============================================================ */
function SettingsPage({ user, onUpdateUser, onLogout }) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [grade, setGrade]     = useState(user.grade || "");
  const [classNum, setClassNum] = useState(user.classNum || "");
  const [pw, setPw]           = useState("");
  const [pw2, setPw2]         = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) { setError("表示名を入力してください"); return; }
    if (pw && pw.length < 6) { setError("パスワードは6文字以上にしてください"); return; }
    if (pw && pw !== pw2) { setError("パスワードが一致しません"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const body = {
        action: "updateProfile",
        email: user.email,
        displayName: displayName.trim(),
        grade: grade.trim(),
        classNum: classNum.trim(),
      };
      if (pw) body.passwordHash = await hashPassword(pw);
      const res = await gasPost(body);
      if (res.ok) {
        const updated = { ...user, displayName:displayName.trim(), grade:grade.trim(), classNum:classNum.trim() };
        localStorage.setItem("authUser", JSON.stringify(updated));
        onUpdateUser(updated);
        setSuccess("プロフィールを更新しました");
        setPw(""); setPw2("");
      } else {
        setError(res.error || "更新に失敗しました");
      }
    } catch(e) { setError("通信エラーが発生しました"); }
    setLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={card}>
        <div style={divider}><h1 style={hdg(17)}><span style={dot} />プロフィール設定</h1></div>

        <div style={{ fontFamily:FB, fontSize:12, color:C.accent, background:C.accentBg, borderRadius:8, padding:"10px 14px", marginBottom:20, lineHeight:1.6 }}>
          💡 意見は必ず<strong>匿名</strong>で他の生徒に表示されます。名前が公開されることはありません。
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>メールアドレス</label>
          <div style={{ ...inp, background:"#f1f5f9", color:C.inkMid, cursor:"not-allowed" }}>{user.email}</div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>表示名 <span style={{ color:C.danger }}>*</span></label>
          <input style={inp} value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={20} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div>
            <label style={lbl}>学年 <span style={{ fontWeight:400, color:C.inkLight }}>(任意)</span></label>
            <input style={inp} value={grade} onChange={e=>setGrade(e.target.value)} placeholder="例：2" maxLength={1} />
          </div>
          <div>
            <label style={lbl}>クラス <span style={{ fontWeight:400, color:C.inkLight }}>(任意)</span></label>
            <input style={inp} value={classNum} onChange={e=>setClassNum(e.target.value)} placeholder="例：3" maxLength={1} />
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>新しいパスワード <span style={{ fontWeight:400, color:C.inkLight }}>(変更する場合のみ)</span></label>
          <input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="6文字以上" />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>新しいパスワード（確認）</label>
          <input style={inp} type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="もう一度入力" />
        </div>
        {error   && <div style={{ fontFamily:FB, fontSize:12, color:C.danger,  marginBottom:14 }}>{error}</div>}
        {success && <div style={{ fontFamily:FB, fontSize:12, color:C.green,   marginBottom:14 }}>{success}</div>}
        <button style={{ ...btnP, ...btnSm }} onClick={handleSave} disabled={loading}>
          {loading ? "保存中..." : "保存する"}
        </button>
      </div>

      <div style={card}>
        <div style={divider}><h2 style={hdg(15)}><span style={dot} />アカウント</h2></div>
        <button style={{ ...btnO, ...btnSm, color:C.danger, borderColor:"#f9a8c0" }} onClick={onLogout}>
          ログアウト
        </button>
      </div>
    </div>
  );
}

/* ── 進捗 ── */
function Progress() {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 120); return () => clearTimeout(t); }, []);
  return (
    <div>
      {DEMO_PROGRESS.map(([label, pct, note], i) => (
        <div key={i} style={{ marginBottom: i < DEMO_PROGRESS.length-1 ? 18 : 0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
            <span style={{ fontFamily:FB, fontSize:13, fontWeight:700 }}>{label}</span>
            <span style={{ fontFamily:FB, fontSize:12, color:C.accent, fontWeight:700 }}>{pct}%</span>
          </div>
          <div style={{ height:6, background:C.rule, borderRadius:10, overflow:"hidden" }}>
            <div style={{ height:"100%", background:C.accent, borderRadius:10, width: ready ? pct+"%" : "0%", transition:"width 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
          {note && <div style={{ fontFamily:FB, fontSize:11, color:C.inkLight, marginTop:4 }}>{note}</div>}
        </div>
      ))}
    </div>
  );
}

/* ── 意見を送るページ ── */
function SendPage({ onSubmit }) {
  const [name, setName] = useState("");
  const [msg, setMsg]   = useState("");
  const [sent, setSent] = useState(false);
  const isMobile = useWidth() < 720;

  const submit = () => {
    if (!msg.trim()) { alert("意見を入力してください"); return; }
    onSubmit({ name: name.trim() || "匿名", message: msg.trim() });
    setMsg(""); setName(""); setSent(true);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 280px", gap:20, alignItems:"start" }}>
      <div style={card}>
        <div style={divider}><h1 style={hdg(17)}><span style={dot} />意見を送る</h1></div>
        <p style={{ fontFamily:FB, fontSize:13, color:C.inkMid, marginBottom:20, lineHeight:1.7 }}>
          かなえてほしいこと、改善してほしいこと、困っていること — なんでも書いてください。<br/>
          <strong style={{ color:C.accent }}>意見は匿名で表示されます。</strong>
        </p>
        <div style={{ marginBottom:18 }}>
          <label style={lbl}>タイトル <span style={{ textTransform:"none", fontWeight:400, color:C.inkLight }}>（任意）</span></label>
          <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="ここにタイトルを入力してください" maxLength={30} />
        </div>
        <div style={{ marginBottom:4 }}>
          <label style={lbl}>意見・要望 <span style={{ color:C.danger }}>*</span></label>
          <textarea style={{ ...inp, resize:"none", lineHeight:1.6, minHeight:130 }} value={msg} onChange={e => setMsg(e.target.value)} placeholder="ここに意見を入力してください" maxLength={500} rows={6} />
          <div style={{ textAlign:"right", fontFamily:FB, fontSize:11, color: msg.length > 450 ? C.amber : C.inkLight, marginTop:4 }}>{msg.length} / 500</div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" }}>
          <button style={btnP} onClick={submit}>送信する</button>
        </div>
        {sent && (
          <div style={{ fontFamily:FB, display:"flex", alignItems:"center", gap:10, background:C.greenBg, border:`1px solid #a7dfc0`, borderRadius:10, padding:"12px 16px", marginTop:16, fontSize:14, color:C.green, fontWeight:700 }}>
            ✓ 意見を送信しました。ご協力ありがとうございます。
          </div>
        )}
      </div>
      <aside style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={card}>
          <div style={divider}><h2 style={hdg(14)}><span style={dot} />生徒会の進捗</h2></div>
          <Progress />
        </div>
      </aside>
    </div>
  );
}

/* ── 確認ダイアログ ── */
function ConfirmDialog({ msg, onOk, onCancel }) {
  if (!msg) return null;
  return (
    <div onClick={onCancel} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"overlayIn 0.15s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.paper, borderRadius:14, padding:24, width:"100%", maxWidth:340, boxShadow:"0 16px 40px rgba(0,0,0,0.18)", animation:"modalIn 0.18s ease" }}>
        <p style={{ fontFamily:FB, fontSize:14, color:C.ink, marginBottom:20, lineHeight:1.7 }}>{msg}</p>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ ...btnO, ...btnSm }}>キャンセル</button>
          <button onClick={onOk}     style={{ ...btnP, ...btnSm }}>確認</button>
        </div>
      </div>
    </div>
  );
}

/* ── みんなの声ページ ── */
function OpinionsPage({ opinions, isAdmin, onToggleAdopt, onSetProgress, onSetPct, onSetReply }) {
  const [filter, setFilter]       = useState("all");
  const [sortOrder, setSortOrder] = useState(isAdmin ? "asc" : "desc");
  const [confirmState, setConfirmState] = useState(null);
  const [replyingRow, setReplyingRow]   = useState(null);
  const [replyText, setReplyText]       = useState("");
  const [replyImageData, setReplyImageData] = useState(null);
  const isMobile = useWidth() < 720;

  const openReply  = (item) => { setReplyingRow(item.row); setReplyText(item.reply || ""); setReplyImageData(item.replyImage || null); };
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
    return sortOrder === "asc" ? diff : -diff;
  });
  const filtered = filter === "all" ? sorted
    : ["採用","未採用"].includes(filter) ? sorted.filter(o => o.status === filter)
    : sorted.filter(o => o.progress === filter);

  const askConfirm = (row, adopt) => setConfirmState({ row, adopt, msg: adopt ? "この意見を採用しますか？" : "採用を取り消しますか？" });
  const doConfirm  = () => { onToggleAdopt(confirmState.row, confirmState.adopt); setConfirmState(null); };

  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 280px", gap:20, alignItems:"start" }}>
        <div style={card}>
          <div style={{ ...divider, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <h1 style={hdg(17)}><span style={dot} />みんなの声</h1>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:`1px solid ${C.rule}` }}>
                {["desc","asc"].map(o => (
                  <button key={o} onClick={() => setSortOrder(o)}
                    style={{ fontFamily:FB, fontSize:12, fontWeight:700, padding:"6px 12px", border:"none", cursor:"pointer", background: sortOrder===o ? C.accent : C.paper, color: sortOrder===o ? "#fff" : C.inkMid, transition:"all .15s" }}>
                    {o==="desc" ? "新しい順" : "古い順"}
                  </button>
                ))}
              </div>
              <select style={{ ...inp, width:"auto", minWidth:130, fontSize:13 }} value={filter} onChange={e => setFilter(e.target.value)}>
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
            <div style={{ fontFamily:FB, background:C.amberBg, border:`1px solid #fcd34d`, borderRadius:10, padding:"10px 14px", fontSize:13, color:C.amber, fontWeight:700, marginBottom:16 }}>
              管理モード ON — 投稿者の名前が表示されています
            </div>
          )}
          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {filtered.length === 0 ? (
              <div style={{ fontFamily:FB, textAlign:"center", padding:"40px 0", color:C.inkLight, fontSize:13 }}>該当する意見はありません</div>
            ) : filtered.map(item => {
              const adopted = item.status === "採用";
              return (
                <div key={item.row} style={{ padding:14, border:`1px solid ${C.rule}`, borderRadius:10, marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8 }}>
                    <div>
                      {/* 管理者には本名・一般には匿名表示 */}
                      <div style={{ fontFamily:FB, fontSize:13, fontWeight:700 }}>
                        {isAdmin && item.authorName ? `${item.authorName}（${item.name}）` : item.name}
                      </div>
                      {isAdmin && item.authorInfo && (
                        <div style={{ fontFamily:FB, fontSize:11, color:C.accent, marginTop:1 }}>{item.authorInfo}</div>
                      )}
                      <div style={{ fontFamily:FB, fontSize:11, color:C.inkLight, marginTop:2 }}>{item.timestamp}</div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:100, background: adopted ? C.greenBg : C.wash, color: adopted ? C.green : C.inkLight, whiteSpace:"nowrap" }}>
                        {adopted ? "✓ 採用" : "検討中"}
                      </span>
                      {(() => { const ps = PROGRESS_STYLE[item.progress] || PROGRESS_STYLE["未着手"]; return (
                        <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:100, background:ps.bg, color:ps.color, border:`1px solid ${ps.border}`, whiteSpace:"nowrap" }}>
                          {item.progress || "未着手"}
                        </span>
                      ); })()}
                    </div>
                  </div>
                  <div style={{ fontFamily:FB, fontSize:14, lineHeight:1.75 }}>{item.message}</div>

                  {/* 進捗バー */}
                  <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.rule}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                      <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.inkMid }}>進捗状況</span>
                      <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.accent }}>{item.pct ?? 0}%</span>
                    </div>
                    {isAdmin ? (
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <select value={item.progress || "未着手"} onChange={e => onSetProgress(item.row, e.target.value)}
                          style={{ fontFamily:FB, fontSize:12, color:C.ink, background:C.wash, border:`1px solid ${C.rule}`, borderRadius:6, padding:"4px 8px", outline:"none", cursor:"pointer" }}>
                          {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input type="range" min={0} max={100} step={1} value={item.pct ?? 0}
                          onChange={e => onSetPct(item.row, Number(e.target.value))}
                          style={{ flex:1, accentColor:C.accent, cursor:"pointer", height:4 }} />
                      </div>
                    ) : (
                      <div style={{ height:6, background:C.rule, borderRadius:10, overflow:"hidden" }}>
                        <div style={{ height:"100%", background:C.accent, borderRadius:10, width:`${item.pct ?? 0}%`, transition:"width 0.6s ease" }} />
                      </div>
                    )}
                  </div>

                  {/* 返信表示 */}
                  {item.reply && replyingRow !== item.row && (
                    <div style={{ background:C.accentBg, borderRadius:8, padding:"10px 12px", marginTop:10 }}>
                      <div style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.accent, marginBottom:6 }}>生徒会より</div>
                      <div style={{ fontFamily:FB, fontSize:13, lineHeight:1.75, color:C.ink }}>{item.reply}</div>
                      {item.replyImage && <img src={item.replyImage} alt="返信画像" style={{ marginTop:10, maxWidth:"100%", maxHeight:240, borderRadius:8, objectFit:"contain", display:"block" }} />}
                    </div>
                  )}

                  {/* 管理者返信フォーム */}
                  {isAdmin && replyingRow === item.row && (
                    <div style={{ background:C.accentBg, borderRadius:8, padding:"12px", marginTop:10 }}>
                      <div style={{ fontFamily:FB, fontSize:12, fontWeight:700, color:C.accent, marginBottom:8 }}>返信を編集</div>
                      <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="返信メッセージ" rows={3}
                        style={{ ...inp, resize:"none", fontSize:13, marginBottom:8, display:"block" }} />
                      <div style={{ marginBottom:10 }}>
                        <label style={{ ...lbl, display:"block", marginBottom:4 }}>画像を添付 <span style={{ fontWeight:400, color:C.inkLight }}>（任意）</span></label>
                        <input type="file" accept="image/*" onChange={handleImagePick} style={{ fontFamily:FB, fontSize:12, color:C.inkMid }} />
                        {replyImageData && <img src={replyImageData} alt="プレビュー" style={{ marginTop:8, maxWidth:"100%", maxHeight:180, borderRadius:8, objectFit:"contain", display:"block" }} />}
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => saveReply(item.row)} style={{ ...btnP, ...btnSm }}>保存</button>
                        <button onClick={closeReply} style={{ ...btnO, ...btnSm }}>キャンセル</button>
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
                      <button onClick={() => askConfirm(item.row, !adopted)}
                        style={{ fontFamily:FB, background: adopted ? C.dangerBg : C.greenBg, border:`1px solid ${adopted ? "#f9a8c0" : "#a7dfc0"}`, color: adopted ? C.danger : C.green, fontSize:12, padding:"5px 12px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>
                        {adopted ? "採用を取り消す" : "採用する"}
                      </button>
                      {replyingRow !== item.row && (
                        <button onClick={() => openReply(item)}
                          style={{ fontFamily:FB, background:C.accentBg, border:`1px solid ${C.accent}`, color:C.accent, fontSize:12, padding:"5px 12px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>
                          {item.reply ? "返信を編集" : "返信を追加"}
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
          <div style={card}>
            <div style={divider}><h2 style={hdg(14)}><span style={dot} />生徒会の進捗</h2></div>
            <Progress />
          </div>
        </aside>
      </div>
      <ConfirmDialog msg={confirmState?.msg} onOk={doConfirm} onCancel={() => setConfirmState(null)} />
    </>
  );
}

/* ── インライン編集フォーム ── */
function EventEditForm({ form, setForm, onSave, onCancel, isNew }) {
  return (
    <div style={{ background:C.accentBg, border:`1px solid ${C.accent}`, borderRadius:10, padding:14, margin:"8px 0 4px" }}>
      <div style={{ fontFamily:FS, fontWeight:600, fontSize:13, color:C.accent, marginBottom:12 }}>{isNew ? "新しい予定を追加" : "予定を編集"}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:8, marginBottom:8 }}>
        <div>
          <label style={{ ...lbl, fontSize:10 }}>日付</label>
          <input type="date" value={form.date} onChange={e => setForm(f=>({...f, date:e.target.value}))} style={{ ...inp, fontSize:12, padding:"7px 10px" }} />
        </div>
        <div>
          <label style={{ ...lbl, fontSize:10 }}>タイトル</label>
          <input value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))} placeholder="例：生徒総会" style={{ ...inp, fontSize:12, padding:"7px 10px" }} maxLength={40} />
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={{ ...lbl, fontSize:10 }}>説明 <span style={{ textTransform:"none", fontWeight:400, color:C.inkLight }}>（任意）</span></label>
        <input value={form.desc} onChange={e => setForm(f=>({...f, desc:e.target.value}))} placeholder="例：放課後 第2会議室" style={{ ...inp, fontSize:12, padding:"7px 10px" }} maxLength={80} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onSave} style={{ ...btnP, ...btnSm }}>保存</button>
        <button onClick={onCancel} style={{ ...btnO, ...btnSm }}>キャンセル</button>
      </div>
    </div>
  );
}

/* ── 予定表ページ ── */
function EventsPage({ events, isAdmin, onAddEvent, onEditEvent, onDeleteEvent }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState({ date:"", title:"", desc:"" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openNew   = () => { setForm({ date:"", title:"", desc:"" }); setEditingId("new"); };
  const openEdit  = (ev) => { setForm({ date:ev.date, title:ev.title, desc:ev.desc }); setEditingId(ev.id); };
  const closeForm = () => setEditingId(null);
  const saveForm  = () => {
    if (!form.date || !form.title.trim()) { alert("日付とタイトルは必須です"); return; }
    if (editingId === "new") onAddEvent(form); else onEditEvent(editingId, form);
    closeForm();
  };
  const askDelete = (ev) => setDeleteConfirm({ id:ev.id, title:ev.title });
  const doDelete  = () => { onDeleteEvent(deleteConfirm.id); setDeleteConfirm(null); };

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
      <div style={card}>
        <div style={divider}><h2 style={hdg(17)}><span style={dot} />葵中学校 年間行事予定</h2></div>
        <p style={{ fontFamily:FB, fontSize:13, color:C.inkMid, marginBottom:16, lineHeight:1.7 }}>葵中学校 年間行事予定</p>
        <a href="https://cms.oklab.ed.jp/jh/aoi/index.cfm/1,2863,c,html/2863/20260220-134641.pdf" target="_blank" rel="noopener noreferrer" style={btnO}>
          📄 年間行事予定を開く
        </a>
      </div>
      <div style={card}>
        <div style={{ ...divider, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <h1 style={hdg(17)}><span style={dot} />生徒会活動・行事予定</h1>
          {isAdmin && editingId !== "new" && <button onClick={openNew} style={{ ...btnP, ...btnSm, gap:4 }}>＋ 追加</button>}
        </div>
        {editingId === "new" && <EventEditForm form={form} setForm={setForm} onSave={saveForm} onCancel={closeForm} isNew={true} />}
        {Object.keys(groups).sort().map(key => {
          const g = groups[key];
          return (
            <div key={key} style={{ marginBottom:24 }}>
              <div style={{ fontFamily:FS, fontSize:13, fontWeight:600, color:C.inkLight, letterSpacing:"0.08em", marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.rule}` }}>{g.label}</div>
              {g.items.map((item, i) => (
                <div key={item.id}>
                  <div style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"13px 0", borderBottom: editingId===item.id ? "none" : (i<g.items.length-1 ? `1px solid ${C.rule}` : "none") }}>
                    <div style={{ minWidth:52, textAlign:"center", background:C.accentBg, borderRadius:6, padding:"6px 8px 5px", flexShrink:0 }}>
                      <div style={{ fontFamily:FB, fontSize:10, color:C.accent, fontWeight:700 }}>{item.dt.getMonth()+1}月</div>
                      <div style={{ fontFamily:FS, fontSize:22, fontWeight:600, color:C.accent, lineHeight:1.1 }}>{item.dt.getDate()}</div>
                      <div style={{ fontFamily:FB, fontSize:10, color:C.accent, opacity:0.7 }}>（{WD[item.dt.getDay()]}）</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:FB, fontSize:14, fontWeight:700, lineHeight:1.4 }}>{item.title}</div>
                      {item.desc && <div style={{ fontFamily:FB, fontSize:12, color:C.inkMid, marginTop:4, lineHeight:1.6 }}>{item.desc}</div>}
                      {isAdmin && editingId !== item.id && (
                        <div style={{ display:"flex", gap:8, marginTop:8 }}>
                          <button onClick={() => openEdit(item)} style={{ fontFamily:FB, background:C.accentBg, border:`1px solid ${C.accent}`, color:C.accent, fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>編集</button>
                          <button onClick={() => askDelete(item)} style={{ fontFamily:FB, background:C.dangerBg, border:`1px solid #f9a8c0`, color:C.danger, fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>削除</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && editingId === item.id && (
                    <div style={{ borderBottom: i<g.items.length-1 ? `1px solid ${C.rule}` : "none", paddingBottom:8 }}>
                      <EventEditForm form={form} setForm={setForm} onSave={saveForm} onCancel={closeForm} isNew={false} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {events.length === 0 && <div style={{ fontFamily:FB, textAlign:"center", padding:"32px 0", color:C.inkLight, fontSize:13 }}>予定がありません</div>}
      </div>
      <ConfirmDialog msg={deleteConfirm ? `「${deleteConfirm.title}」を削除してもよいですか？` : null} onOk={doDelete} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}

/* ── アンケートページ ── */
function SurveyPage({ surveys, isAdmin, onAddSurvey, onAnswerSurvey, onDeleteSurvey }) {
  const [creating, setCreating]     = useState(false);
  const [form, setForm]             = useState({ title:"", desc:"", options:["",""], allowFree:false });
  const [answering, setAnswering]   = useState(null);
  const [selected, setSelected]     = useState(null);
  const [freeText, setFreeText]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const addOption    = () => setForm(f => ({ ...f, options:[...f.options, ""] }));
  const updateOption = (i, v) => setForm(f => { const o=[...f.options]; o[i]=v; return {...f,options:o}; });
  const removeOption = (i) => setForm(f => ({ ...f, options:f.options.filter((_,idx)=>idx!==i) }));

  const saveNew = () => {
    if (!form.title.trim()) { alert("タイトルを入力してください"); return; }
    if (form.options.some(o=>!o.trim())) { alert("選択肢を全て入力してください"); return; }
    onAddSurvey({ ...form, options:form.options.filter(o=>o.trim()) });
    setForm({ title:"", desc:"", options:["",""], allowFree:false });
    setCreating(false);
  };

  const submitAnswer = (id) => {
    if (selected === null) { alert("選択肢を選んでください"); return; }
    onAnswerSurvey(id, selected, freeText);
    setAnswering(null); setSelected(null); setFreeText("");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={card}>
        <div style={{ ...divider, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h1 style={hdg(17)}><span style={dot} />アンケート</h1>
          {isAdmin && !creating && <button onClick={() => setCreating(true)} style={{ ...btnP, ...btnSm }}>＋ 新規作成</button>}
        </div>
        {isAdmin && creating && (
          <div style={{ background:C.accentBg, border:`1px solid ${C.accent}`, borderRadius:12, padding:16, marginBottom:20 }}>
            <div style={{ fontFamily:FS, fontSize:15, fontWeight:600, color:C.accent, marginBottom:14 }}>新しいアンケートを作成</div>
            <label style={lbl}>タイトル</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="例：文化祭の出し物について" style={{ ...inp, marginBottom:10 }} />
            <label style={lbl}>説明 <span style={{ fontWeight:400, color:C.inkLight }}>（任意）</span></label>
            <input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="例：みんなの意見を聞かせてください" style={{ ...inp, marginBottom:14 }} />
            <label style={lbl}>選択肢</label>
            {form.options.map((o,i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                <input value={o} onChange={e=>updateOption(i,e.target.value)} placeholder={`選択肢 ${i+1}`} style={{ ...inp }} />
                {form.options.length > 2 && (
                  <button onClick={()=>removeOption(i)} style={{ fontFamily:FB, background:C.dangerBg, border:`1px solid #f9a8c0`, color:C.danger, fontSize:12, padding:"6px 10px", borderRadius:6, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>削除</button>
                )}
              </div>
            ))}
            <button onClick={addOption} style={{ ...btnO, ...btnSm, marginBottom:14 }}>＋ 選択肢を追加</button>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <input type="checkbox" id="allowFree" checked={form.allowFree} onChange={e=>setForm(f=>({...f,allowFree:e.target.checked}))} style={{ width:16, height:16, accentColor:C.accent }} />
              <label htmlFor="allowFree" style={{ fontFamily:FB, fontSize:13, color:C.inkMid, cursor:"pointer" }}>自由記述欄も追加する</label>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={saveNew} style={{ ...btnP, ...btnSm }}>公開する</button>
              <button onClick={()=>setCreating(false)} style={{ ...btnO, ...btnSm }}>キャンセル</button>
            </div>
          </div>
        )}
        {surveys.length === 0 && <div style={{ fontFamily:FB, textAlign:"center", padding:"40px 0", color:C.inkLight, fontSize:13 }}>アンケートはまだありません</div>}
        {surveys.map(sv => {
          const total = sv.answers ? sv.answers.reduce((s,a)=>s+a.count,0) : 0;
          const isAnswering = answering === sv.id;
          const myAnswer = sv.myAnswer;
          return (
            <div key={sv.id} style={{ border:`1px solid ${C.rule}`, borderRadius:12, padding:16, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8 }}>
                <div>
                  <div style={{ fontFamily:FS, fontSize:16, fontWeight:600, color:C.ink }}>{sv.title}</div>
                  {sv.desc && <div style={{ fontFamily:FB, fontSize:12, color:C.inkMid, marginTop:4 }}>{sv.desc}</div>}
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                  <span style={{ fontFamily:FB, fontSize:11, color:C.inkLight }}>{total}票</span>
                  {isAdmin && <button onClick={()=>setConfirmDel(sv.id)} style={{ fontFamily:FB, background:C.dangerBg, border:`1px solid #f9a8c0`, color:C.danger, fontSize:11, padding:"3px 8px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>削除</button>}
                </div>
              </div>
              {isAdmin && (
                <div style={{ marginBottom:12 }}>
                  {sv.options.map((opt, i) => {
                    const ans = sv.answers ? sv.answers.find(a=>a.index===i) : null;
                    const cnt = ans ? ans.count : 0;
                    const pct = total > 0 ? Math.round(cnt/total*100) : 0;
                    return (
                      <div key={i} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontFamily:FB, fontSize:13, color:C.ink }}>{opt}</span>
                          <span style={{ fontFamily:FB, fontSize:12, fontWeight:700, color:C.accent }}>{cnt}票 ({pct}%)</span>
                        </div>
                        <div style={{ height:6, background:C.rule, borderRadius:10, overflow:"hidden" }}>
                          <div style={{ height:"100%", background:C.accent, borderRadius:10, width:`${pct}%`, transition:"width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontFamily:FB, fontSize:11, color:C.inkLight, textAlign:"right", marginTop:4 }}>合計 {total}票</div>
                </div>
              )}
              {!isAdmin && (
                <div style={{ marginBottom:12 }}>
                  {sv.options.map((opt, i) => (
                    <div key={i} style={{ fontFamily:FB, fontSize:13, color:C.inkMid, padding:"4px 0", borderBottom:`1px solid ${C.rule}` }}>{opt}</div>
                  ))}
                </div>
              )}
              {!myAnswer && !isAnswering && <button onClick={()=>{ setAnswering(sv.id); setSelected(null); setFreeText(""); }} style={{ ...btnP, ...btnSm }}>回答する</button>}
              {myAnswer && <div style={{ fontFamily:FB, fontSize:12, color:C.green, fontWeight:700 }}>✓ 回答済み：{sv.options[myAnswer.index]}</div>}
              {isAnswering && (
                <div style={{ background:C.accentBg, border:`1px solid ${C.accent}`, borderRadius:10, padding:14, marginTop:8 }}>
                  <div style={{ fontFamily:FB, fontSize:13, fontWeight:700, color:C.accent, marginBottom:10 }}>選択してください</div>
                  {sv.options.map((opt, i) => (
                    <div key={i} onClick={()=>setSelected(i)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, marginBottom:6, cursor:"pointer", background: selected===i ? C.accent+"18" : C.paper, border:`1px solid ${selected===i ? C.accent : C.rule}` }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${selected===i ? C.accent : C.rule}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {selected===i && <div style={{ width:8, height:8, borderRadius:"50%", background:C.accent }} />}
                      </div>
                      <span style={{ fontFamily:FB, fontSize:13, color:C.ink }}>{opt}</span>
                    </div>
                  ))}
                  {sv.allowFree && (
                    <div style={{ marginTop:10 }}>
                      <label style={lbl}>自由記述 <span style={{ fontWeight:400, color:C.inkLight }}>（任意）</span></label>
                      <textarea value={freeText} onChange={e=>setFreeText(e.target.value)} rows={2} placeholder="自由にコメントを書いてください" style={{ ...inp, resize:"none", fontSize:13 }} />
                    </div>
                  )}
                  <div style={{ display:"flex", gap:8, marginTop:12 }}>
                    <button onClick={()=>submitAnswer(sv.id)} style={{ ...btnP, ...btnSm }}>送信</button>
                    <button onClick={()=>setAnswering(null)} style={{ ...btnO, ...btnSm }}>キャンセル</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ConfirmDialog msg={confirmDel ? "このアンケートを削除してもよいですか？" : null} onOk={()=>{ onDeleteSurvey(confirmDel); setConfirmDel(null); }} onCancel={()=>setConfirmDel(null)} />
    </div>
  );
}

/* ── iPhone風通知バナー ── */
function NotifBanner({ survey, onTap, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    playNotifSound();
    const t = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(t);
  }, [survey]);
  const dismiss = () => { setLeaving(true); setTimeout(() => { setVisible(false); onDismiss(); }, 350); };
  if (!visible || !survey) return null;
  return (
    <div onClick={() => { onTap(); dismiss(); }}
      style={{ position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", zIndex:9000, width:"min(380px, 92vw)", background:"rgba(30,30,40,0.92)", backdropFilter:"blur(16px)", borderRadius:18, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 8px 32px rgba(0,0,0,0.28)", cursor:"pointer", animation:`${leaving ? "notifSlideOut" : "notifSlideIn"} 0.35s cubic-bezier(.32,1.2,.48,1) forwards` }}>
      <div style={{ width:40, height:40, borderRadius:10, background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/>
          <circle cx="6" cy="9" r="1" fill="#fff"/><circle cx="6" cy="13" r="1" fill="#fff"/>
        </svg>
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
  return (
    <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:C.ink, color:"#fff", fontFamily:FB, fontSize:13, fontWeight:500, padding:"10px 22px", borderRadius:100, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.22)", pointerEvents:"none", animation:"toastIn 0.25s ease" }}>
      {msg}
    </div>
  );
}

/* ── ナビアイコン ── */
function NavIcon({ type, active, color }) {
  const col = color || (active ? C.accent : C.inkLight);
  const bg  = active ? col + "28" : "none";
  const sz  = 24;
  const icons = {
    send: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 2 15 22 11 13 2 9 22 2" fill={bg}/><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    opinions: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20 2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3l2 3 2-3h9a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" stroke={col} strokeWidth="1.6" fill={bg}/><line x1="7" y1="8" x2="17" y2="8" stroke={col} strokeWidth="1.4"/><line x1="7" y1="12" x2="13" y2="12" stroke={col} strokeWidth="1.4"/></svg>,
    events: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill={bg}/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    survey: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" fill={bg}/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>,
    settings: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" fill={bg}/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };
  return <span style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>{icons[type]}</span>;
}

/* ── ボトムナビ ── */
function BottomNav({ page, setPage, unreadCount, onClearUnread }) {
  const tabs = [
    { id:"send",     icon:"send",     label:"意見を送る" },
    { id:"opinions", icon:"opinions", label:"みんなの声" },
    { id:"events",   icon:"events",   label:"予定表" },
    { id:"survey",   icon:"survey",   label:"アンケート" },
    { id:"settings", icon:"settings", label:"設定" },
  ];
  const btnStyle = (active) => ({ flex:1, background:"none", border:"none", fontFamily:FB, fontSize:10, fontWeight: active ? 700 : 500, color: active ? C.accent : C.inkLight, padding:"10px 4px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 });
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:C.paper, borderTop:`1px solid ${C.rule}`, zIndex:300, display:"flex", alignItems:"stretch" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => { setPage(t.id); if(t.id==="survey") onClearUnread(); }}
          style={{ ...btnStyle(page === t.id), position:"relative" }}>
          <NavIcon type={t.icon} active={page === t.id} />
          {t.label}
          {t.id === "survey" && unreadCount > 0 && (
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
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [{ freq:1046.5, t:0, dur:0.18 },{ freq:1318.5, t:0.1, dur:0.18 },{ freq:1568.0, t:0.2, dur:0.35 }].forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now+t); gain.gain.linearRampToValueAtTime(0.18, now+t+0.015); gain.gain.exponentialRampToValueAtTime(0.001, now+t+dur);
      osc.start(now+t); osc.stop(now+t+dur+0.05);
    });
  } catch(e) {}
}

/* ============================================================
   メインアプリ
   ============================================================ */
export default function App() {
  const [user, setUser]           = useState(null);    // ログイン中のユーザー
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPageRaw]        = useState("send");
  const setPage = (p) => { setPageRaw(p); window.scrollTo({ top:0, behavior:"instant" }); };
  const [opinions, setOpinions]   = useState([]);
  const [events, setEvents]       = useState([]);
  const [surveys, setSurveys]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [notifSurvey, setNotifSurvey] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast]         = useState("");
  const toastTimer                = useRef(null);
  const isMobile                  = useWidth() < 720;
  let nextEvId                    = useRef(DEMO_EVENTS_INIT.length + 1);
  let nextSvId                    = useRef(1);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // localStorageからログイン状態を復元
  useEffect(() => {
    const saved = localStorage.getItem("authUser");
    if (saved) { try { setUser(JSON.parse(saved)); } catch(e) {} }
    setAuthChecked(true);
  }, []);

  // ログイン後のデータ取得
  useEffect(() => {
    if (!user || !USE_GAS) return;
    setLoading(true);
    Promise.all([gasGet("getOpinions"), gasGet("getEvents"), gasGet("getSurveys")])
      .then(([ops, evs, svs]) => {
        setOpinions(Array.isArray(ops) ? ops : []);
        setEvents(Array.isArray(evs) ? evs.sort((a,b) => a.date.localeCompare(b.date)) : []);
        const savedAnswers = JSON.parse(localStorage.getItem("surveyAnswers") || "{}");
        setSurveys((Array.isArray(svs) ? svs : []).map(sv => ({ ...sv, myAnswer: savedAnswers[sv.id] || null })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const showToast = msg => {
    setToast(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const handleLogin  = (u) => { setUser(u); showToast("ログインしました"); };
  const handleLogout = () => {
    localStorage.removeItem("authUser");
    setUser(null); setOpinions([]); setEvents([]); setSurveys([]);
    showToast("ログアウトしました");
  };
  const handleUpdateUser = (updated) => { setUser(updated); showToast("プロフィールを更新しました"); };

  const handleSubmit = async ({ name, message }) => {
    if (USE_GAS) {
      await gasPost({ action:"addOpinion", name, message, authorEmail: user.email, authorName: user.displayName, authorInfo: user.grade && user.classNum ? `${user.grade}年${user.classNum}組` : "" });
      const ops = await gasGet("getOpinions");
      setOpinions(Array.isArray(ops) ? ops : []);
    }
    showToast("意見を送信しました");
  };

  const handleToggleAdopt = async (row, adopt) => {
    if (USE_GAS) await gasPost({ action:"updateOpinion", row, status: adopt ? "採用" : "未採用" });
    setOpinions(prev => prev.map(o => o.row === row ? { ...o, status: adopt ? "採用" : "未採用" } : o));
    showToast(adopt ? "採用しました" : "採用を取り消しました");
  };
  const handleSetProgress = async (row, progress) => {
    if (USE_GAS) await gasPost({ action:"updateOpinion", row, progress });
    setOpinions(prev => prev.map(o => o.row === row ? { ...o, progress } : o));
    showToast(`「${progress}」に変更しました`);
  };
  const handleSetPct = async (row, pct) => {
    if (USE_GAS) await gasPost({ action:"updateOpinion", row, pct });
    setOpinions(prev => prev.map(o => o.row === row ? { ...o, pct } : o));
  };
  const handleSetReply = async (row, reply, replyImage) => {
    if (USE_GAS) await gasPost({ action:"updateOpinion", row, reply: reply || "" });
    setOpinions(prev => prev.map(o => o.row === row ? { ...o, reply, replyImage } : o));
    showToast("返信を保存しました");
  };

  const handleAddEvent = async ({ date, title, desc }) => {
    if (USE_GAS) { await gasPost({ action:"addEvent", date, title, desc }); const evs = await gasGet("getEvents"); setEvents(Array.isArray(evs) ? evs.sort((a,b)=>a.date.localeCompare(b.date)) : []); }
    showToast("予定を追加しました");
  };
  const handleEditEvent = async (id, { date, title, desc }) => {
    if (USE_GAS) { await gasPost({ action:"editEvent", id, date, title, desc }); const evs = await gasGet("getEvents"); setEvents(Array.isArray(evs) ? evs.sort((a,b)=>a.date.localeCompare(b.date)) : []); }
    showToast("予定を更新しました");
  };
  const handleDeleteEvent = async (id) => {
    if (USE_GAS) await gasPost({ action:"deleteEvent", id });
    setEvents(prev => prev.filter(e => e.id !== id));
    showToast("予定を削除しました");
  };

  const handleAddSurvey = async (sv) => {
    if (USE_GAS) {
      await gasPost({ action:"addSurvey", ...sv });
      const svs = await gasGet("getSurveys");
      const loaded = Array.isArray(svs) ? svs : [];
      setSurveys(loaded);
      const newSv = loaded[0];
      if (newSv) { setNotifSurvey(newSv); setUnreadCount(c => c+1); }
    }
    showToast("アンケートを公開しました");
  };
  const handleAnswerSurvey = async (id, optionIndex, freeText) => {
    if (USE_GAS) {
      await gasPost({ action:"answerSurvey", id, optionIndex, freeText: freeText || "" });
      const svs = await gasGet("getSurveys");
      const savedAnswers = JSON.parse(localStorage.getItem("surveyAnswers") || "{}");
      savedAnswers[id] = { index: optionIndex, freeText: freeText || "" };
      localStorage.setItem("surveyAnswers", JSON.stringify(savedAnswers));
      setSurveys(prev => { const loaded = Array.isArray(svs) ? svs : prev; return loaded.map(sv => sv.id === id ? { ...sv, myAnswer: { index: optionIndex, freeText } } : sv); });
    }
    showToast("回答しました！");
  };
  const handleDeleteSurvey = async (id) => {
    if (USE_GAS) { await gasPost({ action:"deleteSurvey", id }); const svs = await gasGet("getSurveys"); setSurveys(Array.isArray(svs) ? svs : []); }
    showToast("アンケートを削除しました");
  };

  const tabs = [
    { id:"send",     label:"意見を送る" },
    { id:"opinions", label:"みんなの声" },
    { id:"events",   label:"予定表" },
    { id:"survey",   label:"アンケート" },
  ];

  // 認証確認前はローディング
  if (!authChecked) return null;

  // 未ログインはログイン画面
  if (!user) return (
    <>
      <AuthPage onLogin={handleLogin} />
      <Toast msg={toast} />
    </>
  );

  return (
    <div style={{ fontFamily:FB, background:C.wash, minHeight:"100vh", color:C.ink, lineHeight:1.7 }}>
      {/* ヘッダー */}
      <header style={{ background:C.paper, borderBottom:`1px solid ${C.rule}`, position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1060, margin:"auto", padding:"0 20px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div onClick={() => setPage("send")} style={{ display:"flex", alignItems:"baseline", gap:10, cursor:"pointer", flexShrink:0 }}>
            <span style={{ fontFamily:FS, fontWeight:600, fontSize:16, letterSpacing:"0.04em", color:C.ink }}>みんなの意見箱</span>
            {isAdmin && <span style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.amber, background:C.amberBg, padding:"2px 8px", borderRadius:100 }}>管理者</span>}
          </div>
          {isMobile && (
            <button onClick={() => { setPage("survey"); setUnreadCount(0); }} style={{ position:"relative", background:"none", border:`1px solid ${C.rule}`, borderRadius:100, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginLeft:"auto" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.inkMid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && <span style={{ position:"absolute", top:2, right:2, width:15, height:15, borderRadius:"50%", background:C.danger, color:"#fff", fontSize:8, fontWeight:700, fontFamily:FB, display:"flex", alignItems:"center", justifyContent:"center" }}>{unreadCount}</span>}
            </button>
          )}
          {!isMobile && (
            <nav style={{ display:"flex", gap:2 }}>
              {[...tabs, { id:"settings", label:"設定" }].map(t => (
                <button key={t.id} onClick={() => setPage(t.id)}
                  style={{ fontFamily:FB, background: page===t.id ? C.accentBg : "none", border:"none", fontSize:13, fontWeight: page===t.id ? 700 : 500, color: page===t.id ? C.accent : C.inkMid, padding:"6px 12px", borderRadius:8, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, transition:"background .15s" }}>
                  <NavIcon type={t.id === "settings" ? "settings" : t.id} active={page===t.id} />
                  {t.label}
                </button>
              ))}
            </nav>
          )}
          {!isMobile && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={() => { setPage("survey"); setUnreadCount(0); }} style={{ position:"relative", background:"none", border:`1px solid ${C.rule}`, borderRadius:100, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.inkMid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && <span style={{ position:"absolute", top:2, right:2, width:16, height:16, borderRadius:"50%", background:C.danger, color:"#fff", fontSize:9, fontWeight:700, fontFamily:FB, display:"flex", alignItems:"center", justifyContent:"center" }}>{unreadCount}</span>}
              </button>
              <div style={{ fontFamily:FB, fontSize:12, color:C.inkMid }}>{user.displayName}</div>
            </div>
          )}
        </div>
      </header>

      {/* メイン */}
      <main style={{ maxWidth:1060, margin:"24px auto", padding: isMobile ? "0 12px" : "0 24px", paddingBottom: isMobile ? 90 : 60 }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", fontFamily:FB, color:C.inkLight }}>読み込み中...</div>
        ) : (
          <>
            {page === "send"     && <SendPage onSubmit={handleSubmit} />}
            {page === "opinions" && <OpinionsPage opinions={opinions} isAdmin={isAdmin} onToggleAdopt={handleToggleAdopt} onSetProgress={handleSetProgress} onSetPct={handleSetPct} onSetReply={handleSetReply} />}
            {page === "events"   && <EventsPage events={events} isAdmin={isAdmin} onAddEvent={handleAddEvent} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} />}
            {page === "survey"   && <SurveyPage surveys={surveys} isAdmin={isAdmin} onAddSurvey={handleAddSurvey} onAnswerSurvey={handleAnswerSurvey} onDeleteSurvey={handleDeleteSurvey} />}
            {page === "settings" && <SettingsPage user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />}
          </>
        )}
      </main>

      {isMobile && <BottomNav page={page} setPage={setPage} unreadCount={unreadCount} onClearUnread={() => setUnreadCount(0)} />}
      <Toast msg={toast} />
      <NotifBanner survey={notifSurvey} onTap={() => { setPage("survey"); setUnreadCount(0); }} onDismiss={() => setNotifSurvey(null)} />
    </div>
  );
}
