"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function LearningFeed({ industry, skills, interests }) {
  if (!industry && (!skills?.length) && (!interests?.length)) {
    return { error: "Please provide at least one field." };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json", // forces valid JSON
      },
    });

    const prompt = `
Generate a learning feed of 5 items.

Industry: ${industry || "General"}
Skills: ${skills?.join(", ") || "None"}
Interests: ${interests?.join(", ") || "General"}

Return ONLY a JSON array. No text.

Schema:
[
  {
    "title": "string",
    "type": "Article | Video | Course",
    "source": "string",
    "time": "string",
    "summary": ["point1", "point2", "point3"],
    "relevance": "string",
    "link": "https://example.com"
  }
]
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const feed = JSON.parse(text); // clean parse

    return { feed };

  } catch (err) {
    console.error("LearningFeed Error:", err);
    return { error: "Failed to generate learning feed." };
  }
}