"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// -----------------------------
// Small server-side helpers
// -----------------------------

function normalize(value) {
  return (value ?? "").toString().trim().toLowerCase();
}

// Flattens a possibly-non-string skill/keyword entry into plain text.
// The model occasionally returns objects even for fields the prompt
// defines as flat strings, so this guards against that.
function flattenEntry(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenEntry).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return (
      value.name ||
      value.skill ||
      value.title ||
      Object.values(value).map(flattenEntry).filter(Boolean).join(" ")
    );
  }
  return String(value);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary aware match so short skills ("C", "R", "Go") don't false-
// positive against unrelated words that merely contain those letters.
function isSkillMatch(target, candidatePool) {
  const t = normalize(flattenEntry(target));
  if (!t) return false;

  const targetPattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(t)}([^a-z0-9+#.]|$)`, "i");

  return candidatePool.some((raw) => {
    const c = normalize(raw);
    if (!c) return false;
    if (c === t) return true;

    const candidatePattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(c)}([^a-z0-9+#.]|$)`, "i");
    return targetPattern.test(c) || candidatePattern.test(t);
  });
}

// Attempts a normal JSON.parse first; falls back to a best-effort repair
// pass for the most common Gemini JSON-mode failure — an unescaped
// double quote used mid-sentence inside a string value.
function tryParseJSON(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const repaired = cleaned.replace(
      /"([^"\\]*)"([^"\\]*)"([^"\\]*)"(?=\s*[,\]}])/g,
      (match, a, b, c) => `"${a}\\"${b}\\"${c}"`
    );

    try {
      return JSON.parse(repaired);
    } catch {
      throw firstError;
    }
  }
}

// -----------------------------
// Main action
// -----------------------------

