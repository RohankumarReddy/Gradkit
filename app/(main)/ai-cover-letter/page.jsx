"use client";

import { useState } from "react";
import { generateCoverLetter } from "@/actions/coverletter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Wand2, FileText, Clipboard, Check } from "lucide-react";

export default function AICoverLetterPage() {
  const [formData, setFormData] = useState({
    jobTitle: "",
    companyName: "",
    jobDescription: "",
    industry: "",
    experience: "",
    skills: "",
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [copyText, setCopyText] = useState("Copy");

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  async function handleGenerate() {
    if (!formData.jobTitle || !formData.companyName || !formData.jobDescription) {
      toast.error("Please fill in Job Title, Company Name, and Job Description.");
      return;
    }

    try {
      setLoading(true);
      setCoverLetter("");
      const skillsArray = formData.skills.split(",").map((s) => s.trim()).filter(Boolean);

      const result = await generateCoverLetter({
        ...formData,
        skills: skillsArray,
      });
      
      setCoverLetter(result);
      toast.success("Cover letter generated!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate cover letter.");
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter).then(() => {
      setCopyText("Copied!");
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopyText("Copy"), 2000);
    }).catch(() => toast.error("Failed to copy text."));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-slate-50 py-12 px-4 selection:bg-blue-500/30">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-12 space-y-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          GradKit Cover Letter
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
          Craft a professional, tailored letter in seconds.
        </p>
        <div className="inline-block px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
            Privacy Focused: Letters are never stored
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Form Section */}
        <Card className="bg-gray-800/40 border-gray-700 shadow-2xl backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-700/50 pb-6">
            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Job Context</CardTitle>
            <CardDescription className="text-gray-400">Tell us about the role and your background.</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest" htmlFor="jobTitle">Job Title</Label>
                <Input 
                  id="jobTitle" 
                  className="bg-gray-900/50 border-gray-600 focus:border-blue-500 transition-all text-white" 
                  placeholder="e.g. UX Designer" 
                  value={formData.jobTitle} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest" htmlFor="companyName">Company</Label>
                <Input 
                  id="companyName" 
                  className="bg-gray-900/50 border-gray-600 focus:border-blue-500 transition-all text-white" 
                  placeholder="e.g. Google" 
                  value={formData.companyName} 
                  onChange={handleChange} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest" htmlFor="industry">Industry</Label>
              <Input 
                id="industry" 
                className="bg-gray-900/50 border-gray-600 focus:border-blue-500 transition-all text-white" 
                placeholder="e.g. FinTech" 
                value={formData.industry} 
                onChange={handleChange} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest" htmlFor="jobDescription">Job Description</Label>
              <Textarea 
                id="jobDescription" 
                className="min-h-[120px] bg-gray-900/50 border-gray-600 focus:border-blue-500 transition-all text-white text-sm" 
                placeholder="Paste the key requirements here..." 
                value={formData.jobDescription} 
                onChange={handleChange} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest" htmlFor="bio">Your Professional Summary</Label>
              <Textarea 
                id="bio" 
                className="min-h-[100px] bg-gray-900/50 border-gray-600 focus:border-blue-500 transition-all text-white text-sm" 
                placeholder="Who are you and what are your goals?" 
                value={formData.bio} 
                onChange={handleChange} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest" htmlFor="experience">Relevant Experience</Label>
              <Textarea 
                id="experience" 
                className="min-h-[100px] bg-gray-900/50 border-gray-600 focus:border-blue-500 transition-all text-white text-sm" 
                placeholder="Highlight your wins..." 
                value={formData.experience} 
                onChange={handleChange} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest" htmlFor="skills">Skills</Label>
              <Input 
                id="skills" 
                className="bg-gray-900/50 border-gray-600 focus:border-blue-500 transition-all text-white" 
                placeholder="React, TypeScript, Figma..." 
                value={formData.skills} 
                onChange={handleChange} 
              />
            </div>
          </CardContent>

          <CardFooter className="bg-gray-900/20 border-t border-gray-700/50 py-6">
            <Button 
              onClick={handleGenerate} 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 text-lg rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-5 w-5" />
              )}
              {loading ? "Crafting your letter..." : "Generate Cover Letter"}
            </Button>
          </CardFooter>
        </Card>

        {/* Result Section */}
        <Card className="bg-gray-800/40 border-gray-700 shadow-2xl backdrop-blur-sm rounded-2xl lg:sticky lg:top-8 flex flex-col min-h-[600px] lg:h-[calc(100vh-6rem)] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-700/50 pb-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Draft</CardTitle>
              <CardDescription className="text-gray-400">Tailored Result</CardDescription>
            </div>
            {coverLetter && !loading && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyToClipboard} 
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
              >
                {copyText === "Copy" ? (
                  <Clipboard className="mr-2 h-4 w-4" />
                ) : (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                )}
                {copyText}
              </Button>
            )}
          </CardHeader>
          
          <CardContent className="flex-grow p-0 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-md z-10 animate-in fade-in duration-500">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                  <p className="text-gray-300 font-medium mt-4">Writing your masterpiece...</p>
                </div>
              </div>
            )}
            
            {!loading && !coverLetter && (
              <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
                <div className="bg-gray-900/50 p-6 rounded-full">
                  <FileText className="h-12 w-12 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-300">Ready when you are</h3>
                  <p className="text-sm text-gray-500 max-w-[250px] mx-auto">Fill out the job details to generate your tailored cover letter.</p>
                </div>
              </div>
            )}

            {!loading && coverLetter && (
              <div className="h-full w-full p-6 md:p-8 bg-gray-900/30 overflow-y-auto custom-scrollbar">
                <div
                  className="prose prose-invert prose-blue max-w-none text-gray-200 leading-relaxed font-serif text-base md:text-lg"
                  dangerouslySetInnerHTML={{ __html: coverLetter.replace(/\n/g, "<br />") }}
                />
              </div>
            )}
          </CardContent>
        </Card>

      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
}