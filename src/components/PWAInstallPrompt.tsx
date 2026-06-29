"use client";

import { useEffect, useState } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function PWAInstallPrompt() {
  const { canInstall, install, isPWA, isMobileOrTablet } = usePWA();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isPWA || dismissed || !canInstall) return;
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, [canInstall, isPWA, dismissed]);

  if (!canInstall || isPWA || dismissed || !show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        maxWidth: "90vw",
        width: 360,
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div
        className="glass-panel"
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>
            ALTU'yi Kurun
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>
            Masaüstü uygulaması gibi kullanın, çevrimdışı erişim sağlayın
          </div>
        </div>
        <button
          onClick={async () => {
            await install();
            setShow(false);
          }}
          style={{
            background: "#1e40af",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <Download size={16} /> Kur
        </button>
        <button
          onClick={() => {
            setShow(false);
            setDismissed(true);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}