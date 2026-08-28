"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

/**
 * Runs a single Tavily search query and returns raw results
 * { title, url, content }[]
 */
async function tavilySearch(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed (${res.status}) for query: ${query}`);
  }

  const data = await res.json();
  return (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content?.slice(0, 500) || "",
  }));
}

export async function LearningFeed({ industry, skills, interests }) {
  if (!industry && !skills?.length && !interests?.length) {
    return { error: "Please provide at least one field." };
  }

  if (!TAVILY_API_KEY) {
    return { error: "Search is not configured (missing TAVILY_API_KEY)." };
  }

  try {
    // 1. Build a few real search queries from the user's inputs
    const topics = [industry, ...(skills || []), ...(interests || [])].filter(Boolean);

    // Cap at 3 queries to keep latency/cost reasonable
    const queries = topics.slice(0, 3).map((t) => `${t} tutorial OR article OR course 2026`);

    // 2. Run searches in parallel, collect all real results
    const searchResultsNested = await Promise.all(
      queries.map((q) =>
        tavilySearch(q).catch((err) => {
          console.error("Tavily error:", err);
          return [];
        })
      )
    );

    const allResults = searchResultsNested.flat();

    // Dedupe by URL
    const seen = new Set();
    const uniqueResults = allResults.filter((r) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    if (uniqueResults.length === 0) {
      return { error: "No content found for these inputs. Try different skills or interests." };
    }

    // 3. Ask Gemini to organize/summarize ONLY from these real results
    const resultsBlock = uniqueResults
      .map((r, i) => `[${i}] TITLE: ${r.title}\nURL: ${r.url}\nCONTENT: ${r.content}`)
      .join("\n\n");

    const prompt = `
You are given a list of REAL search results below. Your job is to select the 5 BEST results
for someone with this profile and turn them into a learning feed.

Industry: ${industry || "General"}
Skills: ${skills?.join(", ") || "None"}
Interests: ${interests?.join(", ") || "General"}

SEARCH RESULTS:
${resultsBlock}

Rules:
- You MUST only use the "url" field EXACTLY as given above. Never invent, modify, or guess a URL.
- Pick the 5 most relevant/useful results. If fewer than 5 are relevant, return fewer.
- "source" should be the site/publication name (infer from the URL or title).
- "type" should be your best guess: "Article", "Video", or "Course".
- "summary" should be 3 short bullet points based on the CONTENT field, in your own words.
- "relevance" should explain why this fits the person's profile.

Return ONLY a JSON array. No extra text, no markdown fences.

[
  {
    "title": "string",
    "type": "Article | Video | Course",
    "source": "string",
    "time": "string",
    "summary": ["point1", "point2", "point3"],
    "relevance": "string",
    "link": "https://exact-url-from-results-above.com"
  }
]
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini request timed out after 20s")), 20000)
      ),
    ]);

    const text = result.response.text();
    if (!text) {
      return { error: "No response from model." };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.error("LearningFeed JSON parse error:", parseErr, text);
      return { error: "Failed to parse learning feed." };
    }

    const rawFeed = Array.isArray(parsed) ? parsed : parsed.items || parsed.feed || [];

    // 4. SAFETY CHECK: drop any item whose link isn't one of the real URLs we fetched.
    // This is what actually guarantees no fake links reach the user.
    const validUrls = new Set(uniqueResults.map((r) => r.url));

    const feed = rawFeed
      .filter((item) => validUrls.has(item.link))
      .map((item) => ({
        title: item.title || "Untitled",
        type: item.type || "Article",
        source: item.source || "Unknown",
        time: item.time || "",
        summary: Array.isArray(item.summary)
          ? item.summary
          : [String(item.summary || "No summary available.")],
        relevance: item.relevance || "",
        link: item.link,
      }));

    if (feed.length === 0) {
      return { error: "Couldn't verify any generated links. Please try again." };
    }

    return { feed };
  } catch (err) {
    console.error("LearningFeed Error:", err);

    if (err.message?.includes("timed out")) {
      return {
        error: "Couldn't reach the AI service in time. Please try again.",
      };
    }

    return { error: "Failed to generate learning feed." };
  }
}