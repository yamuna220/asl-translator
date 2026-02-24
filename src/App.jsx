import { useState, useEffect, useRef, useCallback } from "react";

// ─── Geometry helpers ──────────────────────────────────────────────────────────
const dist2D = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
const dist3D = (a, b) => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + ((a.z||0)-(b.z||0))**2);

// Is fingertip above its PIP joint? (extended)
const isUp = (lm, tip, pip) => lm[tip].y < lm[pip].y - 0.02;
// Is fingertip clearly below pip? (folded)
const isDown = (lm, tip, pip) => lm[tip].y > lm[pip].y + 0.015;

// ─── Improved gesture classifier ───────────────────────────────────────────────
function classifyGesture(lm) {
  if (!lm || lm.length < 21) return null;

  const thumbTip = lm[4], thumbIp = lm[3], thumbMcp = lm[2], thumbCmc = lm[1];
  const indexTip = lm[8], indexDip = lm[7], indexPip = lm[6], indexMcp = lm[5];
  const midTip = lm[12], midDip = lm[11], midPip = lm[10], midMcp = lm[9];
  const ringTip = lm[16], ringPip = lm[14];
  const pinkyTip = lm[20], pinkyPip = lm[18], pinkyMcp = lm[17];
  const wrist = lm[0];

  const iExt = isUp(lm, 8, 6);
  const mExt = isUp(lm, 12, 10);
  const rExt = isUp(lm, 16, 14);
  const pExt = isUp(lm, 20, 18);

  const iFold = isDown(lm, 8, 6);
  const mFold = isDown(lm, 12, 10);
  const rFold = isDown(lm, 16, 14);
  const pFold = isDown(lm, 20, 18);

  const allFolded = iFold && mFold && rFold && pFold;
  const allExtended = iExt && mExt && rExt && pExt;

  const tiDist = dist2D(thumbTip, indexTip);
  const tmDist = dist2D(thumbTip, midTip);
  const handSize = dist2D(wrist, lm[9]); // wrist to middle MCP
  const normTI = tiDist / (handSize || 0.1);

  // ── Letters ──
  // A: fist, thumb beside index
  if (allFolded && thumbTip.x > lm[5].x - 0.04 && thumbTip.y < indexDip.y)
    return { label: "A", conf: 0.80 };

  // B: all 4 fingers up, thumb folded across palm
  if (allExtended && thumbTip.x > indexMcp.x - 0.02)
    return { label: "B", conf: 0.82 };

  // C: curved, none fully extended, thumb-index gap ~medium
  if (!iExt && !mExt && normTI > 0.25 && normTI < 0.6 && thumbTip.y < wrist.y)
    return { label: "C", conf: 0.72 };

  // D: index up, others folded, thumb touches middle finger
  if (iExt && mFold && rFold && pFold && tmDist / (handSize||0.1) < 0.25)
    return { label: "D", conf: 0.78 };

  // F: thumb+index touching, other 3 up
  if (normTI < 0.18 && mExt && rExt && pExt)
    return { label: "F", conf: 0.76 };

  // I: only pinky up
  if (iFold && mFold && rFold && pExt)
    return { label: "I", conf: 0.84 };

  // K: index + middle up, spread apart, thumb between them
  if (iExt && mExt && rFold && pFold && dist2D(indexTip, midTip) / (handSize||0.1) > 0.25)
    return { label: "K", conf: 0.72 };

  // L: index up + thumb out (horizontal)
  if (iExt && mFold && rFold && pFold && thumbTip.y < thumbMcp.y && thumbTip.x < lm[5].x)
    return { label: "L", conf: 0.85 };

  // O: all fingers curved, tip close to thumb
  if (!iExt && !mExt && normTI < 0.22 && thumbTip.y < wrist.y - 0.05)
    return { label: "O", conf: 0.74 };

  // R: index + middle crossed/together
  if (iExt && mExt && rFold && pFold && dist2D(indexTip, midTip) / (handSize||0.1) < 0.15)
    return { label: "R", conf: 0.74 };

  // U: index + middle up, parallel close
  if (iExt && mExt && rFold && pFold && dist2D(indexTip, midTip)/(handSize||0.1) > 0.1 && dist2D(indexTip, midTip)/(handSize||0.1) < 0.25)
    return { label: "U", conf: 0.75 };

  // V: index + middle up, spread
  if (iExt && mExt && rFold && pFold && dist2D(indexTip, midTip)/(handSize||0.1) >= 0.25)
    return { label: "V", conf: 0.83 };

  // W: index + middle + ring up
  if (iExt && mExt && rExt && pFold)
    return { label: "W", conf: 0.80 };

  // Y: thumb + pinky out, others folded
  if (iFold && mFold && rFold && pExt && thumbTip.x < thumbMcp.x)
    return { label: "Y", conf: 0.82 };

  // ILY (LOVE): index + pinky + thumb out
  if (iExt && mFold && rFold && pExt && thumbTip.x < thumbMcp.x)
    return { label: "LOVE ❤️", conf: 0.80 };

  // HELLO: all extended, open palm
  if (allExtended && Math.abs(thumbTip.x - pinkyTip.x) > 0.15)
    return { label: "HELLO 👋", conf: 0.78 };

  // THANK YOU: flat hand, fingers together, moving from chin
  if (allExtended && Math.abs(thumbTip.x - pinkyTip.x) < 0.15)
    return { label: "THANK YOU 🙏", conf: 0.70 };

  // YES: fist bobbing — just fist
  if (allFolded && thumbTip.y > thumbMcp.y)
    return { label: "YES ✓", conf: 0.68 };

  return null;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

function drawHand(ctx, lm, W, H) {
  // Glow lines
  ctx.shadowColor = "#7c3aed";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(167,139,250,0.9)";
  ctx.lineWidth = 2.5;
  CONNECTIONS.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(lm[a].x * W, lm[a].y * H);
    ctx.lineTo(lm[b].x * W, lm[b].y * H);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
  // Dots
  lm.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x * W, pt.y * H, i === 0 ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? "#fff" : (i % 4 === 0 ? "#f0abfc" : "#a78bfa");
    ctx.fill();
  });
}

