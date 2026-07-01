"use client";

import { useState } from "react";
import { Play, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Info, HelpCircle } from "lucide-react";

interface TestResultDetail {
  id: string;
  sentence: string;
  options: string[];
  model_answer: string;
  correct_answer: string;
  is_correct: boolean;
  law_area: string;
  difficulty: string;
}

interface BenchmarkResponse {
  success: boolean;
  total: number;
  correct: number;
  accuracy: number;
  model: string;
  results: TestResultDetail[];
  error?: string;
}

export default function AdminBenchmarkPage() {
  const [limit, setLimit] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startBenchmark = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/admin/benchmark?limit=${limit}&difficulty=${difficulty}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Sunucu test çalıştırırken hata bildirdi.");
      }
      const json: BenchmarkResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "hard":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const formatLawArea = (area: string) => {
    return area
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Hukuk AI Doğrulama ve Benchmark</h1>
          <p className="text-slate-400 text-sm mt-1">
            HukukBERT cloze veri setini kullanarak Gemini AI'nin hukuki terim bilgisini ve mantık yeteneğini sınayın.
          </p>
      </div>

      {/* Control Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Soru Sayısı</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={loading}
              className="bg-slate-950 border border-slate-850 hover:border-indigo-500/50 text-white rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[120px]"
            >
              <option value={10}>10 Soru</option>
              <option value={20}>20 Soru</option>
              <option value={50}>50 Soru</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zorluk Seviyesi</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={loading}
              className="bg-slate-950 border border-slate-850 hover:border-indigo-500/50 text-white rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[140px]"
            >
              <option value="all">Tümü (Rastgele)</option>
              <option value="easy">Kolay (Easy)</option>
              <option value="medium">Orta (Medium)</option>
              <option value="hard">Zor (Hard)</option>
            </select>
          </div>
        </div>

        <button
          onClick={startBenchmark}
          disabled={loading}
          className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none self-stretch md:self-end"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Model Test Ediliyor...</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Testi Başlat</span>
            </>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Loading state placeholders */}
      {loading && (
        <div className="p-12 border border-slate-800 bg-slate-900/20 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
            <HelpCircle size={24} className="absolute text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">Doğrulama Yapılıyor</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-sm">
              Seçilen hukuk soruları local Ollama modeline ({`apilex-hukuk`}) soruluyor ve cevaplar kaydediliyor. Lütfen bekleyin.
            </p>
          </div>
        </div>
      )}

      {/* Results Content */}
      {data && !loading && (
        <div className="space-y-8">
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Accuracy Rate */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doğruluk Oranı (Accuracy)</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-white">%{data.accuracy}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1.5">Milyonlarca hukuk terimi bağlamında başarı</p>
            </div>

            {/* Model Name */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md relative overflow-hidden">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Test Edilen Model</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-indigo-400 truncate max-w-full">{data.model}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-3.5">Yerel Ollama Çalışma Zamanı</p>
            </div>

            {/* Correct Answers */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md relative overflow-hidden">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doğru Cevaplar</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-green-400">{data.correct}</span>
                <span className="text-slate-500 text-sm font-semibold">/ {data.total} soru</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1.5">Model terimi doğru eşleştirdi</p>
            </div>

            {/* Failed Answers */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md relative overflow-hidden">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Yanlış Cevaplar</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-red-400">{data.total - data.correct}</span>
                <span className="text-slate-500 text-sm font-semibold">/ {data.total} soru</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1.5">Seçenekler dışında veya hatalı yanıt</p>
            </div>
          </div>

          {/* Detailed results list */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-white">Soru Bazlı Detaylar</h3>
            <div className="space-y-4">
              {data.results.map((res, index) => (
                <div
                  key={res.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    res.is_correct
                      ? "border-green-500/20 bg-green-500/[0.02]"
                      : "border-red-500/20 bg-red-500/[0.02]"
                  }`}
                >
                  {/* Result Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
                        Soru #{index + 1}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 border rounded-full ${getDifficultyColor(res.difficulty)}`}>
                        {res.difficulty.toUpperCase()}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {formatLawArea(res.law_area)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {res.is_correct ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                          <CheckCircle2 size={14} />
                          <span>DOĞRU</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                          <XCircle size={14} />
                          <span>YANLIŞ</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sentence */}
                  <div className="text-slate-100 font-medium leading-relaxed">
                    {/* Render sentence with styled [MASK] */}
                    {res.sentence.split("[MASK]").map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span className={`mx-1.5 px-2.5 py-0.5 rounded-lg border font-bold text-sm ${
                            res.is_correct 
                              ? "bg-green-500/20 border-green-500/30 text-green-400" 
                              : "bg-red-500/20 border-red-500/30 text-red-400 line-through"
                          }`}>
                            {res.is_correct ? res.correct_answer : (res.model_answer || "Boş")}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Options & Comparative details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800/50">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Seçenekler</p>
                      <div className="flex flex-wrap gap-2">
                        {res.options.map((opt) => (
                          <span
                            key={opt}
                            className={`text-xs px-3 py-1.5 rounded-xl font-medium border ${
                              opt === res.correct_answer
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : opt === res.model_answer && !res.is_correct
                                ? "bg-red-500/10 border-red-500/30 text-red-400"
                                : "bg-slate-900 border-slate-800 text-slate-400"
                            }`}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modelin Cevabı</p>
                        <p className={`text-sm font-semibold mt-0.5 ${res.is_correct ? "text-green-400" : "text-red-400"}`}>
                          {res.model_answer || "(Yanıt Yok)"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Doğru Cevap (Gold)</p>
                        <p className="text-sm font-semibold text-green-400 mt-0.5">{res.correct_answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