export async function analyzeResumeATS(formData) {
  try {
    const resumeFile = formData.get("resume");
    const jobDescription = (formData.get("jobDescription") || "").toString().trim();
    const todayDateRaw = (formData.get("todayDate") || "").toString().trim();

    // -----------------------------
    // 1. Validate input
    // -----------------------------

    if (!resumeFile || resumeFile.size === 0) {
      return { error: "Please upload your resume PDF." };
    }

    if (resumeFile.type !== "application/pdf") {
      return { error: "Only PDF resumes are supported." };
    }

    if (!todayDateRaw) {
      return { error: "Please enter today's date." };
    }

    const todayDate = new Date(todayDateRaw);
    if (Number.isNaN(todayDate.getTime())) {
      return { error: "That date doesn't look valid. Please re-enter it." };
    }

    const todayDateFormatted = todayDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const hasJD = jobDescription.length > 0;

    // -----------------------------
    // 2. Convert PDF to base64
    // -----------------------------

    const arrayBuffer = await resumeFile.arrayBuffer();
    const base64Resume = Buffer.from(arrayBuffer).toString("base64");

    // -----------------------------
    // 3. Gemini model
    // -----------------------------

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // -----------------------------
    // 4. Prompt (branches on whether a JD was supplied)
    // -----------------------------

    const jdSection = hasJD
      ? `
JOB DESCRIPTION:
${jobDescription}

Also do the following since a job description was provided:
7. Identify required skills from the job description.
8. Identify preferred skills from the job description.
9. Identify important keywords from the job description.
10. List the job's core responsibilities.
`
      : `
No job description was provided. Leave "job.requiredSkills",
"job.preferredSkills", "job.keywords", and "job.responsibilities" as
empty arrays. Do not invent a job description or requirements. Focus
purely on evaluating the resume itself.
`;

    const prompt = `
You are an expert ATS resume analyzer and career coach.

TODAY'S DATE: ${todayDateFormatted}
Use this date as ground truth for all date reasoning. When you encounter
dates in the resume (education, experience, internships, certifications),
compare them against today's date to correctly judge whether something is
in the past, currently ongoing, or genuinely upcoming/future. Do not guess
based on any other notion of "now" — this date is authoritative.

You will receive a candidate's resume as a PDF${hasJD ? " and a job description" : ""}.

IMPORTANT RULES:

GROUNDING:
- Use ONLY information explicitly present in the resume.
- NEVER invent skills, experience, projects, companies, achievements,
  certifications, numbers, technologies, or responsibilities.
- If something is not present in the resume, treat it as missing.
- Do not assume that the candidate knows a technology just because
  it is related to another technology they know.

JSON STRING SAFETY (CRITICAL):
- Inside any JSON string value, NEVER use double quotes (") to quote
  or emphasize a word or phrase. Use single quotes (') instead, or drop
  the quotation marks entirely.
- Do not include literal newline characters inside a string value.
- Do not use unescaped backslashes inside a string value.
- Every string value must be strictly valid, parseable JSON.

ALWAYS DO:
1. Extract the candidate's actual skills.
2. Extract technologies explicitly mentioned in the resume.
3. Extract projects.
4. Extract work/internship experience, and for each entry note whether it
   is past, ongoing, or upcoming relative to today's date above.
5. Extract education.
6. Extract certifications if present.
${hasJD ? "" : "7."} Identify weaknesses in the resume.
${hasJD ? "" : "8."} Identify vague or weak bullet points.
${hasJD ? "" : "9."} Suggest concrete improvements.
${jdSection}

IMPORTANT:
Do NOT tell the candidate to falsely add a missing skill.

For example, if the job requires AWS but the resume does not mention AWS:

GOOD:
"AWS appears in the job description but is not demonstrated in the
resume. If you have AWS experience, consider adding a concrete example."

BAD:
"Add AWS to your skills section."

Do NOT invent an ATS score or a match score of any kind.
The application calculates all scoring separately and deterministically.
Do NOT include the word "score" or a numeric percentage anywhere in your
own output.

Every field under "candidate", "job", "resumeQuality", and "experience" /
"education" entries must be a plain string or array of plain strings —
not nested objects — except that each item in "experience" and
"education" may be an object with simple string fields like "title",
"company"/"institution", "dates", and "description".

Return ONLY valid JSON, matching this exact structure:

{
  "candidate": {
    "name": "",
    "skills": [],
    "technologies": [],
    "projects": [],
    "experience": [],
    "education": [],
    "certifications": []
  },

  "job": {
    "requiredSkills": [],
    "preferredSkills": [],
    "keywords": [],
    "responsibilities": []
  },

  "resumeQuality": {
    "summary": "",
    "strengths": [],
    "weaknesses": [],
    "formattingIssues": []
  },

  "recommendations": [
    {
      "issue": "",
      "whyItMatters": "",
      "suggestion": ""
    }
  ]
}
`;

    // -----------------------------
    // 5. Send PDF + prompt to Gemini
    // -----------------------------

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Resume,
        },
      },
      {
        text: prompt,
      },
    ]);

    const text = result.response.text();

    if (!text) {
      return { error: "Gemini returned an empty response." };
    }

    // -----------------------------
    // 6. Parse JSON
    // -----------------------------

    let analysis;

    try {
      analysis = tryParseJSON(text);
    } catch (error) {
      console.error("ATS JSON parse error:", text);
      return { error: "Failed to process the ATS analysis. Please try again." };
    }

    // -----------------------------
    // 7. Deterministic scoring (never trust a model-reported score)
    // -----------------------------

    const candidatePool = [
      ...(analysis.candidate?.skills || []),
      ...(analysis.candidate?.technologies || []),
    ].map(flattenEntry);

    const strengths = analysis.resumeQuality?.strengths || [];
    const weaknesses = analysis.resumeQuality?.weaknesses || [];
    const formattingIssues = analysis.resumeQuality?.formattingIssues || [];

    let atsScore;
    let scoreBreakdown;

    if (hasJD) {
      const requiredSkills = (analysis.job?.requiredSkills || []).map(flattenEntry).filter(Boolean);
      const preferredSkills = (analysis.job?.preferredSkills || []).map(flattenEntry).filter(Boolean);
      const jobKeywords = (analysis.job?.keywords || []).map(flattenEntry).filter(Boolean);

      const matchedRequired = requiredSkills.filter((s) => isSkillMatch(s, candidatePool));
      const missingRequired = requiredSkills.filter((s) => !isSkillMatch(s, candidatePool));
      const matchedPreferred = preferredSkills.filter((s) => isSkillMatch(s, candidatePool));
      const missingPreferred = preferredSkills.filter((s) => !isSkillMatch(s, candidatePool));
      const matchedKeywords = jobKeywords.filter((k) => isSkillMatch(k, candidatePool));
      const missingKeywords = jobKeywords.filter((k) => !isSkillMatch(k, candidatePool));

      // Overwrite the model's own (unverified) comparison with the
      // deterministic version computed above, so the UI and the score
      // always agree with each other.
      analysis.comparison = {
        matchedSkills: matchedRequired,
        missingRequiredSkills: missingRequired,
        missingPreferredSkills: missingPreferred,
        matchedKeywords,
        missingKeywords,
      };

      const skillScoreMax = 55;
      const preferredScoreMax = 10;
      const keywordScoreMax = 20;
      const qualityScoreMax = 15;

      const skillScore = requiredSkills.length > 0
        ? (matchedRequired.length / requiredSkills.length) * skillScoreMax
        : skillScoreMax;

      const preferredScore = preferredSkills.length > 0
        ? (matchedPreferred.length / preferredSkills.length) * preferredScoreMax
        : preferredScoreMax;

      const keywordScore = jobKeywords.length > 0
        ? (matchedKeywords.length / jobKeywords.length) * keywordScoreMax
        : keywordScoreMax;

      let qualityScore = qualityScoreMax + strengths.length - weaknesses.length * 1.5 - formattingIssues.length;
      qualityScore = Math.max(0, Math.min(qualityScoreMax, qualityScore));

      atsScore = Math.round(
        Math.max(0, Math.min(100, skillScore + preferredScore + keywordScore + qualityScore))
      );

      scoreBreakdown = {
        mode: "match",
        components: [
          { label: "Required skill match", value: Math.round(skillScore), max: skillScoreMax },
          { label: "Preferred skill match", value: Math.round(preferredScore), max: preferredScoreMax },
          { label: "Keyword match", value: Math.round(keywordScore), max: keywordScoreMax },
          { label: "Resume quality", value: Math.round(qualityScore), max: qualityScoreMax },
        ],
      };
    } else {
      analysis.comparison = {
        matchedSkills: [],
        missingRequiredSkills: [],
        missingPreferredSkills: [],
        matchedKeywords: [],
        missingKeywords: [],
      };

      // No JD to match against — score reflects resume quality alone,
      // out of 100, weighted so it can't casually land on a round number.
      let qualityScore = 72 + strengths.length * 2.5 - weaknesses.length * 4 - formattingIssues.length * 3;
      atsScore = Math.round(Math.max(0, Math.min(100, qualityScore)));

      scoreBreakdown = {
        mode: "quality",
        components: [
          { label: "Strengths found", value: strengths.length, max: null },
          { label: "Weaknesses found", value: weaknesses.length, max: null },
          { label: "Formatting issues", value: formattingIssues.length, max: null },
        ],
      };
    }

    // -----------------------------
    // 8. Return everything to UI
    // -----------------------------

    return {
      success: true,
      atsScore,
      scoreBreakdown,
      hasJD,
      analysis,
    };
  } catch (error) {
    console.error("ATS Analyzer Error:", error);
    return { error: "Failed to analyze your resume. Please try again." };
  }
}