// ─── Components ────────────────────────────────────────────────────────────────
function GlowCard({ children, style }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(167,139,250,0.2)",
      borderRadius: 16,
      backdropFilter: "blur(12px)",
      ...style
    }}>{children}</div>
  );
}

function PillBadge({ label, color = "#a78bfa" }) {
  return (
    <span style={{
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color,
      borderRadius: 999,
      padding: "2px 10px",
      fontSize: 11,
      letterSpacing: 1,
      fontWeight: 600,
    }}>{label}</span>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef = useRef(null);
  const rafRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | loading | active | paused | error
  const [gesture, setGesture] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [handsCount, setHandsCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  // Debounce / stability refs
  const stableCount = useRef(0);
  const lastLabel = useRef("");
  const cooldown = useRef(false);
  const frameCount = useRef(0);
  const fpsTs = useRef(Date.now());

  // ── MediaPipe load ───────────────────────────────────────────────────────────
  const loadMediaPipe = useCallback(async () => {
    setStatus("loading");
    try {
      await new Promise((res, rej) => {
        if (window.Hands) return res();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
        s.crossOrigin = "anonymous";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });

      const hands = new window.Hands({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
      });
      hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.75, minTrackingConfidence: 0.6 });

      hands.onResults(results => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext("2d");
        const W = canvas.width, H = canvas.height;

        // Draw mirrored video
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -W, 0, W, H);
        ctx.restore();

        // Dim overlay for contrast
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(0, 0, W, H);

        if (results.multiHandLandmarks?.length > 0) {
          setHandsCount(results.multiHandLandmarks.length);
          const lm = results.multiHandLandmarks[0];
          const mirrored = lm.map(p => ({ ...p, x: 1 - p.x }));
          drawHand(ctx, mirrored, W, H);
          const g = classifyGesture(lm);

          if (g) {
            setGesture(g);
            if (g.label === lastLabel.current) {
              stableCount.current++;
            } else {
              stableCount.current = 1;
              lastLabel.current = g.label;
            }
            // Require 18 stable frames (~0.6s) and cooldown of 30 frames
            if (stableCount.current === 18 && !cooldown.current) {
              setTranscript(t => [...t, g.label]);
              cooldown.current = true;
              setTimeout(() => { cooldown.current = false; }, 1200);
            }
          } else {
            setGesture(null);
            stableCount.current = 0;
            lastLabel.current = "";
          }
        } else {
          setHandsCount(0);
          setGesture(null);
          stableCount.current = 0;
          lastLabel.current = "";
        }

        // FPS
        frameCount.current++;
        const now = Date.now();
        if (now - fpsTs.current >= 1000) {
          setFps(frameCount.current);
          frameCount.current = 0;
          fpsTs.current = now;
        }
      });

      handsRef.current = hands;
      setStatus("active");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, []);

  // ── Camera start ─────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 30, facingMode: "user" }, audio: false
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await loadMediaPipe();
    } catch {
      setStatus("error");
    }
  }, [loadMediaPipe]);

  // ── Camera stop ──────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setGesture(null);
    setHandsCount(0);
    setFps(0);
    stableCount.current = 0;
    lastLabel.current = "";
  }, []);

  // ── Detection loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "active" || !handsRef.current) return;
    let alive = true;
    const loop = async () => {
      if (!alive) return;
      if (videoRef.current?.readyState >= 2) {
        await handsRef.current.send({ image: videoRef.current });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [status]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Speech ───────────────────────────────────────────────────────────────────
  const speak = () => {
    if (!transcript.length || speaking) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(transcript.join(" ").replace(/[^\w\s]/g, ""));
    utt.rate = 0.85; utt.pitch = 1.05;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    speechSynthesis.speak(utt);
  };

  const deleteLastWord = () => setTranscript(t => t.slice(0, -1));
  const clearAll = () => { setTranscript([]); speechSynthesis.cancel(); setSpeaking(false); };

  const SIGNS = [
    { s: "A", d: "Fist, thumb beside index" },
    { s: "B", d: "All 4 fingers up, thumb in" },
    { s: "C", d: "Curved hand like letter C" },
    { s: "D", d: "Index up, thumb touches mid" },
    { s: "F", d: "Thumb+index touch, 3 up" },
    { s: "I", d: "Only pinky up" },
    { s: "L", d: "Index up + thumb out" },
    { s: "O", d: "All fingers form an O" },
    { s: "R", d: "Index+middle crossed" },
    { s: "U", d: "Index+middle up, close" },
    { s: "V", d: "Index+middle up, spread" },
    { s: "W", d: "3 fingers up" },
    { s: "Y", d: "Thumb+pinky out" },
    { s: "HELLO", d: "Open palm wave" },
    { s: "LOVE", d: "Index+pinky+thumb out (ILY)" },
    { s: "THANK YOU", d: "Flat hand, fingers together" },
    { s: "YES", d: "Closed fist" },
  ];

  const confPct = gesture ? Math.round(gesture.conf * 100) : 0;
  const stablePct = Math.min(100, Math.round((stableCount.current / 18) * 100));

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0a0f1e 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#e2d9f3",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      {/* Ambient blobs */}
      <div style={{ position:"fixed", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", top:-100, left:-100, pointerEvents:"none" }} />
      <div style={{ position:"fixed", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)", bottom:-80, right:-80, pointerEvents:"none" }} />

      {/* ── Header ── */}
      <header style={{ padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(167,139,250,0.15)", backdropFilter:"blur(10px)", background:"rgba(15,10,30,0.6)", flexShrink:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#7c3aed,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 4px 20px rgba(124,58,237,0.4)" }}>🤟</div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, background:"linear-gradient(90deg,#a78bfa,#f0abfc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              SignSpeak AI
            </div>
            <div style={{ fontSize:11, color:"rgba(167,139,250,0.5)", letterSpacing:1 }}>ASL Real-Time Translator</div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {status === "active" && (
            <div style={{ display:"flex", gap:16, fontSize:12, color:"rgba(167,139,250,0.6)", alignItems:"center" }}>
              <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background: fps > 15 ? "#34d399" : "#f59e0b", display:"inline-block", boxShadow: fps > 15 ? "0 0 6px #34d399" : "none" }} />
                {fps} FPS
              </span>
              <span style={{ color: handsCount > 0 ? "#a78bfa" : "rgba(167,139,250,0.3)" }}>
                {handsCount > 0 ? `✋ Hand detected` : "No hand"}
              </span>
            </div>
          )}
          <button onClick={() => setShowGuide(g => !g)} style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)", color:"#a78bfa", borderRadius:8, padding:"6px 14px", fontSize:12, cursor:"pointer", transition:"all 0.2s" }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(167,139,250,0.2)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(167,139,250,0.1)"}>
            {showGuide ? "✕ Close Guide" : "📖 Sign Guide"}
          </button>
        </div>
      </header>

      <main style={{ flex:1, display:"flex", gap:0, minHeight:0, overflow:"hidden" }}>

        {/* ── Left: Video ── */}
        <div style={{ flex:"0 0 62%", padding:20, display:"flex", flexDirection:"column", gap:14, overflow:"hidden" }}>

          {/* Video box */}
          <div style={{ position:"relative", borderRadius:20, overflow:"hidden", background:"#080412", border:"1px solid rgba(167,139,250,0.2)", flex:1, minHeight:0, boxShadow:"0 8px 40px rgba(0,0,0,0.5), inset 0 0 60px rgba(124,58,237,0.05)" }}>
            <video ref={videoRef} style={{ display:"none" }} playsInline muted />
            <canvas ref={canvasRef} width={640} height={480}
              style={{ width:"100%", height:"100%", objectFit:"cover", display: status==="active" ? "block" : "none", borderRadius:20 }}
            />

            {/* Idle/loading screen */}
            {status !== "active" && (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, padding:40 }}>
                {/* Grid bg */}
                <div style={{ position:"absolute", inset:0, opacity:0.15,
                  backgroundImage:"linear-gradient(rgba(167,139,250,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,0.3) 1px,transparent 1px)",
                  backgroundSize:"50px 50px"
                }} />
                <div style={{ position:"relative", width:90, height:90, borderRadius:24, background:"linear-gradient(135deg,rgba(124,58,237,0.3),rgba(236,72,153,0.2))", border:"1px solid rgba(167,139,250,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, boxShadow:"0 0 40px rgba(124,58,237,0.3)" }}>🤟</div>
                <div style={{ position:"relative", textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:700, marginBottom:8, background:"linear-gradient(90deg,#a78bfa,#f0abfc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                    {status === "loading" ? "Loading AI Model..." : status === "error" ? "Camera Error" : "SignSpeak AI"}
                  </div>
                  <div style={{ fontSize:13, color:"rgba(167,139,250,0.5)", lineHeight:1.6 }}>
                    {status === "loading" ? "Downloading MediaPipe (~10MB)..." :
                     status === "error" ? "Please allow camera access and refresh." :
                     "Real-time ASL hand gesture recognition"}
                  </div>
                </div>

                {status === "idle" && (
                  <button onClick={startCamera} style={{ position:"relative", background:"linear-gradient(135deg,#7c3aed,#ec4899)", border:"none", color:"#fff", borderRadius:14, padding:"14px 36px", fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 24px rgba(124,58,237,0.5)", transition:"all 0.2s", letterSpacing:0.5 }}
                    onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"}
                    onMouseOut={e => e.currentTarget.style.transform = "none"}>
                    📷 Start Camera
                  </button>
                )}

                {status === "loading" && (
                  <div style={{ position:"relative", display:"flex", gap:8 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:"linear-gradient(135deg,#a78bfa,#f0abfc)", animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite alternate`, boxShadow:"0 0 10px rgba(167,139,250,0.6)" }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Live badge */}
            {status === "active" && (
              <div style={{ position:"absolute", top:14, left:14, display:"flex", alignItems:"center", gap:6, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:999, padding:"5px 12px", fontSize:11, fontWeight:600, letterSpacing:1 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#ef4444", boxShadow:"0 0 8px #ef4444", animation:"pulse 1s ease-in-out infinite alternate" }} />
                LIVE
              </div>
            )}

            {/* Stop camera button */}
            {status === "active" && (
              <button onClick={stopCamera} style={{ position:"absolute", top:14, right:14, background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", color:"#fca5a5", borderRadius:10, padding:"6px 14px", fontSize:12, cursor:"pointer", backdropFilter:"blur(8px)", transition:"all 0.2s", fontWeight:600 }}
                onMouseOver={e => { e.currentTarget.style.background = "rgba(239,68,68,0.35)"; e.currentTarget.style.color = "#fff"; }}
                onMouseOut={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#fca5a5"; }}>
                ⏹ Stop Camera
              </button>
            )}

            {/* Hand tracking indicator */}
            {status === "active" && handsCount === 0 && (
              <div style={{ position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(167,139,250,0.3)", borderRadius:10, padding:"8px 18px", fontSize:12, color:"rgba(167,139,250,0.8)", whiteSpace:"nowrap" }}>
                ✋ Show your hand to the camera
              </div>
            )}
          </div>

          {/* Gesture card */}
          <GlowCard style={{ padding:20, flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:11, fontWeight:600, letterSpacing:2, color:"rgba(167,139,250,0.5)", textTransform:"uppercase" }}>Current Gesture</span>
              {gesture && <PillBadge label={`${confPct}% confidence`} color="#a78bfa" />}
            </div>

            {gesture ? (
              <div>
                <div style={{ fontSize:38, fontWeight:800, background:"linear-gradient(90deg,#a78bfa,#f0abfc,#fb7185)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:12, letterSpacing:1 }}>
                  {gesture.label}
                </div>
                {/* Stability bar (how close to committing) */}
                <div style={{ marginBottom:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(167,139,250,0.5)", marginBottom:4 }}>
                    <span>Hold to commit</span>
                    <span>{stablePct}%</span>
                  </div>
                  <div style={{ background:"rgba(167,139,250,0.1)", borderRadius:999, height:6, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:999, width:`${stablePct}%`, background: stablePct === 100 ? "linear-gradient(90deg,#34d399,#059669)" : "linear-gradient(90deg,#7c3aed,#ec4899)", transition:"width 0.1s", boxShadow: stablePct === 100 ? "0 0 10px #34d399" : "none" }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize:14, color:"rgba(167,139,250,0.3)", fontStyle:"italic" }}>
                {status === "active" ? "Show a sign to the camera..." : "Start the camera to begin"}
              </div>
            )}
          </GlowCard>
        </div>

        {/* ── Right: Transcript + Guide ── */}
        <div style={{ flex:1, borderLeft:"1px solid rgba(167,139,250,0.12)", display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>

          {showGuide ? (
            // Sign Guide Panel
            <div style={{ flex:1, overflowY:"auto", padding:18 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#a78bfa", marginBottom:14, letterSpacing:1 }}>📖 SIGN REFERENCE GUIDE</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {SIGNS.map(({ s, d }) => (
                  <div key={s} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 12px", background:"rgba(167,139,250,0.05)", borderRadius:10, border:"1px solid rgba(167,139,250,0.1)" }}>
                    <span style={{ minWidth:60, fontWeight:700, fontSize:13, color:"#f0abfc" }}>{s}</span>
                    <span style={{ fontSize:11, color:"rgba(167,139,250,0.6)" }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Transcript header */}
              <div style={{ padding:"16px 18px", borderBottom:"1px solid rgba(167,139,250,0.12)", flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, letterSpacing:2, color:"rgba(167,139,250,0.4)", textTransform:"uppercase" }}>Transcript</div>
                  <div style={{ fontSize:11, color:"rgba(167,139,250,0.3)", marginTop:2 }}>{transcript.length} words</div>
                </div>
                {transcript.length > 0 && (
                  <button onClick={deleteLastWord} style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)", color:"rgba(167,139,250,0.6)", borderRadius:8, padding:"5px 10px", fontSize:11, cursor:"pointer", transition:"all 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(167,139,250,0.18)"}
                    onMouseOut={e => e.currentTarget.style.background = "rgba(167,139,250,0.08)"}>
                    ⌫ Undo
                  </button>
                )}
              </div>

              {/* Words */}
              <div style={{ flex:1, padding:16, overflowY:"auto", display:"flex", flexWrap:"wrap", gap:8, alignContent:"flex-start" }}>
                {transcript.length === 0 ? (
                  <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, gap:14, textAlign:"center" }}>
                    <div style={{ fontSize:48 }}>✋</div>
                    <div style={{ fontSize:14, color:"rgba(167,139,250,0.35)", fontWeight:600 }}>No words yet</div>
                    <div style={{ fontSize:11, color:"rgba(167,139,250,0.25)", lineHeight:1.6, maxWidth:180 }}>Hold each sign steady for about 1 second — it will appear here automatically</div>
                  </div>
                ) : transcript.map((word, i) => {
                  const isLast = i === transcript.length - 1;
                  return (
                    <span key={i} style={{
                      background: isLast ? "linear-gradient(135deg,rgba(124,58,237,0.4),rgba(236,72,153,0.3))" : "rgba(167,139,250,0.08)",
                      border: `1px solid ${isLast ? "rgba(167,139,250,0.5)" : "rgba(167,139,250,0.15)"}`,
                      color: isLast ? "#f0abfc" : "#c4b5fd",
                      borderRadius: 10,
                      padding: "6px 14px",
                      fontSize: 13,
                      fontWeight: isLast ? 700 : 400,
                      boxShadow: isLast ? "0 0 16px rgba(124,58,237,0.3)" : "none",
                      transition: "all 0.3s",
                      animation: isLast ? "wordPop 0.35s cubic-bezier(0.175,0.885,0.32,1.275)" : "none",
                    }}>{word}</span>
                  );
                })}
              </div>

              {/* Full sentence preview */}
              {transcript.length > 0 && (
                <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(167,139,250,0.1)", background:"rgba(124,58,237,0.05)" }}>
                  <div style={{ fontSize:10, color:"rgba(167,139,250,0.35)", letterSpacing:1, marginBottom:4 }}>SENTENCE PREVIEW</div>
                  <div style={{ fontSize:13, color:"rgba(167,139,250,0.7)", fontStyle:"italic", lineHeight:1.5 }}>
                    "{transcript.join(" ").replace(/[^\w\s]/g, "")}"
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ padding:14, borderTop:"1px solid rgba(167,139,250,0.12)", display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
                <button onClick={speak} disabled={!transcript.length || speaking}
                  style={{ background: speaking ? "rgba(167,139,250,0.3)" : "linear-gradient(135deg,#7c3aed,#ec4899)", border:"none", color:"#fff", borderRadius:12, padding:"12px 0", fontSize:13, fontWeight:700, cursor: transcript.length ? "pointer" : "not-allowed", opacity: transcript.length ? 1 : 0.35, transition:"all 0.2s", boxShadow: !speaking && transcript.length ? "0 4px 20px rgba(124,58,237,0.4)" : "none", letterSpacing:0.5 }}
                  onMouseOver={e => { if(transcript.length && !speaking) e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={e => e.currentTarget.style.transform = "none"}>
                  {speaking ? "🔊 Speaking..." : "🔊 Read Aloud"}
                </button>
                <button onClick={clearAll} disabled={!transcript.length}
                  style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color: transcript.length ? "#fca5a5" : "rgba(167,139,250,0.2)", borderRadius:12, padding:"10px 0", fontSize:12, fontWeight:600, cursor: transcript.length ? "pointer" : "not-allowed", transition:"all 0.2s" }}
                  onMouseOver={e => { if(transcript.length) e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}>
                  🗑 Clear All
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <style>{`
        @keyframes bounce {
          from { transform: translateY(0) scale(0.8); opacity: 0.4; }
          to { transform: translateY(-8px) scale(1); opacity: 1; }
        }
        @keyframes pulse {
          from { opacity: 0.4; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.2); }
        }
        @keyframes wordPop {
          0% { transform: scale(0.7) translateY(-10px); opacity: 0; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.2); border-radius: 99px; }
      `}</style>
    </div>
  );
}