import { db } from "@/lib/prisma";
import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export const generateIndustryInsights = inngest.createFunction(
  {
    id: "generate-industry-insights",
    name: "Generate Industry Insights",
    triggers: {
      cron: "0 0 * * 0",
    },
  },

  async ({ step }) => {
    const industries = await step.run(
      "Fetch industries",
      async () => {
        return await db.industryInsight.findMany({
          select: {
            industry: true,
          },
        });
      }
    );

    for (const { industry } of industries) {
      const prompt = `
You are an expert industry analyst and data researcher.

Analyze the current global state of the ${industry} industry.

Return ONLY valid JSON.

Use this exact schema:

{
  "salaryRanges": [
    {
      "role": "string",
      "min": number,
      "max": number,
      "median": number,
      "location": "string"
    }
  ],
  "growthRate": number,
  "demandLevel": "High",
  "topSkills": ["string"],
  "marketOutlook": "Positive",
  "keyTrends": ["string"],
  "recommendedSkills": ["string"]
}

Requirements:

- Include at least 5 salary ranges.
- Include 5–8 topSkills.
- Include 5–8 keyTrends.
- Include 5–8 recommendedSkills.
- Use realistic USD salary ranges.
- Use real job titles and locations.
- growthRate must be a number.
- Return ONLY JSON.
- No markdown.
- No explanations.
- No code fences.
`;

      const insights = await step.run(
        `Generate ${industry} insights`,
        async () => {
          const result = await model.generateContent(prompt);

          const text =
            result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
            "";

          const cleanedText = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          return JSON.parse(cleanedText);
        }
      );

      await step.run(
        `Update ${industry} insights`,
        async () => {
          await db.industryInsight.update({
            where: {
              industry,
            },
            data: {
              ...insights,

              lastUpdated: new Date(),

              nextUpdate: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ),
            },
          });
        }
      );
    }
  }
);