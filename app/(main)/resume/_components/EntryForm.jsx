// app/resume/_components/entry-form.jsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { entrySchema } from "@/app/lib/schema";
import { Sparkles, PlusCircle, X, Loader2, Calendar } from "lucide-react";
import { improveWithAI } from "@/actions/resume";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";

const formatDisplayDate = (dateString) => {
  if (!dateString) return "";
  const date = parse(dateString, "yyyy-MM", new Date());
  return format(date, "MMM yyyy");
};

export function EntryForm({ type, entries, onChange }) {
  const [isAdding, setIsAdding] = useState(false);

  const {
    register,
    handleSubmit: handleValidation,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      title: "",
      organization: "",
      startDate: "",
      endDate: "",
      description: "",
      current: false,
    },
  });

  const current = watch("current");

  const handleAdd = handleValidation((data) => {
    const formattedEntry = {
      ...data,
      startDate: formatDisplayDate(data.startDate),
      endDate: data.current ? "" : formatDisplayDate(data.endDate),
    };

    onChange([...entries, formattedEntry]);
    reset();
    setIsAdding(false);
  });

  const handleDelete = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  const {
    loading: isImproving,
    fn: improveWithAIFn,
    data: improvedContent,
    error: improveError,
  } = useFetch(improveWithAI);

  useEffect(() => {
    if (improvedContent && !isImproving) {
      setValue("description", improvedContent);
      toast.success("Description improved successfully!");
    }
    if (improveError) {
      toast.error(improveError.message || "Failed to improve description");
    }
  }, [improvedContent, improveError, isImproving, setValue]);

  const handleImproveDescription = async () => {
    const description = watch("description");
    if (!description) {
      toast.error("Please enter a description first");
      return;
    }

    await improveWithAIFn({
      current: description,
      type: type.toLowerCase(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Existing Entries List */}
      <div className="space-y-4">
        {entries.map((item, index) => (
          <Card key={index} className="bg-gray-800/40 border-gray-700 shadow-md overflow-hidden group">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 bg-gray-900/20">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-blue-400">
                  {item.title}
                </CardTitle>
                <p className="text-sm font-medium text-gray-300">{item.organization}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                onClick={() => handleDelete(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                <Calendar className="mr-1.5 h-3 w-3" />
                {item.current ? `${item.startDate} - Present` : `${item.startDate} - ${item.endDate}`}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Entry Form Card */}
      {isAdding && (
        <Card className="bg-gray-800 border-2 border-blue-500/30 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <CardHeader className="border-b border-gray-700/50">
            <CardTitle className="text-lg font-bold text-white">Add {type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Title/Position</label>
                <Input
                  className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white"
                  placeholder="e.g. Software Engineer"
                  {...register("title")}
                />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Organization</label>
                <Input
                  className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white"
                  placeholder="e.g. Tech Corp"
                  {...register("organization")}
                />
                {errors.organization && <p className="text-xs text-red-400 mt-1">{errors.organization.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Start Date</label>
                <Input
                  type="month"
                  className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white dark:[color-scheme:dark]"
                  {...register("startDate")}
                />
                {errors.startDate && <p className="text-xs text-red-400 mt-1">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">End Date</label>
                <Input
                  type="month"
                  className="bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white dark:[color-scheme:dark]"
                  {...register("endDate")}
                  disabled={current}
                />
                {errors.endDate && <p className="text-xs text-red-400 mt-1">{errors.endDate.message}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-900/30 rounded-lg border border-gray-700/50">
              <input
                type="checkbox"
                id="current"
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                {...register("current")}
                onChange={(e) => {
                  setValue("current", e.target.checked);
                  if (e.target.checked) setValue("endDate", "");
                }}
              />
              <label htmlFor="current" className="text-sm font-medium text-gray-200 cursor-pointer">
                I am currently working/studying here
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                  onClick={handleImproveDescription}
                  disabled={isImproving || !watch("description")}
                >
                  {isImproving ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-2" />
                      Improve with AI
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder={`Describe your achievements and responsibilities...`}
                className="min-h-[140px] bg-gray-900/50 border-gray-600 focus:border-blue-500 text-white leading-relaxed"
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-3 bg-gray-900/20 border-t border-gray-700/50 py-4">
            <Button
              type="button"
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={() => {
                reset();
                setIsAdding(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 font-bold"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Save Entry
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Trigger Button */}
      {!isAdding && (
        <Button
          className="w-full py-8 border-2 border-dashed border-gray-700 bg-transparent hover:bg-gray-800 hover:border-blue-500/50 text-gray-400 hover:text-blue-400 transition-all group"
          variant="outline"
          onClick={() => setIsAdding(true)}
        >
          <PlusCircle className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
          Add {type}
        </Button>
      )}
    </div>
  );
}