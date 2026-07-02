"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Volume2, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Dalga Animasyonu ────────────────────────────────────────────────────────
function WaveBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {[0.6, 1, 0.8, 1.2, 0.5, 1.1, 0.7, 1, 0.6, 1.3, 0.8, 0.5].map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 99,
            background: active
              ? `linear-gradient(180deg, #60a5fa, #818cf8)`
              : "rgba(148,163,184,0.4)",
            height: active ? `${h * 22}px` : "6px",
            transition: "height 0.15s ease",
            animationDelay: `${i * 0.07}s`,
            animation: active ? `waveBar 0.7s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          0%   { transform: scaleY(0.4); }
          100% { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function VoiceControl() {
  const [mode, setMode] = useState<"idle" | "wake" | "listening" | "processing" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [yanit, setYanit] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [handsFreeMod, setHandsFreeMod] = useState(false);
  const [destekli, setDestekli] = useState(true);

  const recognitionRef = useRef<any>(null);
  const handsFreRef = useRef(false);
  const router = useRouter();

  // ─── Ses sentezi ──────────────────────────────────────────────────────────
  const sesliOku = useCallback((metin: string) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(metin);
    utterance.lang = "tr-TR";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    const voices = synth.getVoices();
    const trVoice =
      voices.find((v) => v.lang === "tr-TR" && v.name.includes("Google")) ||
      voices.find((v) => v.lang.startsWith("tr"));
    if (trVoice) utterance.voice = trVoice;
    setMode("speaking");
    utterance.onend = () => {
      setMode(handsFreRef.current ? "wake" : "idle");
      // Eller serbest modda otomatik olarak tekrar dinlemeye geç
      if (handsFreRef.current) setTimeout(() => startListening(), 500);
    };
    synth.speak(utterance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Komut işleme ─────────────────────────────────────────────────────────
  const isleKomut = useCallback(
    async (komut: string) => {
      setMode("processing");
      setTranscript(komut);
      try {
        const res = await fetch("/api/ses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ komut }),
        });
        const data = await res.json();
        const cevap: string = data.yanit || "Anlayamadım.";

        if (cevap.startsWith("yönlendirme:")) {
          const yol = cevap.split(":")[1];
          sesliOku(`${yol} sayfasına gidiyorum.`);
          router.push(`/${yol}`);
        } else if (cevap === "cikis") {
          sesliOku("Çıkış yapılıyor.");
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
        } else if (cevap.startsWith("indir:")) {
          const url = cevap.split("indir:")[1];
          window.open(url, "_blank");
          sesliOku("Dosyanız indiriliyor.");
        } else {
          setYanit(cevap);
          sesliOku(cevap);
        }
      } catch {
        sesliOku("Sunucuya ulaşılamadı.");
      }
    },
    [router, sesliOku]
  );

  // ─── Ses tanıma başlat ────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setDestekli(false); return; }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const rec = new SR();
    rec.lang = "tr-TR";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      const son = e.results[e.results.length - 1];
      const text: string = son[0].transcript;
      setTranscript(text);

      if (son.isFinal) {
        if (handsFreRef.current) {
          // Wake-word modu: "altu" içeriyorsa aktif komut
          if (text.toLowerCase().includes("altu")) {
            const komut = text.toLowerCase().replace(/altu[,.]?\s*/gi, "").trim();
            if (komut.length > 2) isleKomut(komut);
            else {
              setMode("wake");
              startListening();
            }
          } else {
            setMode("wake");
            startListening();
          }
        } else {
          isleKomut(text);
        }
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech" && handsFreRef.current) {
        setMode("wake");
        startListening();
      } else {
        setMode("idle");
      }
    };

    rec.onend = () => {
      // Sadece hands-free modda otomatik yeniden başlat
      if (handsFreRef.current && mode !== "processing" && mode !== "speaking") {
        setMode("wake");
        startListening();
      }
    };

    recognitionRef.current = rec;
    rec.start();
    setMode(handsFreRef.current ? "wake" : "listening");
  }, [isleKomut, mode]);

  // ─── Durdur ───────────────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    handsFreRef.current = false;
    setHandsFreeMod(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    window.speechSynthesis.cancel();
    setMode("idle");
    setTranscript("");
    setYanit("");
  }, []);

  // ─── Eller Serbest Modu aç/kapat ─────────────────────────────────────────
  const toggleHandsFree = useCallback(() => {
    if (handsFreeMod) {
      stopAll();
    } else {
      handsFreRef.current = true;
      setHandsFreeMod(true);
      setExpanded(true);
      setYanit("");
      setTranscript("");
      startListening();
    }
  }, [handsFreeMod, stopAll, startListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      window.speechSynthesis.cancel();
    };
  }, []);

  // ─── Renk & etiket ───────────────────────────────────────────────────────
  const modeColor: Record<string, string> = {
    idle:       "#475569",
    wake:       "#6366f1",
    listening:  "#3b82f6",
    processing: "#f59e0b",
    speaking:   "#10b981",
  };
  const modeLabel: Record<string, string> = {
    idle:       "Sesli Asistan",
    wake:       "\"Altu\" deyin...",
    listening:  "Dinliyorum...",
    processing: "İşleniyor...",
    speaking:   "Konuşuyor...",
  };

  const color = modeColor[mode];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 select-none">

      {/* ── Genişletilmiş Panel ────────────────────────────────────────── */}
      {expanded && (
        <div
          className="rounded-2xl overflow-hidden shadow-2xl border flex flex-col"
          style={{
            width: 320,
            background: "linear-gradient(145deg, #0f172a, #1e293b)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          {/* Başlık */}
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {modeLabel[mode]}
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="ml-auto p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Dalga Görselleştirme */}
          <div className="flex items-center justify-center py-4">
            <WaveBars active={mode === "listening" || mode === "wake"} />
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="mx-3 mb-2 px-3 py-2 rounded-xl text-sm text-slate-300" style={{ background: "rgba(255,255,255,0.06)" }}>
              <span className="text-slate-500 text-[10px] uppercase tracking-widest block mb-0.5">Siz</span>
              {transcript}
            </div>
          )}

          {/* Yanıt */}
          {yanit && (
            <div className="mx-3 mb-3 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <span className="text-indigo-400 text-[10px] uppercase tracking-widest block mb-0.5 flex items-center gap-1"><Volume2 size={10} /> Altu</span>
              {yanit}
            </div>
          )}

          {/* Eller Serbest Toggle */}
          <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <button
              onClick={toggleHandsFree}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: handsFreeMod
                  ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                  : "rgba(255,255,255,0.07)",
                color: handsFreeMod ? "#fff" : "#94a3b8",
                boxShadow: handsFreeMod ? "0 4px 14px rgba(99,102,241,0.4)" : "none",
              }}
            >
              <Zap size={13} />
              {handsFreeMod ? "Eller Serbest Aktif" : "Eller Serbest Mod"}
            </button>

            {!handsFreeMod && (
              <button
                onClick={() => {
                  if (mode === "listening") {
                    try { recognitionRef.current?.stop(); } catch {}
                    setMode("idle");
                  } else {
                    setTranscript("");
                    setYanit("");
                    startListening();
                  }
                }}
                className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: mode === "listening" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
                  color: mode === "listening" ? "#f87171" : "#60a5fa",
                }}
              >
                {mode === "listening" ? "Durdur" : "Konuş"}
              </button>
            )}
          </div>

          {!destekli && (
            <p className="text-center text-xs text-red-400 pb-3">Tarayıcınız ses tanımayı desteklemiyor.</p>
          )}
        </div>
      )}

      {/* ── Floating Mikrofon Butonu ───────────────────────────────────── */}
      <button
        onClick={() => {
          if (!expanded) {
            setExpanded(true);
          } else if (mode === "idle") {
            setTranscript("");
            setYanit("");
            startListening();
          } else if (!handsFreeMod) {
            stopAll();
          }
        }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200"
        style={{
          background:
            mode === "idle"
              ? "linear-gradient(135deg, #1e40af, #4f46e5)"
              : mode === "listening"
              ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
              : mode === "processing"
              ? "linear-gradient(135deg, #d97706, #b45309)"
              : mode === "speaking"
              ? "linear-gradient(135deg, #059669, #047857)"
              : "linear-gradient(135deg, #6366f1, #4f46e5)",
          boxShadow: `0 8px 24px ${color}55`,
          transform: mode !== "idle" ? "scale(1.08)" : "scale(1)",
        }}
        title="Sesli Asistan"
      >
        {/* Pulse halkası */}
        {(mode === "listening" || mode === "wake") && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: color }}
          />
        )}
        {mode === "speaking" ? (
          <Volume2 size={22} className="text-white" />
        ) : mode === "idle" ? (
          <Mic size={22} className="text-white" />
        ) : (
          <Mic size={22} className="text-white" />
        )}
      </button>
    </div>
  );
}
