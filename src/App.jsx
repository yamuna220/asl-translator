import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
//  GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════════════
const d2 = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

function angleDeg(A, B, C) {
  const ab = { x: A.x - B.x, y: A.y - B.y };
  const cb = { x: C.x - B.x, y: C.y - B.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x**2+ab.y**2) * Math.sqrt(cb.x**2+cb.y**2);
  if (!mag) return 0;
  return Math.acos(Math.min(1, Math.max(-1, dot/mag))) * (180/Math.PI);
}

// Extended: tip clearly above pip AND finger is straightened
const isExtended = (lm, tip, dip, pip, mcp) => {
  return lm[tip].y < lm[pip].y - 0.02 && angleDeg(lm[mcp], lm[pip], lm[tip]) > 145;
};

// Curled: tip is near or below pip
const isCurled = (lm, tip, pip, mcp) => {
  return lm[tip].y > lm[pip].y - 0.015;
};

// ═══════════════════════════════════════════════════════════════════
//  FULL ASL CLASSIFIER (26 letters + 7 words)
// ═══════════════════════════════════════════════════════════════════
function classify(lm) {
  if (!lm || lm.length < 21) return null;

  const W  = lm[0];
  const T1=lm[1],T2=lm[2],T3=lm[3],T4=lm[4];
  const I1=lm[5],I2=lm[6],I3=lm[7],I4=lm[8];
  const M1=lm[9],M2=lm[10],M3=lm[11],M4=lm[12];
  const R1=lm[13],R2=lm[14],R3=lm[15],R4=lm[16];
  const P1=lm[17],P2=lm[18],P3=lm[19],P4=lm[20];

  const iE = isExtended(lm,8,7,6,5);
  const mE = isExtended(lm,12,11,10,9);
  const rE = isExtended(lm,16,15,14,13);
  const pE = isExtended(lm,20,19,18,17);
  const iC = isCurled(lm,8,6,5);
  const mC = isCurled(lm,12,10,9);
  const rC = isCurled(lm,16,14,13);
  const pC = isCurled(lm,20,18,17);

  const hs = d2(W, M1) || 0.15; // hand size normalizer

  // Key distances (normalized)
  const TI = d2(T4, I4) / hs;
  const TM = d2(T4, M4) / hs;
  const TR = d2(T4, R4) / hs;
  const TP = d2(T4, P4) / hs;
  const IM = d2(I4, M4) / hs;
  const MR = d2(M4, R4) / hs;
  const RP = d2(R4, P4) / hs;
  const IP = d2(I4, P4) / hs;

  // Thumb orientation
  const thumbUp    = T4.y < T2.y - 0.04;
  const thumbOut   = T4.x < I1.x - 0.03;  // thumb away from palm (mirrored)
  const thumbOver  = T4.x > M2.x - 0.02;  // thumb folded over fingers
  const thumbUnder = T4.y > I2.y + 0.01;  // thumb below index knuckle

  const allE = iE && mE && rE && pE;
  const allC = iC && mC && rC && pC;

  // ── WORDS (check before letters — more distinctive patterns) ──

  // HELLO: all fingers extended, widely spread open palm
  if (allE && IP > 0.55 && thumbOut) return { label:"HELLO", emoji:"👋", conf:0.87 };

  // LOVE (ILY): index + pinky + thumb out, middle + ring folded
  if (iE && !mE && !rE && pE && thumbOut) return { label:"LOVE", emoji:"🤟", conf:0.88 };

  // THANK YOU: flat hand all extended, fingers together, palm up/out
  if (allE && IM < 0.13 && MR < 0.13 && !thumbOut) return { label:"THANK YOU", emoji:"🙏", conf:0.76 };

  // YES: closed fist nod
  if (allC && thumbOver && TI < 0.38 && T4.y < I2.y) return { label:"YES", emoji:"✅", conf:0.75 };

  // NO: index + middle snap (approximate: both extended, spread, others curled)
  if (iE && mE && rC && pC && TI > 0.45 && IM > 0.18) return { label:"NO", emoji:"❌", conf:0.76 };

  // GOOD: open hand forward, thumb up, all spread
  if (allE && thumbUp && IM > 0.12 && IM < 0.2) return { label:"GOOD", emoji:"👍", conf:0.73 };

  // PLEASE: flat hand on chest (fingers together, all up, no thumb side)
  if (allE && IM < 0.1 && MR < 0.1 && !thumbOut && !thumbUp) return { label:"PLEASE", emoji:"🤲", conf:0.71 };

  // ── LETTERS ──

  // A: fist, thumb rests alongside index (not over, not under)
  if (allC && !thumbOver && T4.y < I2.y && T4.x < I1.x + 0.06 && TI > 0.18)
    return { label:"A", emoji:"🅰", conf:0.82 };

  // B: all 4 fingers straight up close together, thumb folded across
  if (allE && thumbOver && IM < 0.16 && MR < 0.16)
    return { label:"B", emoji:"🅱", conf:0.83 };

  // C: curved hand — fingers bent but not fully curled, C-shape opening
  if (!iE && !mE && !rE && !pE && !iC && !mC && TI > 0.28 && TI < 0.62 && T4.y < W.y)
    return { label:"C", emoji:"🌙", conf:0.76 };

  // D: index up, middle+ring+pinky curled, thumb touches middle/ring tip
  if (iE && mC && rC && pC && TM < 0.22)
    return { label:"D", emoji:"🅳", conf:0.81 };

  // E: all 4 fingers hooked (bent at knuckle level, tips pointing down), thumb tucked
  if (!iE && !mE && !rE && !pE && iC && mC && rC && pC && TI < 0.26 && thumbUnder)
    return { label:"E", emoji:"🅴", conf:0.74 };

  // F: index+thumb pinch (touching), other 3 fingers extended up
  if (TI < 0.2 && !iE && mE && rE && pE)
    return { label:"F", emoji:"🅵", conf:0.79 };

  // G: index + thumb point sideways (hand turned, gun-like)
  if (iE && mC && rC && pC && thumbOut && Math.abs(I4.y - I1.y) < 0.09)
    return { label:"G", emoji:"🅶", conf:0.73 };

  // H: index + middle point sideways together (horizontal)
  if (iE && mE && rC && pC && IM < 0.13 && Math.abs(I4.y - I1.y) < 0.1)
    return { label:"H", emoji:"🅷", conf:0.74 };

  // I: only pinky up
  if (iC && mC && rC && pE)
    return { label:"I", emoji:"🅸", conf:0.87 };

  // J: pinky up + tip moved (approximate J: pinky extended, slightly hooked down)
  if (iC && mC && rC && pE && P4.y > P2.y + 0.01 && !thumbOut)
    return { label:"J", emoji:"🅹", conf:0.67 };

  // K: index + middle up and apart, thumb inserted between them
  if (iE && mE && rC && pC && TI < 0.38 && IM > 0.22)
    return { label:"K", emoji:"🅺", conf:0.75 };

  // L: index up + thumb pointing out sideways = L shape
  if (iE && mC && rC && pC && thumbOut && thumbUp)
    return { label:"L", emoji:"🅻", conf:0.89 };

  // M: 3 fingers (index+middle+ring) over thumb
  if (!iE && !mE && !rE && pC && T4.y > I3.y - 0.02 && TI < 0.22)
    return { label:"M", emoji:"🅼", conf:0.71 };

  // N: index + middle over thumb
  if (!iE && !mE && rC && pC && T4.y > I3.y - 0.02 && TI < 0.22 && TM < 0.22)
    return { label:"N", emoji:"🅽", conf:0.71 };

  // O: all fingers curve to meet thumb tip (small O)
  if (!iE && !mE && !rE && !pE && TI < 0.24 && TM < 0.28 && T4.y < W.y)
    return { label:"O", emoji:"⭕", conf:0.79 };

  // P: like K but hand points down
  if (iE && mE && rC && pC && I4.y > I1.y + 0.04 && TI < 0.38 && IM > 0.18)
    return { label:"P", emoji:"🅿", conf:0.70 };

  // Q: like G but pointing down
  if (iE && mC && rC && pC && I4.y > I1.y + 0.04 && thumbOut)
    return { label:"Q", emoji:"🔵", conf:0.68 };

  // R: index + middle intertwined/crossed very close
  if (iE && mE && rC && pC && IM < 0.09)
    return { label:"R", emoji:"🆁", conf:0.78 };

  // S: fist, thumb wrapped OVER curled fingers (thumb over index knuckles)
  if (allC && thumbOver && T4.y < I2.y + 0.02 && TI < 0.28)
    return { label:"S", emoji:"🆂", conf:0.77 };

  // T: fist with thumb inserted between index and middle finger
  if (allC && T4.x > I2.x - 0.03 && T4.x < M2.x + 0.03 && T4.y < I2.y + 0.01)
    return { label:"T", emoji:"🆃", conf:0.73 };

  // U: index + middle extended parallel, close, others curled
  if (iE && mE && rC && pC && IM > 0.09 && IM < 0.19)
    return { label:"U", emoji:"🆄", conf:0.79 };

  // V: index + middle spread (peace sign)
  if (iE && mE && rC && pC && IM >= 0.19 && IM < 0.34)
    return { label:"V", emoji:"✌️", conf:0.86 };

  // W: index + middle + ring up and spread
  if (iE && mE && rE && pC && IM > 0.1 && MR > 0.1)
    return { label:"W", emoji:"🆆", conf:0.83 };

  // X: index finger hooked (bent, not fully extended, not fully curled)
  if (!iE && !iC && mC && rC && pC && I4.y > I2.y - 0.03)
    return { label:"X", emoji:"❎", conf:0.70 };

  // Y: thumb out to side + pinky extended, index+middle+ring curled
  if (iC && mC && rC && pE && thumbOut)
    return { label:"Y", emoji:"🆈", conf:0.85 };

  // Z: index pointing, rest curled, similar to D but no thumb contact
  if (iE && mC && rC && pC && TM > 0.25 && !thumbOut)
    return { label:"Z", emoji:"💤", conf:0.65 };

  return null;
}

