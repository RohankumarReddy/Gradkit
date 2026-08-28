"use client";

import React, { useRef, useState, useTransition } from "react";
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Target,
  GraduationCap,
  Briefcase,
  Award,
  AlertTriangle,
  Lightbulb,
  RotateCcw,
  CalendarDays,
  ScanLine,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { analyzeResumeATS } from "@/actions/atscheck";

// -----------------------------
// Helpers
// -----------------------------

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

const scoreTone = (score) => {
  if (score >= 75) {
    return {
      ring: "#34d399",
      text: "text-emerald-400",
      label: "Strong",
      gradient: "from-emerald-900 via-emerald-800 to-emerald-700",
    };
  }
  if (score >= 50) {
    return {
      ring: "#fbbf24",
      text: "text-amber-400",
      label: "Needs work",
      gradient: "from-amber-900 via-amber-800 to-amber-700",
    };
  }
  return {
    ring: "#f87171",
    text: "text-red-400",
    label: "Weak",
    gradient: "from-red-900 via-red-800 to-red-700",
  };
};

// Turns any value the model hands back (string, object, or anything else)
// into plain text safe to render as a React child.
function toDisplayText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const heading = value.title || value.role || value.name || value.degree || null;
    const org = value.company || value.institution || value.organization || null;
    const dates = value.dates || value.duration || value.year || null;
    const description = value.description || value.details || null;

    const headParts = [heading, org].filter(Boolean).join(" — ");
    const metaParts = [headParts, dates].filter(Boolean).join(" · ");

    if (metaParts || description) {
      return [metaParts, description].filter(Boolean).join(": ");
    }

    return Object.values(value).map(toDisplayText).filter(Boolean).join(", ");
  }

  return String(value);
}

function ScoreRing({ score }) {
  const tone = scoreTone(score);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={radius} fill="none" stroke="#2d3748" strokeWidth="12" />
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke={tone.ring}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-extrabold text-white tabular-nums">{score}</span>
        <span className="text-xs font-medium text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;

  return (
    <div className="space-y-3">
      {breakdown.components.map((c, i) => {
        const pct = c.max ? Math.min(100, (c.value / c.max) * 100) : null;
        return (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300 font-medium">{c.label}</span>
              <span className="text-gray-500 tabular-nums">
                {c.max != null ? `${c.value} / ${c.max} pts` : c.value}
              </span>
            </div>
            {pct != null && <Progress value={pct} className="h-1.5 rounded-full bg-white/10" />}
          </div>
        );
      })}
    </div>
  );
}

function SkillPillList({ items, tone = "neutral" }) {
  if (!items?.length) {
    return <p className="text-sm text-gray-500 italic">None found.</p>;
  }
  const toneClasses =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-700/50"
      : tone === "bad"
      ? "bg-red-500/10 text-red-300 border-red-700/50"
      : "bg-white/5 text-gray-200 border-gray-700";

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className={`px-3 py-1 rounded-full font-medium ${toneClasses}`}>
          {toDisplayText(item)}
        </Badge>
      ))}
    </div>
  );
}

function InfoList({ items }) {
  if (!items?.length) {
    return <p className="text-sm text-gray-500 italic">Not found in resume.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
          <span>{toDisplayText(item)}</span>
        </li>
      ))}
    </ul>
  );
}

// -----------------------------
// Main component
// -----------------------------

