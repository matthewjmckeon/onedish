import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import OpenAI from "openai";

// Initialize GPT client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Fetch the HTML from the URL
async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (OneDish Recipe Extractor)",
    },
  });
  return await res.text();
}

// Extract JSON-LD structured recipe (schema.org)
function extractJSONLD(html: string) {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');
  let recipes: any[] = [];

  scripts.each((i, el) => {
    try {
      const json = JSON.parse($(el).text());
      if (Array.isArray(json)) {
        json.forEach((item) => {
          if (item["@type"] === "Recipe") recipes.push(item);
        });
      } else if (json["@type"] === "Recipe") {
        recipes.push(json);
      }
    } catch {
      // ignore bad JSON-LD
    }
  });

  return recipes.length > 0 ? recipes[0] : null;
}

// Normalize instructions for structured data
function normalizeInstructions(instr: any): string[] {
  if (!instr) return [];

  if (Array.isArray(instr)) {
    return instr
      .map((step) => {
        if (typeof step === "string") return step;
        if (typeof step.text === "string") return step.text;
        if (step["@type"] === "HowToStep" && typeof step.text === "string")
          return step.text;
        return null;
      })
      .filter(Boolean) as string[];
  }

  if (typeof instr === "string") return [instr];
  return [];
}

// Extract readable text for GPT fallback
function extractReadableText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url;

    if (!url) {
      return NextResponse.json(
        { error: "Missing URL" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch page HTML
    const html = await fetchHTML(url);

    // 2️⃣ Try extracting structured recipe first
    const structured = extractJSONLD(html);

    if (structured) {
      const recipe = {
        title: structured.name || "Untitled Recipe",
        sourceUrl: url,
        servings: structured.recipeYield
          ? parseInt(structured.recipeYield.toString().match(/\d+/)?.[0] || "1")
          : 1,
        ingredients: (structured.recipeIngredient || []).map((line: string) => ({
          name: line,
          amount: "",
          unit: "",
        })),
        steps: normalizeInstructions(structured.recipeInstructions),
        estimatedTimeMinutes: structured.totalTime
          ? parseInt(structured.totalTime.replace(/\D/g, "")) || 20
          : 20,
      };

      return NextResponse.json(recipe);
    }

    // 3️⃣ No structured data → fallback to GPT extraction
    const rawText = extractReadableText(html);

    const prompt = `
Extract a clean JSON recipe from the raw webpage text below.

REQUIREMENTS:
- Only return JSON, no explanations.
- JSON structure MUST be:

{
  "title": "",
  "servings": 1,
  "ingredients": [
    { "name": "", "amount": "", "unit": "" }
  ],
  "steps": [],
  "estimatedTimeMinutes": 20
}

RULES:
- Identify the real ingredient list ONLY (ignore blog text).
- Parse amount + unit when possible (e.g. "1 cup sugar").
- Steps must be simple, clean sentences in order.
- Servings must be a number.
- estimatedTimeMinutes can be your best guess.
- Ignore ads, stories, nutrition, and irrelevant text.

RAW TEXT:
${rawText}
`;

    const gptRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You extract structured recipes." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
    });

    const json = gptRes.choices[0].message?.content;
    const parsed = JSON.parse(json || "{}");
    parsed.sourceUrl = url;

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Error extracting recipe:", error);
    return NextResponse.json(
      { error: "Failed to extract recipe." },
      { status: 500 }
    );
  }
}
