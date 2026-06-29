"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function VoiceControl() {
  const [dinliyor, setDinliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const recognitionRef = useRef<any>(null);
  const speechRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    speechRef.current = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }, []);

  const basla = useCallback(() => {
    const SpeechRecognition = speechRef.current;
    if (!SpeechRecognition) {
      setMesaj("Tarayıcınız ses tanımayı desteklemiyor");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = true; // Sürekli dinleme aktif
    recognition.interimResults = false;

    // Sesli okuma fonksiyonu
    const sesliOku = (metin: string) => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(metin);
      utterance.lang = "tr-TR";
      
      // Daha kaliteli bir ses bulmaya çalış
      const voices = synth.getVoices();
      const trVoice = voices.find(v => v.lang === "tr-TR" && v.name.includes("Google")) || 
                      voices.find(v => v.lang === "tr-TR");
      if (trVoice) utterance.voice = trVoice;
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      synth.speak(utterance);
    };

    recognition.onresult = async (event: any) => {
      const komut = event.results[event.results.length - 1][0].transcript.toLowerCase();
      setMesaj(`"${komut}" anlaşıldı...`);

      try {
        const res = await fetch("/api/ses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ komut }),
        });
        const data = await res.json();

        if (data.yanit?.startsWith("yönlendirme:")) {
          const yol = data.yanit.split(":")[1];
          router.push(`/${yol}`);
          sesliOku(`${yol} sayfasına gidiyorum.`);
        } else if (data.yanit === "cikis") {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          sesliOku("Çıkış yapılıyor.");
        } else {
          sesliOku(data.yanit);
          setMesaj(data.yanit);
        }
      } catch {
        setMesaj("Komut işlenemedi.");
        sesliOku("Komut işlenemedi.");
      }
    };

    recognition.onerror = () => {
      setMesaj("Ses algılanamadı, tekrar deneyin");
      setDinliyor(false);
    };

    recognition.onend = () => {
      setDinliyor(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setDinliyor(true);
    setMesaj("Dinliyorum...");
  }, [router]);

  const durdur = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setDinliyor(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {mesaj && (
        <div className="bg-white border shadow-lg rounded-lg px-4 py-2 text-sm text-slate-700 max-w-xs">
          {mesaj}
        </div>
      )}
      <button
        onClick={dinliyor ? durdur : basla}
        className={`p-4 rounded-full shadow-lg transition-all ${
          dinliyor
            ? "bg-red-500 text-white animate-pulse scale-110"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        title={dinliyor ? "Durdur" : "Sesli Komut"}
      >
        {dinliyor ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
    </div>
  );
}
