import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const TCK_URL = "https://raw.githubusercontent.com/fatihdx/turk-ceza-hukuku-json/main/TCK_5237.json";
const GLOBAL_STORE_PATH = path.join(process.cwd(), "python-backend", "data", "vector_store", "global.json");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "apilex-hukuk";

function getHashEmbedding(text: string, dimensions: number = 384): number[] {
  const embedding = new Array(dimensions).fill(0.0);
  for (let i = 0; i < text.length - 2; i++) {
    const trigram = text.substring(i, i + 3);
    const md5Hex = crypto.createHash('md5').update(trigram, 'utf-8').digest('hex');
    const h = BigInt('0x' + md5Hex);
    const index = Number(h % BigInt(dimensions));
    const weight = 1.0 / (1.0 + Number(h % 5n));
    embedding[index] += weight;
  }
  
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    return embedding.map(x => x / norm);
  }
  return embedding;
}

async function getEmbedding(text: string): Promise<number[]> {
  if (!text.trim()) {
    return new Array(384).fill(0.0);
  }

  // 1. Try Ollama `/api/embed` endpoint
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, input: text }),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const resData = await res.json();
      const embeds = resData.embeddings || [];
      if (embeds && embeds.length > 0) {
        return embeds[0];
      }
    }
  } catch (e) {
    // console.log("Ollama api/embed failed, trying fallback...");
  }

  // 2. Try Ollama `/api/embeddings` fallback
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const resData = await res.json();
      const embedding = resData.embedding || [];
      if (embedding && embedding.length > 0) {
        return embedding;
      }
    }
  } catch (e) {
    // console.log("Ollama api/embeddings failed, using hash embedding...");
  }

  // 3. Fallback to hash embedding
  return getHashEmbedding(text);
}

function chunkText(text: string, chunkSize: number = 400, chunkOverlap: number = 80): string[] {
  const words = text.split(/\s+/);
  if (words.length <= chunkSize) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk);
  }
  return chunks;
}

export async function GET() {
  try {
    console.log("Fetching TCK JSON...");
    const fetchRes = await fetch(TCK_URL);
    if (!fetchRes.ok) {
      return NextResponse.json({ hata: `TCK JSON indirilemedi: ${fetchRes.statusText}` }, { status: 500 });
    }
    const tckData = await fetchRes.json();
    const maddeler = tckData.maddeler || {};
    const keys = Object.keys(maddeler);
    
    console.log(`Found ${keys.length} TCK articles. Processing...`);

    // Load existing vector store
    let documents: any[] = [];
    if (fs.existsSync(GLOBAL_STORE_PATH)) {
      try {
        const raw = fs.readFileSync(GLOBAL_STORE_PATH, "utf8");
        documents = JSON.parse(raw);
      } catch (e) {
        console.error("Error reading global.json:", e);
      }
    }

    let addedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const key of keys) {
      const madde = maddeler[key];
      const maddeNo = String(madde.madde_no);
      const baslik = madde.baslik || "";
      const tamMetin = madde.tam_metin || "";

      if (!tamMetin) continue;

      const formattedText = `Kanun: Türk Ceza Kanunu (5237) | Madde ${maddeNo} - ${baslik}: ${tamMetin}`;
      const chunks = chunkText(formattedText);

      // Check if this article already exists in documents
      const hasExisting = documents.some((doc: any) => 
        doc.metadata?.kanun_adi === "Türk Ceza Kanunu" && 
        doc.metadata?.madde_no === maddeNo
      );

      if (hasExisting) {
        // Check if any chunk is different. If any different, overwrite all of them.
        const existingChunks = documents.filter((doc: any) => 
          doc.metadata?.kanun_adi === "Türk Ceza Kanunu" && 
          doc.metadata?.madde_no === maddeNo
        );
        const needsUpdate = chunks.some(c => !existingChunks.some((ec: any) => ec.text === c));

        if (needsUpdate) {
          // Remove old chunks
          documents = documents.filter((doc: any) => 
            !(doc.metadata?.kanun_adi === "Türk Ceza Kanunu" && 
              doc.metadata?.madde_no === maddeNo)
          );
          
          for (const chunk of chunks) {
            const embedding = await getEmbedding(chunk);
            documents.push({
              text: chunk,
              metadata: {
                kaynak: "mevzuat",
                tur: "kanun",
                kanun_adi: "Türk Ceza Kanunu",
                madde_no: maddeNo,
                baslik: baslik,
                kategori: "ceza"
              },
              embedding: embedding
            });
          }
          updatedCount++;
        } else {
          skippedCount += chunks.length;
        }
      } else {
        // Brand new article
        for (const chunk of chunks) {
          const embedding = await getEmbedding(chunk);
          documents.push({
            text: chunk,
            metadata: {
              kaynak: "mevzuat",
              tur: "kanun",
              kanun_adi: "Türk Ceza Kanunu",
              madde_no: maddeNo,
              baslik: baslik,
              kategori: "ceza"
            },
            embedding: embedding
          });
          addedCount++;
        }
      }
    }

    // Save updated vector store
    fs.mkdirSync(path.dirname(GLOBAL_STORE_PATH), { recursive: true });
    fs.writeFileSync(GLOBAL_STORE_PATH, JSON.stringify(documents, null, 2), "utf8");

    return NextResponse.json({
      basarili: true,
      toplam_madde: keys.length,
      eklenen_vektor: addedCount,
      es_gecilen_vektor: skippedCount,
      guncel_toplam_vektor: documents.length
    });

  } catch (err: any) {
    return NextResponse.json({ hata: err.message }, { status: 500 });
  }
}
