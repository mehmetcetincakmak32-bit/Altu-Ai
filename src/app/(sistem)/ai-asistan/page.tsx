"use client"

import { Bot, Send, User } from "lucide-react"
import { useState, useRef, useEffect } from "react"

type Message = {
  rol: "user" | "assistant"
  icerik: string
}

const SUGGESTIONS = [
  "İcra takibi nasıl yapılır?",
  "Boşanma davası dilekçesi",
  "Kira tazminatı hesaplama",
  "İşçi alacakları",
]

export default function AiAsistanPage() {
  const [mesaj, setMesaj] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { rol: "user", icerik: text }
    const guncelMesajlar = [...messages, userMsg]
    setMessages(guncelMesajlar)
    setMesaj("")
    setLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaj: text, gecmis: messages }),
      })
      const data = await res.json()
      const aiMsg: Message = { rol: "assistant", icerik: data.cevap || "..." }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      setMessages((prev) => [...prev, { rol: "assistant", icerik: "Bir hata oluştu." }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Bot className="h-6 w-6" />
        <h1 className="text-xl font-semibold">Yapay Zeka Asistanı</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-full border px-4 py-2 text-sm hover:bg-gray-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.rol === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[70%] gap-2 ${
                  msg.rol === "user"
                    ? "flex-row-reverse"
                    : "flex-row"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    msg.rol === "user" ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  {msg.rol === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div>
                  {msg.rol === "assistant" && (
                    <p className="mb-1 text-xs text-gray-500">ALTU</p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.rol === "user"
                        ? "rounded-tr-xl bg-blue-600 text-white"
                        : "rounded-tl-xl border bg-white"
                    }`}
                  >
                    {msg.icerik}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex max-w-[70%] gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                   <p className="mb-1 text-xs text-gray-500">ALTU</p>
                  <div className="rounded-tl-xl rounded-2xl border bg-white px-4 py-2">
                    ...
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(mesaj)}
            placeholder="Mesajınızı yazın..."
            className="flex-1 rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => sendMessage(mesaj)}
            disabled={loading || !mesaj.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Gönder
          </button>
        </div>
      </div>
    </div>
  )
}
