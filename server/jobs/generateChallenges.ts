import { getDb } from "../db/connection";
import { nexoDailyChallenges } from "../../drizzle/schema";
import { desc, sql } from "drizzle-orm";
import { ENV } from "../_core/env";

import { THEME_CATALOG } from "../game/dictionary";

const CATEGORIES = ["lugares", "casa", "espaço", "natureza", "objetos", "aventura", "cultura", "fantasia", "comidas", "filmes", "anime", "ideias", "arte"];
const THEME_WORDS = THEME_CATALOG.map(t => t.word.toLowerCase());

// Simple sleep to avoid rate limits (15 RPM free tier)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function getNextDate(dateStr: string): string {
  // Parsed as UTC noon to safely avoid local DST shifts
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getTodayUTC(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

async function fetchRandomWords(count: number): Promise<string[]> {
  try {
    const res = await fetch(`https://random-word-api.herokuapp.com/word?lang=pt-br&number=${count}`);
    if (!res.ok) throw new Error("Failed to fetch words");
    return await res.json();
  } catch (err) {
    console.error("Error fetching random words:", err);
    return [];
  }
}

async function generateChallengeForWord(word: string): Promise<any> {
  const apiKey = process.env.API_KEY_GOOGLE_IA;
  if (!apiKey) throw new Error("API_KEY_GOOGLE_IA not found in environment variables");

  const promptText = `Você é a IA por trás de um jogo de dedução semântica de palavras (estilo Contexto).
Para a palavra alvo: "${word}"

Por favor, forneça um JSON válido com a seguinte estrutura estrita:
{
  "prompt": "Uma dica poética e enigmática sobre a palavra (máximo de 1 frase).",
  "category": "Uma destas categorias: ${CATEGORIES.join(", ")}",
  "aliases": {
    "palavra_mais_proxima": 2,
    "segunda_mais_proxima": 3,
    "terceira": 5
  }
}

REGRAS DOS ALIASES:
- As palavras nos 'aliases' devem ser as que mais se aproximam pelo significado, contexto ou associação com "${word}".
- A chave é a palavra relacionada, o valor é o "rank" (a distância). O 1 sempre será a própria palavra (não inclua o rank 1, só a partir do 2).
- Atribua ranks entre 2 e 50 para as mais próximas (gere cerca de 30 palavras).
- NÃO USE markdown na resposta. Retorne APENAS o JSON puro.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textResponse) throw new Error("Invalid response format from Gemini");
  
  return JSON.parse(textResponse);
}

export async function ensureChallenges(bufferDays = 7) {
  const db = await getDb();
  if (!db) {
    console.error("Database not ready");
    return;
  }

  // Find the latest challenge date
  const latestChallenge = await db
    .select({ date: nexoDailyChallenges.date })
    .from(nexoDailyChallenges)
    .orderBy(desc(nexoDailyChallenges.date))
    .limit(1);

  let nextDate = "2026-09-01"; // Retroactive start for the month
  if (latestChallenge.length > 0 && latestChallenge[0].date >= nextDate) {
    nextDate = getNextDate(latestChallenge[0].date);
  }

  const targetDate = new Date();
  targetDate.setUTCDate(targetDate.getUTCDate() + bufferDays - 1);
  const targetDateStr = targetDate.toISOString().slice(0, 10);

  let daysToGenerate = 0;
  let cursorDate = nextDate;
  while (cursorDate <= targetDateStr) {
    daysToGenerate++;
    cursorDate = getNextDate(cursorDate);
  }

  if (daysToGenerate === 0) {
    console.log("Challenges are already populated up to the buffer window.");
    return;
  }

  console.log(`Generating ${daysToGenerate} new challenges starting from ${nextDate}...`);
  
  let words = await fetchRandomWords(daysToGenerate * 2); // Fetch extra to account for filtering
  words = words.filter(w => !THEME_WORDS.includes(w.toLowerCase())).slice(0, daysToGenerate);
  if (words.length === 0) return;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    console.log(`[${nextDate}] Generating semantic map for: ${word}`);
    try {
      const generated = await generateChallengeForWord(word);
      
      // Ensure the target word is rank 1
      generated.aliases[word] = 1;

      await db.insert(nexoDailyChallenges).values({
        date: nextDate,
        word: word.toLowerCase(),
        prompt: generated.prompt,
        category: generated.category,
        aliasesJson: JSON.stringify(generated.aliases),
      });

      console.log(`Saved ${word} for ${nextDate}.`);
      nextDate = getNextDate(nextDate);
      
      if (i < words.length - 1) {
        // Sleep to avoid rate limits (8s)
        await delay(8000);
      }
    } catch (err) {
      console.error(`Failed to generate for ${word}:`, err);
      // We break the loop and try again later if it fails
      break;
    }
  }
}

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  ensureChallenges()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
