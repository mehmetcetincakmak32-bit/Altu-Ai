"use client"

import { Upload, File, FileText, Image, Search, Trash2, Printer, Download } from "lucide-react"
import { useState, useEffect, useRef } from "react"

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(2) + " MB"
}

function getFileIcon(mime: string) {
  if (mime === "application/pdf") return FileText
  if (mime.startsWith("image/")) return Image
  return File
}

function getTypeBadge(mime: string) {
  if (mime === "application/pdf") return "PDF"
  if (mime.startsWith("image/")) return "Görsel"
  if (mime.includes("udf")) return "UDF"
  return "Dosya"
}

function formatDate(d: string) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("tr-TR")
}

export default function DosyaGoruntulePage() {
  const [files, setFiles] = useState<any[]>([])
  const [davalar, setDavalar] = useState<any[]>([])
  const [selectedDava, setSelectedDava] = useState("")
  const [search, setSearch] = useState("")
  const [filterMode, setFilterMode] = useState<"all" | "dava">("all")
  const [viewerFile, setViewerFile] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/dosyalar").then((r) => r.json()).then(setDavalar).catch(() => {})
  }, [])

  function loadFiles() {
    const params = new URLSearchParams()
    if (selectedDava) params.set("davaId", selectedDava)
    if (search) params.set("search", search)
    fetch(`/api/dosyalar/dosya${params.toString() ? "?" + params.toString() : ""}`)
      .then((r) => r.json())
      .then(setFiles)
      .catch(() => {})
  }

  useEffect(() => {
    loadFiles()
  }, [selectedDava, search])

  async function handleUpload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append("dosya", file)
    fd.append("davaId", selectedDava)
    try {
      await fetch("/api/dosyalar/dosya", { method: "POST", body: fd })
      loadFiles()
    } catch {}
    setUploading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu dosyayı silmek istediğinize emin misiniz?")) return
    try {
      await fetch(`/api/dosyalar/dosya?id=${id}`, { method: "DELETE" })
      loadFiles()
    } catch {}
  }

  const filtered = files.filter((f) => {
    if (filterMode === "all") return true
    return f.davaId === selectedDava || !selectedDava
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <select
          className="border rounded px-3 py-2"
          value={selectedDava}
          onChange={(e) => setSelectedDava(e.target.value)}
        >
          <option value="">Tüm Davalar</option>
          {davalar.map((d: any) => (
            <option key={d.id} value={d.id}>{d.davaNo || d.id}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="border rounded pl-8 pr-3 py-2 w-full"
            placeholder="Dosya ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="text-sm px-3 py-2 border rounded"
          onClick={() => setFilterMode(filterMode === "all" ? "dava" : "all")}
        >
          {filterMode === "all" ? "Dava Filtrele" : "Tümünü Gör"}
        </button>
      </div>

      <div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-400 transition"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-gray-400" />
        <span className="text-sm text-gray-500">Dosyaları sürükleyip bırakın veya tıklayarak seçin</span>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
        />
        {uploading && <span className="text-xs text-blue-500">Yükleniyor...</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Dosya</th>
              <th className="pb-2 font-medium">Boyut</th>
              <th className="pb-2 font-medium">Tür</th>
              <th className="pb-2 font-medium">Tarih</th>
              <th className="pb-2 font-medium">Dava</th>
              <th className="pb-2 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f: any) => {
              const Icon = getFileIcon(f.mimeType || f.mimetype || "")
              return (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">
                    <button
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                      onClick={() => setViewerFile(f)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{f.originalName || f.dosyaAdi || f.name}</span>
                    </button>
                  </td>
                  <td className="py-3">{formatSize(f.byteSize || f.size || 0)}</td>
                  <td className="py-3">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {getTypeBadge(f.mimeType || f.mimetype || "")}
                    </span>
                  </td>
                  <td className="py-3">{formatDate(f.createdAt || f.tarih)}</td>
                  <td className="py-3">{f.davaNo || f.davaId || "-"}</td>
                  <td className="py-3 flex items-center gap-2">
                    <a
                      href={`/api/dosyalar/dosya?id=${f.id}`}
                      download={f.originalName || f.dosyaAdi || f.name}
                      className="text-blue-500 hover:text-blue-750"
                      title="İndir"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      className="text-purple-500 hover:text-purple-750 cursor-pointer"
                      onClick={() => {
                        const url = `/api/dosyalar/dosya?id=${f.id}`
                        const printWindow = window.open(url, "_blank")
                        if (printWindow) {
                          printWindow.addEventListener("load", () => {
                            printWindow.print()
                          }, true)
                        }
                      }}
                      title="Yazdır"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-750 cursor-pointer"
                      onClick={() => handleDelete(f.id)}
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400">Henüz dosya yüklenmedi</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewerFile && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setViewerFile(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-semibold text-slate-800 truncate max-w-[500px]">
                {viewerFile.originalName || viewerFile.dosyaAdi || viewerFile.name}
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/dosyalar/dosya?id=${viewerFile.id}`}
                  download={viewerFile.originalName || viewerFile.dosyaAdi || viewerFile.name}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs border border-slate-300 font-semibold cursor-pointer transition-colors"
                  title="Dosyayı İndir"
                >
                  <Download className="w-3.5 h-3.5" />
                  İndir
                </a>
                <button
                  onClick={() => {
                    const url = `/api/dosyalar/dosya?id=${viewerFile.id}`
                    const printWindow = window.open(url, "_blank")
                    if (printWindow) {
                      printWindow.addEventListener("load", () => {
                        printWindow.print()
                      }, true)
                    }
                  }}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs border border-slate-300 font-semibold cursor-pointer transition-colors"
                  title="Dosyayı Yazdır"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Yazdır
                </button>
                <button
                  className="text-gray-400 hover:text-slate-700 text-xl font-bold ml-2"
                  onClick={() => setViewerFile(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="min-h-[300px] flex items-center justify-center">
              {(() => {
                const m = (viewerFile.mimeType || viewerFile.mimetype || "").toLowerCase()
                const n = (viewerFile.originalName || viewerFile.dosyaAdi || viewerFile.name || "").toLowerCase()
                if (m === "application/pdf") {
                  return (
                    <iframe
                      src={`/api/dosyalar/dosya?id=${viewerFile.id}`}
                      className="w-full h-[70vh]"
                    />
                  )
                }
                if (["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"].includes(m) ||
                    /\.(jpg|jpeg|png|gif|webp|bmp|tif|tiff)$/.test(n)) {
                  return (
                    <img
                      src={`/api/dosyalar/dosya?id=${viewerFile.id}`}
                      alt=""
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  )
                }
                if (m.includes("udf") || n.endsWith(".udf")) {
                  return <p className="text-gray-500">UDF dosyası</p>
                }
                return (
                  <a
                    href={`/api/dosyalar/dosya?id=${viewerFile.id}`}
                    download
                    className="text-blue-600 underline"
                  >
                    Dosyayı İndir
                  </a>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
