"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
  FileText,
  User,
} from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume } from "@/actions/resume";
import { EntryForm } from "./EntryForm";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";
import { marked } from "marked";

export default function ResumeBuilder({ initialContent }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent);
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");
  const previewContentHtml = marked(previewContent || "");

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {},
      summary: "",
      skills: "",
      experience: [],
      education: [],
      projects: [],
    },
  });

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  const formValues = watch();

  useEffect(() => {
    if (initialContent) setActiveTab("preview");
  }, [initialContent]);

  useEffect(() => {
    if (activeTab === "edit") {
      const newContent = getCombinedContent();
      setPreviewContent(newContent ? newContent : initialContent);
    }
  }, [formValues, activeTab]);

  useEffect(() => {
    if (saveResult && !isSaving) {
      toast.success("Resume saved successfully!");
    }
    if (saveError) {
      toast.error(saveError.message || "Failed to save resume");
    }
  }, [saveResult, saveError, isSaving]);

  const getContactMarkdown = () => {
    const { contactInfo } = formValues;
    const parts = [];
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo.mobile) parts.push(`📱 ${contactInfo.mobile}`);
    if (contactInfo.linkedin) parts.push(`💼 [LinkedIn](${contactInfo.linkedin})`);
    if (contactInfo.twitter) parts.push(`🐦 [Twitter](${contactInfo.twitter})`);

    return parts.length > 0
      ? `## <div align="center">${user?.fullName || "Your Name"}</div>\n\n<div align="center">\n\n${parts.join(" | ")}\n\n</div>`
      : "";
  };

  const getCombinedContent = () => {
    const { summary, skills, experience, education, projects } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js/dist/html2pdf.min.js")).default;
      const element = document.getElementById("resume-pdf");

      const opt = {
        margin: [15, 15],
        filename: "resume.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      await saveResumeFn(previewContent);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div data-color-mode="light" className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/40 p-6 rounded-2xl border border-gray-800">
        <div>
          <h1 className="font-extrabold tracking-tight  text-4xl md:text-5xl bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            Resume Builder
          </h1>
          <p className="text-gray-400 mt-2 text-sm max-w-sm">
            Craft a professional layout. <span className="text-red-400/80 italic font-medium">Note: Use this as a foundation, not your final master copy.</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isGenerating && (
            <span className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full animate-pulse border border-red-400/20">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating PDF
            </span>
          )}
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 shadow-lg shadow-blue-900/20"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Progress
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-900 border border-gray-800 p-1 rounded-xl">
          <TabsTrigger value="edit" className="rounded-lg px-8 data-[state=active]:bg-gray-800 data-[state=active]:text-blue-400">
            <FileText className="h-4 w-4 mr-2" /> Form
          </TabsTrigger>
          <TabsTrigger value="preview" className="rounded-lg px-8 data-[state=active]:bg-gray-800 data-[state=active]:text-blue-400">
            <Monitor className="h-4 w-4 mr-2" /> Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-6 animate-in fade-in-50 duration-500">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* Section: Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-800 pb-2">
                <div className="bg-blue-500/10 p-2 rounded-lg"><User className="h-5 w-5 text-blue-400" /></div>
                <h3 className="text-xl font-bold text-white">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-gray-800 rounded-2xl bg-gray-900/20">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Email Address</label>
                  <Input
                    {...register("contactInfo.email")}
                    type="email"
                    placeholder="name@example.com"
                    className="bg-gray-800/50 border-gray-700 focus:border-blue-500 transition-all"
                  />
                  {errors.contactInfo?.email && <p className="text-xs text-red-400 font-medium">{errors.contactInfo.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Mobile Number</label>
                  <Input
                    {...register("contactInfo.mobile")}
                    type="tel"
                    placeholder="+1 234 567 8900"
                    className="bg-gray-800/50 border-gray-700 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">LinkedIn Profile</label>
                  <Input
                    {...register("contactInfo.linkedin")}
                    type="url"
                    placeholder="linkedin.com/in/username"
                    className="bg-gray-800/50 border-gray-700 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Twitter/X Profile</label>
                  <Input
                    {...register("contactInfo.twitter")}
                    type="url"
                    placeholder="twitter.com/username"
                    className="bg-gray-800/50 border-gray-700 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section: Summary */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm">2</span>
                Professional Summary
              </h3>
              <Controller
                name="summary"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="min-h-[140px] bg-gray-800/30 border-gray-700 focus:border-blue-500 leading-relaxed"
                    placeholder="Highlight your top achievements and career trajectory..."
                  />
                )}
              />
              {errors.summary && <p className="text-sm text-red-400">{errors.summary.message}</p>}
            </div>

            {/* Section: Skills */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm">3</span>
                Core Skills
              </h3>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="min-h-[120px] bg-gray-800/30 border-gray-700 focus:border-blue-500"
                    placeholder="e.g. JavaScript, React, System Design, Project Management..."
                  />
                )}
              />
            </div>

            {/* Dynamic Sections */}
            <div className="grid grid-cols-1 gap-12 pt-4">
              <section className="space-y-6">
                <h3 className="text-xl font-bold text-white border-l-4 border-blue-500 pl-4">Work Experience</h3>
                <Controller
                  name="experience"
                  control={control}
                  render={({ field }) => (
                    <EntryForm type="Experience" entries={field.value} onChange={field.onChange} />
                  )}
                />
              </section>

              <section className="space-y-6">
                <h3 className="text-xl font-bold text-white border-l-4 border-blue-500 pl-4">Education</h3>
                <Controller
                  name="education"
                  control={control}
                  render={({ field }) => (
                    <EntryForm type="Education" entries={field.value} onChange={field.onChange} />
                  )}
                />
              </section>

              <section className="space-y-6">
                <h3 className="text-xl font-bold text-white border-l-4 border-blue-500 pl-4">Projects</h3>
                <Controller
                  name="projects"
                  control={control}
                  render={({ field }) => (
                    <EntryForm type="Project" entries={field.value} onChange={field.onChange} />
                  )}
                />
              </section>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
            <div className="flex bg-gray-800 p-1 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-md px-4 ${resumeMode === "preview" ? "bg-gray-700 text-blue-400 shadow-sm" : "text-gray-400"}`}
                onClick={() => setResumeMode("preview")}
              >
                <Monitor className="h-4 w-4 mr-2" /> Live View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-md px-4 ${resumeMode === "edit" ? "bg-gray-700 text-blue-400 shadow-sm" : "text-gray-400"}`}
                onClick={() => setResumeMode("edit")}
              >
                <Edit className="h-4 w-4 mr-2" /> Raw Editor
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 hover:bg-gray-800 text-gray-300"
              onClick={generatePDF}
            >
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>

          {resumeMode === "edit" && (
            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl animate-in slide-in-from-top-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-xs font-semibold">
                Warning: Manual markdown changes will be overwritten if you go back and edit the form data.
              </p>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-white">
            <MDEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={800}
              preview={resumeMode}
              visibleDragbar={false}
            />
          </div>

          {/* PDF Container Styles */}
          <div style={{ display: "none" }}>
            <div
              id="resume-pdf"
              style={{
                backgroundColor: "#ffffff",
                color: "#1a1a1a",
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                width: "794px", // A4 standard width
                padding: "40px",
                lineHeight: "1.6",
              }}
            >
              <style>{`
                #resume-pdf h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px; color: #0f172a; font-size: 1.5rem; }
                #resume-pdf div[align="center"] { margin-bottom: 20px; }
              `}</style>
              <div dangerouslySetInnerHTML={{ __html: previewContentHtml }} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}