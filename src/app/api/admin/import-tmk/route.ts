import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const TMK_URL = "https://raw.githubusercontent.com/anonrig/turk-medeni-kanunu-json/master/raw-law.json";
const GLOBAL_STORE_PATH = path.join(process.cwd(), "python-backend", "data", "vector_store", "global.json");

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

interface LawArticle {
  maddeNo: string;
  titles: string[];
  content: string;
}

// Recursively traverse TMK tree to extract all articles with their parent breadcrumbs/titles
function extractArticles(nodes: any[], currentTitles: string[] = []): LawArticle[] {
  let articles: LawArticle[] = [];
  for (const node of nodes) {
    const title = node.b ? node.b.trim() : "";
    const nextTitles = title ? [...currentTitles, title] : currentTitles;

    if (node.m) {
      // Leaf node representing a law article
      articles.push({
        maddeNo: String(node.m),
        titles: nextTitles,
        content: node.i ? node.i.trim() : ""
      });
    } else if (Array.isArray(node.i)) {
      // Branch node containing nested sub-elements
      articles = articles.concat(extractArticles(node.i, nextTitles));
    }
  }
  return articles;
}

export async function GET() {
  try {
    console.log("Fetching TMK JSON...");
    const fetchRes = await fetch(TMK_URL);
    if (!fetchRes.ok) {
      return NextResponse.json({ hata: `TMK JSON indirilemedi: ${fetchRes.statusText}` }, { status: 500 });
    }
    const tmdData = await fetchRes.json();
    
    console.log("Parsing TMK articles...");
    const articles = extractArticles(tmdData);
    console.log(`Found ${articles.length} TMK articles. Processing...`);

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

    for (const article of articles) {
      const { maddeNo, titles, content } = article;
      if (!content) continue;

      const pathTitle = titles.join(" > ");
      const formattedText = `Kanun: Türk Medeni Kanunu (4721) | Madde ${maddeNo} - ${pathTitle}: ${content}`;
      const chunks = chunkText(formattedText);

      // Check if this article already exists in documents
      const hasExisting = documents.some((doc: any) => 
        doc.metadata?.kanun_adi === "Türk Medeni Kanunu" && 
        doc.metadata?.madde_no === maddeNo
      );

      if (hasExisting) {
        const existingChunks = documents.filter((doc: any) => 
          doc.metadata?.kanun_adi === "Türk Medeni Kanunu" && 
          doc.metadata?.madde_no === maddeNo
        );
        const needsUpdate = chunks.some(c => !existingChunks.some((ec: any) => ec.text === c));

        if (needsUpdate) {
          // Remove old chunks
          documents = documents.filter((doc: any) => 
            !(doc.metadata?.kanun_adi === "Türk Medeni Kanunu" && 
              doc.metadata?.madde_no === maddeNo)
          );
          
          for (const chunk of chunks) {
            const embedding = await getEmbedding(chunk);
            documents.push({
              text: chunk,
              metadata: {
                kaynak: "mevzuat",
                tur: "kanun",
                kanun_adi: "Türk Medeni Kanunu",
                madde_no: maddeNo,
                baslik: titles[titles.length - 1] || "Medeni Kanun Maddesi",
                kategori: "bosanma"
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
              kanun_adi: "Türk Medeni Kanunu",
              madde_no: maddeNo,
              baslik: titles[titles.length - 1] || "Medeni Kanun Maddesi",
              kategori: "bosanma"
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
      toplam_madde: articles.length,
      eklenen_vektor: addedCount,
      es_gecilen_vektor: skippedCount,
      guncel_toplam_vektor: documents.length
    });

  } catch (err: any) {
    return NextResponse.json({ hata: err.message }, { status: 500 });
  }
}
