"use client";

import { useState } from "react";
import { LearningFeed } from "@/actions/LearningFeed";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, Library, BookOpen } from "lucide-react";

export default function LearningFeedPage() {
  const [industry, setIndustry] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerateFeed = async () => {
    if (!industry && !skills && !interests) {
      toast.error("Please fill in at least one field.");
      return;
    }

    setLoading(true);
    setFeed([]);

    try {
      const result = await LearningFeed({
        industry,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        interests: interests.split(",").map((i) => i.trim()).filter(Boolean),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setFeed(result.feed);
        toast.success("Your feed has been generated!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-slate-50 px-4 py-12 selection:bg-blue-500/30">
      {/* Header Section */}
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          GradKit Learning Feed
        </h1>
        <p className="text-gray-400 md:text-lg max-w-2xl mx-auto">
          Enter your industry, skills, and interests to generate a curated feed of educational content.
        </p>
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <p className="font-medium animate-float text-blue-400 text-xs md:text-sm">
                💡 Links are AI-generated. If a link fails, please search the title manually.
            </p>
        </div>
      </div>

      {/* Input Form Card */}
      <Card className="max-w-5xl mx-auto mt-12 bg-gray-800/40 border-gray-700 shadow-2xl backdrop-blur-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-gray-700/50 pb-6">
          <CardTitle className="text-2xl font-bold text-white">
            Customize Your Feed
          </CardTitle>
          <CardDescription className="text-gray-400">
            Provide details to help us find the best resources for you.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="grid grid-cols-1 gap-8 md:grid-cols-3 pt-8">
          <div className="space-y-3">
            <Label htmlFor="industry" className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Industry</Label>
            <Textarea
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Software Engineering, AI"
              className="min-h-[100px] bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="skills" className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Skills</Label>
            <Textarea
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., React, Next.js, Python"
              className="min-h-[100px] bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="interests" className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Interests</Label>
            <Textarea
              id="interests"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g., System Design, Robotics"
              className="min-h-[100px] bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </CardContent>

        <CardFooter className="bg-gray-900/20 border-t border-gray-700/50 py-6 flex justify-center md:justify-end">
          <Button
            onClick={handleGenerateFeed}
            disabled={loading}
            size="lg"
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            {loading ? "Generating..." : "Generate Feed"}
          </Button>
        </CardFooter>
      </Card>

      {/* Feed Results */}
      <div className="max-w-7xl mx-auto mt-16 px-2">
        {loading && (
          <div className="text-center py-20 animate-pulse">
            <Loader2 className="mx-auto mb-6 h-12 w-12 animate-spin text-blue-500" />
            <p className="text-gray-400 text-xl font-medium">Curating your personalized learning path...</p>
          </div>
        )}

        {!loading && feed.length === 0 && (
          <div className="max-w-xl mx-auto rounded-3xl border-2 border-dashed border-gray-700 p-12 text-center">
            <div className="bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Library className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Content Yet</h3>
            <p className="text-gray-400">Your curated feed will appear here once you fill out the form and hit generate.</p>
          </div>
        )}

        {!loading && feed.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {feed.map((item, idx) => (
              <Card
                key={idx}
                className="flex flex-col bg-gray-800/40 border-gray-700 hover:border-blue-500/50 rounded-2xl shadow-xl transition-all duration-300 group"
              >
                <CardHeader className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-blue-500/10 text-blue-400 border-none hover:bg-blue-500/20 uppercase text-[10px] tracking-widest">{item.type}</Badge>
                    <Badge variant="outline" className="border-gray-600 text-gray-400 text-[10px] uppercase tracking-widest">{item.source}</Badge>
                    <Badge variant="outline" className="border-gray-600 text-gray-400 text-[10px] uppercase tracking-widest">{item.time}</Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-white leading-tight group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="px-6 pb-6 flex-grow flex flex-col justify-between">
                  <div>
                    <ul className="space-y-3">
                        {item.summary.map((point, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-300 leading-relaxed">
                            <span className="mr-2 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            {point}
                        </li>
                        ))}
                    </ul>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-700/50">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Why this matches:</span>
                    <p className="text-xs italic text-gray-400 mt-1 line-clamp-2">{item.relevance}</p>
                  </div>
                </CardContent>

                <CardFooter className="p-6 pt-0">
                  <Button asChild className="w-full bg-gray-700 hover:bg-blue-600 text-white border-none transition-all">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Explore Content
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}