// ═══════════════════════════════════════════════════════════════════
//  SKELETON DRAWING with per-finger colors
// ═══════════════════════════════════════════════════════════════════
const BONES = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

const FC = ["#f472b6","#fb923c","#facc15","#4ade80","#60a5fa"];

function boneColor(a) {
  if (a <= 4) return FC[0];
  if (a <= 8) return FC[1];
  if (a <= 12) return FC[2];
  if (a <= 16) return FC[3];
  return FC[4];
}

function drawHand(ctx, lm, W, H) {
  BONES.forEach(([a, b]) => {
    const col = boneColor(a);
    ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lm[a].x * W, lm[a].y * H);
    ctx.lineTo(lm[b].x * W, lm[b].y * H);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
  lm.forEach((pt, i) => {
    const tip = [4,8,12,16,20].includes(i);
    const col = i<5?FC[0]:i<9?FC[1]:i<13?FC[2]:i<17?FC[3]:FC[4];
    ctx.beginPath();
    ctx.arc(pt.x*W, pt.y*H, i===0?7:tip?6:4, 0, Math.PI*2);
    if (tip) {
      ctx.fillStyle="#fff"; ctx.fill();
      ctx.strokeStyle=col; ctx.lineWidth=2; ctx.stroke();
    } else {
      ctx.fillStyle = i===0?"#fff":col; ctx.fill();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  SIGN GUIDE
// ═══════════════════════════════════════════════════════════════════
const GUIDE = [
  {s:"A",tip:"Fist — thumb rests on side of index finger"},
  {s:"B",tip:"All 4 fingers straight up, thumb folded across palm"},
  {s:"C",tip:"Curve all fingers + thumb to form a C shape"},
  {s:"D",tip:"Index up, middle+ring+pinky curl and touch thumb"},
  {s:"E",tip:"All fingers hooked/bent at knuckles, thumb tucked under"},
  {s:"F",tip:"Index+thumb pinch (touch), other 3 fingers point up"},
  {s:"G",tip:"Index + thumb point sideways (like a gun pointing right)"},
  {s:"H",tip:"Index + middle point sideways together (horizontal)"},
  {s:"I",tip:"Only pinky extended up, others curled"},
  {s:"J",tip:"Pinky up, draw a J curve downward in air"},
  {s:"K",tip:"Index + middle up and spread, thumb inserted between them"},
  {s:"L",tip:"Index points up + thumb points out sideways = L shape"},
  {s:"M",tip:"3 fingers (index+middle+ring) folded down over thumb"},
  {s:"N",tip:"2 fingers (index+middle) folded down over thumb"},
  {s:"O",tip:"All fingers curve to meet thumb tip, forming an O"},
  {s:"P",tip:"Like K but with hand pointing downward"},
  {s:"Q",tip:"Like G (gun shape) but pointing downward"},
  {s:"R",tip:"Index + middle tightly crossed/overlapping"},
  {s:"S",tip:"Fist — thumb wraps OVER the curled fingers"},
  {s:"T",tip:"Fist — thumb inserted between index and middle fingers"},
  {s:"U",tip:"Index + middle up, close and parallel together"},
  {s:"V",tip:"Index + middle up and spread apart ✌ peace sign"},
  {s:"W",tip:"Index + middle + ring all extended and spread"},
  {s:"X",tip:"Index finger hooked/bent — like a hook shape"},
  {s:"Y",tip:"Thumb out to side + pinky extended, others curled"},
  {s:"Z",tip:"Index pointing up, trace a Z shape in the air"},
  {s:"HELLO",tip:"Open palm, all fingers spread wide — wave hand 👋"},
  {s:"LOVE",tip:"Index + pinky + thumb extended = ILY hand 🤟"},
  {s:"THANK YOU",tip:"Flat hand near face, fingers together, move forward"},
  {s:"YES",tip:"Closed fist, nod it up and down like saying yes"},
  {s:"NO",tip:"Index + middle extended, then snap/close together"},
  {s:"GOOD",tip:"Open hand facing forward with thumb pointing up 👍"},
  {s:"PLEASE",tip:"Flat hand on chest, all fingers together, rub in circle"},
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef  = useRef(null);
  const rafRef    = useRef(null);

  const [status, setStatus]     = useState("idle");
  const [gesture, setGesture]   = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [handsCount, setHandsCount] = useState(0);
  const [fps, setFps]           = useState(0);
  const [tab, setTab]           = useState("transcript");
  const [filter, setFilter]     = useState("all");

  const stable   = useRef(0);
  const lastLbl  = useRef("");
  const cooldown = useRef(false);
  const fCount   = useRef(0);
  const fpsTs    = useRef(Date.now());

  const loadMP = useCallback(async () => {
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
      const hands = new window.Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
      hands.setOptions({ maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.78, minTrackingConfidence:0.65 });

      hands.onResults(res => {
        const canvas = canvasRef.current, video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;

        ctx.save(); ctx.scale(-1,1); ctx.drawImage(video,-W,0,W,H); ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(0,0,W,H);

        if (res.multiHandLandmarks?.length > 0) {
          setHandsCount(1);
          const raw = res.multiHandLandmarks[0];
          const mir = raw.map(p => ({...p, x: 1-p.x}));
          drawHand(ctx, mir, W, H);

          const g = classify(raw);
          if (g) {
            setGesture(g);
            if (g.label === lastLbl.current) {
              stable.current = Math.min(stable.current+1, 30);
            } else {
              stable.current = 1; lastLbl.current = g.label;
            }
            if (stable.current === 20 && !cooldown.current) {
              setTranscript(t => [...t, g.label]);
              cooldown.current = true;
              setTimeout(() => { cooldown.current = false; }, 1500);
            }
          } else {
            setGesture(null); stable.current = 0; lastLbl.current = "";
          }
        } else {
          setHandsCount(0); setGesture(null); stable.current = 0; lastLbl.current = "";
        }

        fCount.current++;
        const now = Date.now();
        if (now - fpsTs.current >= 1000) { setFps(fCount.current); fCount.current = 0; fpsTs.current = now; }
      });

      handsRef.current = hands;
      setStatus("active");
    } catch(e) { console.error(e); setStatus("error"); }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{width:640,height:480,frameRate:30,facingMode:"user"},audio:false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await loadMP();
    } catch { setStatus("error"); }
  }, [loadMP]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle"); setGesture(null); setHandsCount(0); setFps(0);
    stable.current = 0; lastLbl.current = "";
  }, []);

  useEffect(() => {
    if (status !== "active" || !handsRef.current) return;
    let alive = true;
    const loop = async () => {
      if (!alive) return;
      if (videoRef.current?.readyState >= 2) await handsRef.current.send({ image: videoRef.current });
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [status]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t=>t.stop()); cancelAnimationFrame(rafRef.current); }, []);

  const speak = () => {
    if (!transcript.length || speaking) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(transcript.join(" ").replace(/[^\w\s]/g,""));
    utt.rate=0.88; utt.pitch=1.05;
    utt.onstart=()=>setSpeaking(true); utt.onend=()=>setSpeaking(false);
    speechSynthesis.speak(utt);
  };

  const stablePct = Math.min(100, Math.round((stable.current/20)*100));
  const filteredGuide = GUIDE.filter(g => filter==="all" ? true : filter==="letters" ? g.s.length===1 : g.s.length>1);

  return (
    <div style={{minHeight:"100vh",background:"#07030f",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#e2d9f3",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,background:"radial-gradient(ellipse 80% 50% at 15% 15%, rgba(124,58,237,0.09) 0%,transparent 60%), radial-gradient(ellipse 60% 40% at 85% 85%, rgba(236,72,153,0.07) 0%,transparent 60%)"}} />

      {/* HEADER */}
      <header style={{position:"relative",zIndex:10,padding:"14px 24px",borderBottom:"1px solid rgba(167,139,250,0.12)",background:"rgba(7,3,15,0.88)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#6d28d9,#db2777)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 4px 24px rgba(109,40,217,0.55)"}}>🤟</div>
          <div>
            <div style={{fontSize:20,fontWeight:800,background:"linear-gradient(90deg,#a78bfa,#f472b6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>SignSpeak AI</div>
            <div style={{fontSize:10,color:"rgba(167,139,250,0.4)",letterSpacing:2}}>ALL 26 ASL LETTERS · 7 WORDS · REAL-TIME</div>
          </div>
        </div>
        {status==="active" && (
          <div style={{display:"flex",gap:16,fontSize:12,alignItems:"center"}}>
            <span style={{color:fps>20?"#4ade80":"#fb923c",display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"currentColor",display:"inline-block"}} />{fps} fps
            </span>
            <span style={{color:handsCount?"#a78bfa":"rgba(167,139,250,0.3)"}}>
              {handsCount?"✋ Hand detected":"No hand"}
            </span>
          </div>
        )}
      </header>

      <main style={{position:"relative",zIndex:1,flex:1,display:"flex",minHeight:0,overflow:"hidden"}}>

        {/* LEFT */}
        <div style={{flex:"0 0 63%",padding:18,display:"flex",flexDirection:"column",gap:12,overflow:"hidden"}}>

          {/* Video box */}
          <div style={{position:"relative",flex:1,minHeight:0,borderRadius:20,overflow:"hidden",background:"#0c0618",border:"1px solid rgba(167,139,250,0.15)",boxShadow:"0 0 60px rgba(109,40,217,0.1),inset 0 0 40px rgba(0,0,0,0.4)"}}>
            <video ref={videoRef} style={{display:"none"}} playsInline muted />
            <canvas ref={canvasRef} width={640} height={480} style={{width:"100%",height:"100%",objectFit:"cover",display:status==="active"?"block":"none",borderRadius:20}} />

            {status !== "active" && (
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:40}}>
                <div style={{position:"absolute",inset:0,opacity:0.07,backgroundImage:"linear-gradient(rgba(167,139,250,0.9) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,0.9) 1px,transparent 1px)",backgroundSize:"44px 44px"}} />
                <div style={{position:"relative",width:96,height:96,borderRadius:28,background:"linear-gradient(135deg,rgba(109,40,217,0.4),rgba(219,39,119,0.3))",border:"1px solid rgba(167,139,250,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:50,boxShadow:"0 0 50px rgba(109,40,217,0.4)"}}>🤟</div>
                <div style={{position:"relative",textAlign:"center",maxWidth:340}}>
                  <div style={{fontSize:24,fontWeight:800,marginBottom:10,background:"linear-gradient(90deg,#a78bfa,#f472b6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                    {status==="loading"?"Loading AI Model...":status==="error"?"Camera Error":"SignSpeak AI"}
                  </div>
                  <div style={{fontSize:13,color:"rgba(167,139,250,0.5)",lineHeight:1.8}}>
                    {status==="loading"?"Downloading hand detection model (~10MB)\nPlease wait, this only happens once...":
                     status==="error"?"Please allow camera access in your browser settings and refresh the page.":
                     "Recognizes all 26 ASL letters + 7 common words\nHold each sign steady for ~1 second"}
                  </div>
                </div>
                {status==="idle" && (
                  <button onClick={startCamera} style={{position:"relative",background:"linear-gradient(135deg,#6d28d9,#db2777)",border:"none",color:"#fff",borderRadius:16,padding:"15px 40px",fontSize:16,fontWeight:800,cursor:"pointer",boxShadow:"0 6px 30px rgba(109,40,217,0.6)",transition:"all 0.2s"}}
                    onMouseOver={e=>{e.currentTarget.style.transform="translateY(-3px) scale(1.03)";e.currentTarget.style.boxShadow="0 10px 40px rgba(109,40,217,0.8)";}}
                    onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 6px 30px rgba(109,40,217,0.6)";}}>
                    📷 Start Camera
                  </button>
                )}
                {status==="loading" && (
                  <div style={{position:"relative",display:"flex",gap:10}}>
                    {FC.map((c,i) => (
                      <div key={i} style={{width:11,height:11,borderRadius:"50%",background:c,animation:`bop 1.3s ease-in-out ${i*0.18}s infinite alternate`,boxShadow:`0 0 12px ${c}`}} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {status==="active" && (
              <>
                <div style={{position:"absolute",top:14,left:14,display:"flex",alignItems:"center",gap:6,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(10px)",border:"1px solid rgba(239,68,68,0.35)",borderRadius:999,padding:"5px 13px",fontSize:11,fontWeight:700,letterSpacing:1}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 8px #ef4444",animation:"liveDot 1s ease-in-out infinite alternate"}} />LIVE
                </div>
                <button onClick={stopCamera} style={{position:"absolute",top:14,right:14,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.35)",color:"#fca5a5",borderRadius:10,padding:"6px 16px",fontSize:12,cursor:"pointer",backdropFilter:"blur(10px)",transition:"all 0.2s",fontWeight:600}}
                  onMouseOver={e=>{e.currentTarget.style.background="rgba(239,68,68,0.3)";e.currentTarget.style.color="#fff";}}
                  onMouseOut={e=>{e.currentTarget.style.background="rgba(239,68,68,0.12)";e.currentTarget.style.color="#fca5a5";}}>
                  ⏹ Stop Camera
                </button>
                {!handsCount && (
                  <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:12,padding:"8px 20px",fontSize:12,color:"rgba(167,139,250,0.85)",whiteSpace:"nowrap"}}>
                    ✋ Show your hand to the camera
                  </div>
                )}
              </>
            )}
          </div>

          {/* Gesture card */}
          <div style={{flexShrink:0,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(167,139,250,0.14)",borderRadius:16,padding:18,backdropFilter:"blur(12px)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:3,color:"rgba(167,139,250,0.4)",textTransform:"uppercase"}}>Detecting Now</span>
              {gesture && <span style={{background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.28)",color:"#c4b5fd",borderRadius:999,padding:"2px 10px",fontSize:11,fontWeight:600}}>{Math.round(gesture.conf*100)}% confident</span>}
            </div>
            {gesture ? (
              <div>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                  <span style={{fontSize:44,lineHeight:1}}>{gesture.emoji}</span>
                  <span style={{fontSize:42,fontWeight:900,background:"linear-gradient(90deg,#a78bfa,#f472b6,#fb923c)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:2}}>{gesture.label}</span>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(167,139,250,0.4)",marginBottom:5}}>
                    <span>Hold steady to add to transcript</span>
                    <span style={{color:stablePct===100?"#4ade80":"rgba(167,139,250,0.6)"}}>{stablePct}%</span>
                  </div>
                  <div style={{background:"rgba(167,139,250,0.09)",borderRadius:999,height:7,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:999,width:`${stablePct}%`,background:stablePct===100?"linear-gradient(90deg,#4ade80,#22d3ee)":"linear-gradient(90deg,#7c3aed,#ec4899)",transition:"width 0.08s",boxShadow:stablePct===100?"0 0 14px #4ade80":"none"}} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{fontSize:14,color:"rgba(167,139,250,0.25)",fontStyle:"italic"}}>
                {status==="active"?"Sign something to the camera...":"Start the camera to begin"}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{flex:1,borderLeft:"1px solid rgba(167,139,250,0.1)",display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden"}}>

          {/* Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(167,139,250,0.1)",flexShrink:0}}>
            {[["transcript","📝 Transcript"],["guide","📖 Sign Guide"]].map(([t,label]) => (
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"13px 0",background:tab===t?"rgba(124,58,237,0.12)":"transparent",border:"none",borderBottom:tab===t?"2px solid #a78bfa":"2px solid transparent",color:tab===t?"#a78bfa":"rgba(167,139,250,0.3)",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1,textTransform:"uppercase",transition:"all 0.2s"}}>
                {label}
              </button>
            ))}
          </div>

          {tab==="transcript" ? (
            <>
              <div style={{padding:"11px 16px",borderBottom:"1px solid rgba(167,139,250,0.08)",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"rgba(167,139,250,0.3)",letterSpacing:1}}>{transcript.length} word{transcript.length!==1?"s":""}</span>
                {transcript.length>0 && (
                  <button onClick={()=>setTranscript(t=>t.slice(0,-1))} style={{background:"rgba(167,139,250,0.07)",border:"1px solid rgba(167,139,250,0.18)",color:"rgba(167,139,250,0.55)",borderRadius:8,padding:"4px 10px",fontSize:11,cursor:"pointer",transition:"all 0.2s"}}
                    onMouseOver={e=>e.currentTarget.style.background="rgba(167,139,250,0.18)"}
                    onMouseOut={e=>e.currentTarget.style.background="rgba(167,139,250,0.07)"}>
                    ⌫ Undo
                  </button>
                )}
              </div>

              <div style={{flex:1,padding:14,overflowY:"auto",display:"flex",flexWrap:"wrap",gap:8,alignContent:"flex-start"}}>
                {transcript.length===0 ? (
                  <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:200,gap:14,textAlign:"center"}}>
                    <div style={{fontSize:48}}>✋</div>
                    <div style={{fontSize:14,fontWeight:600,color:"rgba(167,139,250,0.28)"}}>No signs yet</div>
                    <div style={{fontSize:11,color:"rgba(167,139,250,0.18)",lineHeight:1.9,maxWidth:200}}>Hold each sign for ~1 second<br/>It will appear here automatically</div>
                  </div>
                ) : transcript.map((w,i) => {
                  const isNew = i===transcript.length-1;
                  return (
                    <span key={i} style={{background:isNew?"linear-gradient(135deg,rgba(109,40,217,0.45),rgba(219,39,119,0.35))":"rgba(167,139,250,0.06)",border:`1px solid ${isNew?"rgba(167,139,250,0.55)":"rgba(167,139,250,0.11)"}`,color:isNew?"#f0abfc":"#c4b5fd",borderRadius:10,padding:"7px 14px",fontSize:14,fontWeight:isNew?800:400,boxShadow:isNew?"0 0 22px rgba(109,40,217,0.4)":"none",animation:isNew?"popIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275)":"none",transition:"all 0.3s"}}>{w}</span>
                  );
                })}
              </div>

              {transcript.length>0 && (
                <div style={{padding:"9px 16px",borderTop:"1px solid rgba(167,139,250,0.08)",background:"rgba(109,40,217,0.04)",flexShrink:0}}>
                  <div style={{fontSize:9,letterSpacing:2,color:"rgba(167,139,250,0.28)",marginBottom:4,textTransform:"uppercase"}}>Sentence</div>
                  <div style={{fontSize:13,color:"rgba(167,139,250,0.6)",fontStyle:"italic"}}>"{transcript.join(" ").replace(/[^\w\s]/g,"")}"</div>
                </div>
              )}

              <div style={{padding:14,borderTop:"1px solid rgba(167,139,250,0.1)",display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
                <button onClick={speak} disabled={!transcript.length||speaking}
                  style={{background:speaking?"rgba(167,139,250,0.2)":"linear-gradient(135deg,#6d28d9,#db2777)",border:"none",color:"#fff",borderRadius:12,padding:"13px 0",fontSize:14,fontWeight:700,cursor:transcript.length?"pointer":"not-allowed",opacity:transcript.length?1:0.35,transition:"all 0.2s",boxShadow:transcript.length&&!speaking?"0 4px 24px rgba(109,40,217,0.5)":"none"}}
                  onMouseOver={e=>{if(transcript.length&&!speaking)e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseOut={e=>e.currentTarget.style.transform="none"}>
                  {speaking?"🔊 Speaking...":"🔊 Read Aloud"}
                </button>
                <button onClick={()=>{setTranscript([]);speechSynthesis.cancel();setSpeaking(false);}} disabled={!transcript.length}
                  style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.18)",color:transcript.length?"#fca5a5":"rgba(167,139,250,0.18)",borderRadius:12,padding:"10px 0",fontSize:12,fontWeight:600,cursor:transcript.length?"pointer":"not-allowed",transition:"all 0.2s"}}
                  onMouseOver={e=>{if(transcript.length)e.currentTarget.style.background="rgba(239,68,68,0.18)";}}
                  onMouseOut={e=>e.currentTarget.style.background="rgba(239,68,68,0.07)"}>
                  🗑 Clear All
                </button>
              </div>
            </>
          ) : (
            <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(167,139,250,0.08)",display:"flex",gap:8,flexShrink:0}}>
                {["all","letters","words"].map(f => (
                  <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?"rgba(124,58,237,0.28)":"rgba(167,139,250,0.05)",border:`1px solid ${filter===f?"rgba(167,139,250,0.45)":"rgba(167,139,250,0.1)"}`,color:filter===f?"#c4b5fd":"rgba(167,139,250,0.35)",borderRadius:8,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:700,letterSpacing:1,textTransform:"uppercase",transition:"all 0.2s"}}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:5}}>
                {filteredGuide.map(({s,tip})=>(
                  <div key={s} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"9px 12px",background:"rgba(167,139,250,0.03)",border:"1px solid rgba(167,139,250,0.09)",borderRadius:10,transition:"all 0.2s",cursor:"default"}}
                    onMouseOver={e=>e.currentTarget.style.background="rgba(167,139,250,0.09)"}
                    onMouseOut={e=>e.currentTarget.style.background="rgba(167,139,250,0.03)"}>
                    <span style={{minWidth:58,fontWeight:800,fontSize:13,color:"#f0abfc",background:"rgba(240,171,252,0.1)",border:"1px solid rgba(240,171,252,0.2)",borderRadius:7,padding:"2px 8px",textAlign:"center",flexShrink:0}}>{s}</span>
                    <span style={{fontSize:11,color:"rgba(167,139,250,0.58)",lineHeight:1.7,paddingTop:2}}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes bop { from{transform:translateY(0) scale(0.75);opacity:0.3} to{transform:translateY(-10px) scale(1);opacity:1} }
        @keyframes liveDot { from{opacity:0.3;transform:scale(0.7)} to{opacity:1;transform:scale(1.3)} }
        @keyframes popIn { 0%{transform:scale(0.6) translateY(-12px);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1) translateY(0);opacity:1} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.2);border-radius:99px}
        button{font-family:inherit}
      `}</style>
    </div>
  );
}