export default function AtsCheckView() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Only PDF resumes are supported.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please upload your resume PDF.");
      return;
    }
    if (!date) {
      setError("Please enter today's date.");
      return;
    }

    const formData = new FormData();
    formData.set("resume", file);
    formData.set("jobDescription", jobDescription);
    formData.set("todayDate", date);

    startTransition(async () => {
      const res = await analyzeResumeATS(formData);
      if (res?.error) {
        setError(res.error);
        setResult(null);
        return;
      }
      setResult(res);
    });
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setFile(null);
    setJobDescription("");
    setDate(todayISO());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // -----------------------------
  // Results view
  // -----------------------------

  if (result?.success) {
    const { atsScore, analysis, scoreBreakdown, hasJD } = result;
    const tone = scoreTone(atsScore);
    const { candidate, job, comparison, resumeQuality, recommendations } = analysis;

    return (
      <div className="space-y-8 px-4 sm:px-6 lg:px-12 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">ATS Check Results</h2>
            <p className="text-sm text-gray-400">
              {candidate?.name ? `For ${toDisplayText(candidate.name)}` : "Analysis of your uploaded resume"}
            </p>
          </div>
          <Button
            onClick={handleReset}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Check another resume
          </Button>
        </div>

        {/* Score + breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className={`bg-gradient-to-br ${tone.gradient} border-none shadow-2xl rounded-2xl lg:col-span-2`}>
            <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
              <ScoreRing score={atsScore} />
              <Badge className="bg-white/15 text-white border-none px-3 py-1">
                {hasJD ? `${tone.label} match` : `${tone.label} resume`}
              </Badge>
              {!hasJD && (
                <p className="text-xs text-white/70 text-center max-w-[220px]">
                  No job description was provided, so this reflects overall resume quality only.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 rounded-2xl lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-teal-400" />
                How this score was calculated
              </CardTitle>
              <CardDescription className="text-gray-400 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Every point below is computed in code from the extracted data — never a number the model made up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreBreakdown breakdown={scoreBreakdown} />
            </CardContent>
          </Card>
        </div>

        {/* Matched vs missing — only when a JD was given */}
        {hasJD && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900 border-gray-800 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Matched Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillPillList items={comparison?.matchedSkills} tone="good" />
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  Missing Required Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillPillList items={comparison?.missingRequiredSkills} tone="bad" />
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Missing Preferred Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillPillList items={comparison?.missingPreferredSkills} />
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-400" />
                  Missing Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillPillList items={comparison?.missingKeywords} tone="bad" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resume quality */}
        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Resume Quality
            </CardTitle>
            {resumeQuality?.summary && (
              <CardDescription className="text-gray-400">{toDisplayText(resumeQuality.summary)}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wide">Strengths</h4>
              <InfoList items={resumeQuality?.strengths} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">Weaknesses</h4>
              <InfoList items={resumeQuality?.weaknesses} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Formatting Issues</h4>
              <InfoList items={resumeQuality?.formattingIssues} />
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        {recommendations?.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-teal-400" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.map((rec, i) => (
                <div key={i} className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
                  <p className="text-sm font-bold text-white mb-1">{toDisplayText(rec.issue)}</p>
                  {rec.whyItMatters && (
                    <p className="text-xs text-gray-400 mb-2">
                      <span className="font-semibold text-gray-300">Why it matters: </span>
                      {toDisplayText(rec.whyItMatters)}
                    </p>
                  )}
                  {rec.suggestion && (
                    <p className="text-xs text-teal-300 bg-teal-500/10 border border-teal-800/40 rounded-md px-3 py-2">
                      {toDisplayText(rec.suggestion)}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Candidate profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-gray-800 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal-400" />
                Experience &amp; Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Experience</h4>
                <InfoList items={candidate?.experience} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Projects</h4>
                <InfoList items={candidate?.projects} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-purple-400" />
                Education &amp; Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Education</h4>
                <InfoList items={candidate?.education} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Award className="h-3 w-3" /> Certifications
                </h4>
                <InfoList items={candidate?.certifications} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills & technologies */}
        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-bold">Skills &amp; Technologies Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SkillPillList items={[...(candidate?.skills || []), ...(candidate?.technologies || [])]} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // -----------------------------
  // Upload / form view
  // -----------------------------

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-12 py-10 max-w-2xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-800/40 px-3 py-1 text-xs font-semibold text-teal-300 uppercase tracking-wide">
          <ScanLine className="h-3.5 w-3.5" />
          ATS Resume Check
        </div>
        <h2 className="text-4xl font-extrabold text-white tracking-tight">
          See what a real ATS sees.
        </h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Upload your resume for a quality check, or add a job description too and we'll
          score how well you match it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6  flex justify-center flex-col gap-6">
        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-bold">Resume (PDF)</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                isDragging
                  ? "border-teal-500 bg-teal-500/5"
                  : "border-gray-700 bg-gray-950/40 hover:border-gray-600"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {file ? (
                <div className="flex items-center gap-3 text-white">
                  <FileText className="h-6 w-6 text-teal-400" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-gray-500" />
                  <p className="text-sm text-gray-300 font-medium">Drag &amp; drop your resume here</p>
                  <p className="text-xs text-gray-500">or click to browse — PDF only</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-teal-400" />
              Today's date
              <span className="text-xs font-normal text-red-400">Required</span>
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">
              Used so experience and education dates get judged correctly as past, ongoing, or upcoming.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-gray-950/40 border-gray-700 text-gray-200 w-full sm:w-56"
            />
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-bold flex items-center gap-2">
              Job Description
              <span className="text-xs font-normal text-gray-500">Optional</span>
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">
              Add one to get a skill-match score against a specific role. Leave blank for a general quality check.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here (optional)..."
              className="min-h-[160px] bg-gray-950/40 border-gray-700 text-gray-200 placeholder:text-gray-600 resize-y"
            />
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-6 rounded-xl text-base"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Analyzing your resume...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Run ATS Check
            </>
          )}
        </Button>
      </form>
    </div>
  );
}