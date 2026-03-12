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
  * { box-sizing: border-box; }
  body { margin: 0; }
`;
document.head.appendChild(styleEl);

/* ── データ ── */
const ADMIN_PW = "0510";

// ★ GASをデプロイしたら下のURLを書き換えてください ★
const GAS_URL = "https://script.google.com/macros/s/AKfycbxiaYKPEdg3bZx-e2PiUuENQ2TDcabOdHlHZSIoXc6J0zudXAk1kdLfd0numCJWM3Yz/exec";
const USE_GAS = true; // GAS接続時は true に変更

const DEMO_OPINIONS_INIT = [];

// 進捗ステータスの定義
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
const card  = { background:C.paper, border:`1px solid ${C.rule}`, borderRadius:16, padding:24, boxShadow:"0 1px 4px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)" };
const hdg   = (sz=17) => ({ fontFamily:FS, fontWeight:600, fontSize:sz, color:C.ink, display:"flex", alignItems:"center", gap:8, margin:0, padding:0 });
const dot   = { width:6, height:6, borderRadius:"50%", background:C.accent, flexShrink:0, display:"inline-block" };
const lbl   = { display:"block", fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:"0.06em", color:C.inkMid, textTransform:"uppercase", marginBottom:6 };
const inp   = { width:"100%", fontFamily:FB, fontSize:14, color:C.ink, background:C.wash, border:`1px solid ${C.rule}`, borderRadius:10, padding:"10px 14px", outline:"none" };
const btnP  = { fontFamily:FB, background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 };
const btnO  = { fontFamily:FB, background:C.paper, border:`1px solid ${C.rule}`, borderRadius:10, padding:"9px 18px", fontSize:14, fontWeight:700, cursor:"pointer", color:C.inkMid, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 };
const btnSm = { padding:"6px 12px", fontSize:12, borderRadius:6 };
const notice= { fontFamily:FB, fontSize:12, color:C.inkMid, background:C.accentBg, borderLeft:`3px solid ${C.accent}`, borderRadius:"0 6px 6px 0", padding:"10px 14px", marginTop:16, lineHeight:1.6 };
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
        <div style={divider}>
          <h1 style={hdg(17)}><span style={dot} />意見を送る</h1>
        </div>
        <p style={{ fontFamily:FB, fontSize:13, color:C.inkMid, marginBottom:20, lineHeight:1.7 }}>
          かなえてほしいこと、改善してほしいこと、困っていること — なんでも書いてください。
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

  const openReply = (item) => {
    setReplyingRow(item.row);
    setReplyText(item.reply || "");
    setReplyImageData(item.replyImage || null);
  };
  const closeReply = () => { setReplyingRow(null); setReplyText(""); setReplyImageData(null); };
  const saveReply  = (row) => { onSetReply(row, replyText, replyImageData); closeReply(); };
  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
                <button onClick={() => setSortOrder("desc")}
                  style={{ fontFamily:FB, fontSize:12, fontWeight:700, padding:"6px 12px", border:"none", cursor:"pointer", background: sortOrder==="desc" ? C.accent : C.paper, color: sortOrder==="desc" ? "#fff" : C.inkMid, transition:"all .15s" }}>
                  新しい順
                </button>
                <button onClick={() => setSortOrder("asc")}
                  style={{ fontFamily:FB, fontSize:12, fontWeight:700, padding:"6px 12px", border:"none", cursor:"pointer", background: sortOrder==="asc" ? C.accent : C.paper, color: sortOrder==="asc" ? "#fff" : C.inkMid, transition:"all .15s" }}>
                  古い順
                </button>
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
              管理モード ON — 各投稿の採用状態を変更できます
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
                      <div style={{ fontFamily:FB, fontSize:13, fontWeight:700 }}>{item.name}</div>
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
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                          <select
                            value={item.progress || "未着手"}
                            onChange={e => onSetProgress(item.row, e.target.value)}
                            style={{ fontFamily:FB, fontSize:12, color:C.ink, background:C.wash, border:`1px solid ${C.rule}`, borderRadius:6, padding:"4px 8px", outline:"none", cursor:"pointer" }}>
                            {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <input
                          type="range" min={0} max={100} step={1}
                          value={item.pct ?? 0}
                          onChange={e => onSetPct(item.row, Number(e.target.value))}
                          style={{ flex:1, accentColor:C.accent, cursor:"pointer", height:4 }}
                        />
                      </div>
                    ) : (
                      <div style={{ height:6, background:C.rule, borderRadius:10, overflow:"hidden" }}>
                        <div style={{ height:"100%", background:C.accent, borderRadius:10, width:`${item.pct ?? 0}%`, transition:"width 0.6s ease" }} />
                      </div>
                    )}
                  </div>

                  {/* 生徒会からの返信（一般ユーザーにも表示） */}
                  {item.reply && replyingRow !== item.row && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.rule}`, background:C.accentBg, borderRadius:8, padding:"10px 12px", marginTop:10 }}>
                      <div style={{ fontFamily:FB, fontSize:11, fontWeight:700, color:C.accent, marginBottom:6 }}>生徒会より</div>
                      <div style={{ fontFamily:FB, fontSize:13, lineHeight:1.75, color:C.ink }}>{item.reply}</div>
                      {item.replyImage && (
                        <img src={item.replyImage} alt="返信画像" style={{ marginTop:10, maxWidth:"100%", maxHeight:240, borderRadius:8, objectFit:"contain", display:"block" }} />
                      )}
                    </div>
                  )}

                  {/* 管理者：返信編集フォーム */}
                  {isAdmin && replyingRow === item.row && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.rule}`, background:C.accentBg, borderRadius:8, padding:"12px" }}>
                      <div style={{ fontFamily:FB, fontSize:12, fontWeight:700, color:C.accent, marginBottom:8 }}>生徒会からの返信を編集</div>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="返信メッセージを入力してください"
                        rows={3}
                        style={{ ...inp, resize:"none", fontSize:13, marginBottom:8, display:"block" }}
                      />
                      {/* 画像添付 */}
                      <div style={{ marginBottom:10 }}>
                        <label style={{ ...lbl, display:"block", marginBottom:4 }}>画像を添付 <span style={{ fontWeight:400, color:C.inkLight }}>（任意）</span></label>
                        <input type="file" accept="image/*" onChange={handleImagePick}
                          style={{ fontFamily:FB, fontSize:12, color:C.inkMid }} />
                        {replyImageData && (
                          <div style={{ marginTop:8 }}>
                            <img src={replyImageData} alt="プレビュー" style={{ maxWidth:"100%", maxHeight:180, borderRadius:8, objectFit:"contain", display:"block" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => saveReply(item.row)} style={{ ...btnP, ...btnSm }}>保存</button>
                        <button onClick={closeReply} style={{ ...btnO, ...btnSm }}>キャンセル</button>

                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
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
      <div style={{ fontFamily:FS, fontWeight:600, fontSize:13, color:C.accent, marginBottom:12 }}>
        {isNew ? "新しい予定を追加" : "予定を編集"}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:8, marginBottom:8 }}>
        <div>
          <label style={{ ...lbl, fontSize:10 }}>日付</label>
          <input type="date" value={form.date} onChange={e => setForm(f=>({...f, date:e.target.value}))}
            style={{ ...inp, fontSize:12, padding:"7px 10px" }} />
        </div>
        <div>
          <label style={{ ...lbl, fontSize:10 }}>タイトル</label>
          <input value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))}
            placeholder="例：生徒総会" style={{ ...inp, fontSize:12, padding:"7px 10px" }} maxLength={40} />
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={{ ...lbl, fontSize:10 }}>説明 <span style={{ textTransform:"none", fontWeight:400, color:C.inkLight }}>（任意）</span></label>
        <input value={form.desc} onChange={e => setForm(f=>({...f, desc:e.target.value}))}
          placeholder="例：放課後 第2会議室" style={{ ...inp, fontSize:12, padding:"7px 10px" }} maxLength={80} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onSave}   style={{ ...btnP, ...btnSm }}>保存</button>
        <button onClick={onCancel} style={{ ...btnO, ...btnSm }}>キャンセル</button>
      </div>
    </div>
  );
}

/* ── 予定表ページ ── */
function EventsPage({ events, isAdmin, onAddEvent, onEditEvent, onDeleteEvent }) {
  const [editingId, setEditingId] = useState(null); // idまたは"new"
  const [form, setForm]           = useState({ date:"", title:"", desc:"" });
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, title }

  const openNew    = () => { setForm({ date:"", title:"", desc:"" }); setEditingId("new"); };
  const openEdit   = (ev) => { setForm({ date:ev.date, title:ev.title, desc:ev.desc }); setEditingId(ev.id); };
  const closeForm  = () => setEditingId(null);

  const saveForm = () => {
    if (!form.date || !form.title.trim()) { alert("日付とタイトルは必須です"); return; }
    if (editingId === "new") onAddEvent(form);
    else onEditEvent(editingId, form);
    closeForm();
  };

  const askDelete  = (ev) => setDeleteConfirm({ id:ev.id, title:ev.title });
  const doDelete   = () => { onDeleteEvent(deleteConfirm.id); setDeleteConfirm(null); };

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

      {/* 年間行事予定（上） */}
      <div style={card}>
        <div style={divider}><h2 style={hdg(17)}><span style={dot} />葵中学校 年間行事予定</h2></div>
        <p style={{ fontFamily:FB, fontSize:13, color:C.inkMid, marginBottom:16, lineHeight:1.7 }}>葵中学校 年間行事予定</p>
        <a href="https://cms.oklab.ed.jp/jh/aoi/index.cfm/1,2863,c,html/2863/20260220-134641.pdf"
          target="_blank" rel="noopener noreferrer" style={btnO}>
          📄 年間行事予定を開く
        </a>
      </div>

      {/* 生徒会活動・行事予定 */}
      <div style={card}>
        <div style={{ ...divider, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <h1 style={hdg(17)}><span style={dot} />生徒会活動・行事予定</h1>
          {isAdmin && editingId !== "new" && (
            <button onClick={openNew} style={{ ...btnP, ...btnSm, gap:4 }}>＋ 追加</button>
          )}
        </div>

        {/* 新規追加フォーム（一覧の上） */}
        {editingId === "new" && (
          <EventEditForm form={form} setForm={setForm} onSave={saveForm} onCancel={closeForm} isNew={true} />
        )}

        {Object.keys(groups).sort().map(key => {
          const g = groups[key];
          return (
            <div key={key} style={{ marginBottom:24 }}>
              <div style={{ fontFamily:FS, fontSize:13, fontWeight:600, color:C.inkLight, letterSpacing:"0.08em", marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.rule}` }}>{g.label}</div>
              {g.items.map((item, i) => (
                <div key={item.id}>
                  {/* 予定行 */}
                  <div style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"13px 0", borderBottom: editingId === item.id ? "none" : (i < g.items.length-1 ? `1px solid ${C.rule}` : "none") }}>
                    <div style={{ minWidth:52, textAlign:"center", background: editingId===item.id ? C.accentBg : C.accentBg, borderRadius:6, padding:"6px 8px 5px", flexShrink:0 }}>
                      <div style={{ fontFamily:FB, fontSize:10, color:C.accent, fontWeight:700 }}>{item.dt.getMonth()+1}月</div>
                      <div style={{ fontFamily:FS, fontSize:22, fontWeight:600, color:C.accent, lineHeight:1.1 }}>{item.dt.getDate()}</div>
                      <div style={{ fontFamily:FB, fontSize:10, color:C.accent, opacity:0.7 }}>（{WD[item.dt.getDay()]}）</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:FB, fontSize:14, fontWeight:700, lineHeight:1.4 }}>{item.title}</div>
                      {item.desc && <div style={{ fontFamily:FB, fontSize:12, color:C.inkMid, marginTop:4, lineHeight:1.6 }}>{item.desc}</div>}
                      {isAdmin && editingId !== item.id && (
                        <div style={{ display:"flex", gap:8, marginTop:8 }}>
                          <button onClick={() => openEdit(item)}
                            style={{ fontFamily:FB, background:C.accentBg, border:`1px solid ${C.accent}`, color:C.accent, fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>
                            編集
                          </button>
                          <button onClick={() => askDelete(item)}
                            style={{ fontFamily:FB, background:C.dangerBg, border:`1px solid #f9a8c0`, color:C.danger, fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:700, cursor:"pointer" }}>
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* インライン編集フォーム（該当予定の直下） */}
                  {isAdmin && editingId === item.id && (
                    <div style={{ borderBottom: i < g.items.length-1 ? `1px solid ${C.rule}` : "none", paddingBottom:8 }}>
                      <EventEditForm form={form} setForm={setForm} onSave={saveForm} onCancel={closeForm} isNew={false} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {events.length === 0 && (
          <div style={{ fontFamily:FB, textAlign:"center", padding:"32px 0", color:C.inkLight, fontSize:13 }}>予定がありません</div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        msg={deleteConfirm ? `「${deleteConfirm.title}」を削除してもよいですか？この操作は取り消せません。` : null}
        onOk={doDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

/* ── 管理モーダル（アニメーション付き） ── */
function AdminModal({ isOpen, isAdmin, onClose, onLogin, onLogout, onGoOpinions }) {
  const [pw, setPw] = useState("");
  if (!isOpen) return null;

  const handleLogin = () => { onLogin(pw); setPw(""); };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(2px)", animation:"overlayIn 0.2s ease" }}>
      <div style={{ background:C.paper, borderRadius:16, padding:28, width:"100%", maxWidth:400, boxShadow:"0 24px 48px rgba(0,0,0,0.15)", animation:"modalIn 0.22s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontFamily:FS, fontWeight:600, fontSize:16 }}>管理者ログイン</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.inkLight, lineHeight:1, padding:4 }}>✕</button>
        </div>
        {!isAdmin ? (
          <>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>管理パスワード</label>
              <input style={inp} type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="パスワードを入力（デモ: 0510）" />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...btnP, ...btnSm }} onClick={handleLogin}>ログイン</button>
              <button style={{ ...btnO, ...btnSm }} onClick={onClose}>キャンセル</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily:FB, background:C.amberBg, border:`1px solid #fcd34d`, borderRadius:10, padding:"12px 16px", fontSize:13, color:C.amber, fontWeight:700, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              管理モード ON — 採用操作が有効です
              <button onClick={onLogout} style={{ fontWeight:700, textDecoration:"underline", cursor:"pointer", background:"none", border:"none", color:"inherit", fontSize:"inherit", fontFamily:FB }}>ログアウト</button>
            </div>
            <div style={{ fontFamily:FB, fontSize:12, color:C.inkMid, marginTop:14, lineHeight:1.7 }}>「みんなの声」ページで各投稿の採用状態を変更できます。</div>
            <div style={{ marginTop:14 }}>
              <button style={{ ...btnO, ...btnSm }} onClick={() => { onClose(); onGoOpinions(); }}>意見一覧を見る</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── ナビアイコン (SVG) ── */
function NavIcon({ type, active, color }) {
  const col = color || (active ? C.accent : C.inkLight);
  const bg  = active ? col + "28" : "none";
  const sz  = 24;
  const icons = {
    send: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 2 15 22 11 13 2 9 22 2" fill={bg}/>
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
    opinions: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3l2 3 2-3h9a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"
          stroke={col} strokeWidth="1.6" fill={bg}/>
        <line x1="7" y1="8" x2="17" y2="8" stroke={col} strokeWidth="1.4"/>
        <line x1="7" y1="12" x2="13" y2="12" stroke={col} strokeWidth="1.4"/>
      </svg>
    ),
    events: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill={bg}/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    admin: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={bg}/>
      </svg>
    ),
  };
  return <span style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>{icons[type]}</span>;
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

/* ── ボトムナビ ── */
function BottomNav({ page, setPage, onAdminClick, isAdmin, modalOpen }) {
  const tabs = [
    { id:"send",     icon:"send",     label:"意見を送る" },
    { id:"opinions", icon:"opinions", label:"みんなの声" },
    { id:"events",   icon:"events",   label:"予定表" },
  ];
  const btnStyle = (active) => ({
    flex:1, background:"none", border:"none", fontFamily:FB, fontSize:10,
    fontWeight: active ? 700 : 500, color: active ? C.accent : C.inkLight,
    padding:"10px 4px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
  });
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:C.paper, borderTop:`1px solid ${C.rule}`, zIndex:300, display:"flex", alignItems:"stretch" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)}
          style={{ ...btnStyle(!modalOpen && page === t.id) }}>
          <NavIcon type={t.icon} active={!modalOpen && page === t.id} />
          {t.label}
        </button>
      ))}
      <button onClick={onAdminClick} style={{ ...btnStyle(modalOpen || isAdmin), color: isAdmin ? C.amber : (modalOpen ? C.accent : C.inkLight) }}>
        <NavIcon type="admin" active={modalOpen || isAdmin} color={isAdmin ? C.amber : (modalOpen ? C.accent : C.inkLight)} />
        管理
      </button>
    </nav>
  );
}

/* ── GAS通信ヘルパー ── */
async function gasGet(action) {
  const res = await fetch(`${GAS_URL}?action=${action}`);
  return res.json();
}
async function gasPost(body) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

/* ── メインアプリ ── */
export default function App() {
  const [page, setPageRaw]        = useState("send");
  const setPage = (p) => { setPageRaw(p); window.scrollTo({ top: 0, behavior: "instant" }); };
  const [opinions, setOpinions]   = useState(USE_GAS ? [] : DEMO_OPINIONS_INIT);
  const [events, setEvents]       = useState(USE_GAS ? [] : DEMO_EVENTS_INIT);
  const [loading, setLoading]     = useState(USE_GAS);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast]         = useState("");
  const toastTimer = useRef(null);
  const isMobile = useWidth() < 720;
  let nextEvId = useRef(DEMO_EVENTS_INIT.length + 1);

  // GAS接続時：初回データ取得
  useEffect(() => {
    if (!USE_GAS) return;
    Promise.all([gasGet("getOpinions"), gasGet("getEvents")])
      .then(([ops, evs]) => {
        setOpinions(Array.isArray(ops) ? ops : []);
        setEvents(Array.isArray(evs) ? evs.sort((a,b) => a.date.localeCompare(b.date)) : []);
      })
      .catch(() => setOpinions(DEMO_OPINIONS_INIT))
      .finally(() => setLoading(false));
  }, []);

  const showToast = msg => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const handleLogin  = pw  => { if (pw === ADMIN_PW) { setIsAdmin(true); showToast("管理モードに入りました"); setModalOpen(false); } else showToast("パスワードが違います"); };
  const handleLogout = ()  => { setIsAdmin(false); showToast("ログアウトしました"); setModalOpen(false); };

  const handleSubmit = async ({ name, message }) => {
    if (USE_GAS) {
      await gasPost({ action:"addOpinion", name, message });
      const ops = await gasGet("getOpinions");
      setOpinions(Array.isArray(ops) ? ops : []);
    } else {
      const now = new Date();
      const ts  = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      setOpinions(prev => [{ row:prev.length+1, name, timestamp:ts, message, status:"未採用", progress:"未着手", pct:0, notes:"", reply:"", replyImage:null }, ...prev]);
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
    if (USE_GAS) {
      await gasPost({ action:"addEvent", date, title, desc });
      const evs = await gasGet("getEvents");
      setEvents(Array.isArray(evs) ? evs.sort((a,b) => a.date.localeCompare(b.date)) : []);
    } else {
      const id = nextEvId.current++;
      setEvents(prev => [...prev, { id, date, title, desc }].sort((a,b) => a.date.localeCompare(b.date)));
    }
    showToast("予定を追加しました");
  };
  const handleEditEvent = async (id, { date, title, desc }) => {
    if (USE_GAS) {
      await gasPost({ action:"editEvent", id, date, title, desc });
      const evs = await gasGet("getEvents");
      setEvents(Array.isArray(evs) ? evs.sort((a,b) => a.date.localeCompare(b.date)) : []);
    } else {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, date, title, desc } : e).sort((a,b) => a.date.localeCompare(b.date)));
    }
    showToast("予定を更新しました");
  };
  const handleDeleteEvent = async (id) => {
    if (USE_GAS) {
      await gasPost({ action:"deleteEvent", id });
      setEvents(prev => prev.filter(e => e.id !== id));
    } else {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
    showToast("予定を削除しました");
  };

  const tabs = [
    { id:"send",     label:"意見を送る" },
    { id:"opinions", label:"みんなの声" },
    { id:"events",   label:"予定表" },
  ];

  return (
    <div style={{ fontFamily:FB, background:C.wash, minHeight:"100vh", color:C.ink, lineHeight:1.7 }}>

      {/* ヘッダー */}
      <header style={{ background:C.paper, borderBottom:`1px solid ${C.rule}`, position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1060, margin:"auto", padding:"0 20px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div onClick={() => setPage("send")} style={{ display:"flex", alignItems:"baseline", gap:10, cursor:"pointer", flexShrink:0 }}>
            <span style={{ fontFamily:FS, fontWeight:600, fontSize:16, letterSpacing:"0.04em", color:C.ink }}>みんなの意見箱</span>
          </div>
          {!isMobile && (
            <nav style={{ display:"flex", gap:2 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setPage(t.id)}
                  style={{ fontFamily:FB, background: (!modalOpen && page===t.id) ? C.accentBg : "none", border:"none", fontSize:13, fontWeight: (!modalOpen && page===t.id) ? 700 : 500, color: (!modalOpen && page===t.id) ? C.accent : C.inkMid, padding:"6px 12px", borderRadius:8, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, transition:"background .15s" }}>
                  <NavIcon type={t.icon} active={!modalOpen && page===t.id} />
                  {t.label}
                </button>
              ))}
            </nav>
          )}
          {!isMobile && (
            <button onClick={() => setModalOpen(true)}
              style={{ fontFamily:FB, background: isAdmin ? C.amberBg : (modalOpen ? C.accentBg : "none"), border:`1px solid ${isAdmin ? C.amber : (modalOpen ? C.accent : C.rule)}`, fontSize:12, fontWeight:700, color: isAdmin ? C.amber : (modalOpen ? C.accent : C.inkMid), padding:"5px 14px", borderRadius:100, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
              <NavIcon type="admin" active={modalOpen || isAdmin} color={isAdmin ? C.amber : (modalOpen ? C.accent : C.inkMid)} />
              {isAdmin ? "管理中" : "管理者"}
            </button>
          )}
        </div>
      </header>

      {/* メイン */}
      <main style={{ maxWidth:1060, margin:"24px auto", padding: isMobile ? "0 12px" : "0 24px", paddingBottom: isMobile ? 90 : 60 }}>
        {page === "send"     && <SendPage onSubmit={handleSubmit} />}
        {page === "opinions" && <OpinionsPage opinions={opinions} isAdmin={isAdmin} onToggleAdopt={handleToggleAdopt} onSetProgress={handleSetProgress} onSetPct={handleSetPct} onSetReply={handleSetReply} />}
        {page === "events"   && <EventsPage events={events} isAdmin={isAdmin} onAddEvent={handleAddEvent} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} />}
      </main>

      {isMobile && <BottomNav page={page} setPage={setPage} onAdminClick={() => setModalOpen(true)} isAdmin={isAdmin} modalOpen={modalOpen} />}

      <AdminModal
        isOpen={modalOpen} isAdmin={isAdmin}
        onClose={() => setModalOpen(false)}
        onLogin={handleLogin} onLogout={handleLogout}
        onGoOpinions={() => setPage("opinions")}
      />
      <Toast msg={toast} />
    </div>
  );
}
