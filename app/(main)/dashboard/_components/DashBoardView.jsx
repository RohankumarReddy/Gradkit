"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BriefcaseIcon, LineChart, TrendingUp, TrendingDown, Brain } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const DashboardView = ({ insights }) => {
  const salaryData = insights.salaryRanges.map((r) => ({
    name: r.role,
    min: r.min / 1000,
    median: r.median / 1000,
    max: r.max / 1000,
  }));

  const demandColors = { high: "bg-green-500", medium: "bg-yellow-400", low: "bg-red-500" };
  const marketIcons = {
    positive: { icon: TrendingUp, color: "text-green-400" },
    neutral: { icon: LineChart, color: "text-yellow-400" },
    negative: { icon: TrendingDown, color: "text-red-400" },
  };

  const getDemandColor = (level) => demandColors[level.toLowerCase()] || "bg-gray-400";
  const { icon: OutlookIcon, color: outlookColor } =
    marketIcons[insights.marketOutlook.toLowerCase()] || { icon: LineChart, color: "text-gray-400" };

  const lastUpdated = format(new Date(insights.lastUpdated), "dd MMM yyyy");
  const nextUpdate = formatDistanceToNow(new Date(insights.nextUpdate), { addSuffix: true });

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-12 py-6">
      {/* Last Updated */}
      <div className="flex justify-end">
        <Badge variant="outline" className="bg-gray-800 text-white border-gray-600 animate-pulse">
          Last updated: {lastUpdated}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Market Outlook",
            value: insights.marketOutlook,
            icon: <OutlookIcon className={`h-5 w-5 ${outlookColor} animate-bounce`} />,
            description: `Next update ${nextUpdate}`,
            gradient: "bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700",
          },
          {
            title: "Industry Growth",
            value: `${insights.growthRate.toFixed(1)}%`,
            icon: <TrendingUp className="h-5 w-5 text-green-300" />,
            description: null,
            gradient: "bg-gradient-to-br from-green-900 via-green-800 to-green-700",
            progress: insights.growthRate,
          },
          {
            title: "Demand Level",
            value: insights.demandLevel,
            icon: <BriefcaseIcon className="h-5 w-5 text-yellow-200" />,
            description: null,
            gradient: "bg-gradient-to-br from-yellow-900 via-yellow-800 to-yellow-700",
            progressBar: getDemandColor(insights.demandLevel),
          },
          {
            title: "Top Skills",
            value: insights.topSkills,
            icon: <Brain className="h-5 w-5 text-purple-200" />,
            description: null,
            gradient: "bg-gradient-to-br from-purple-900 via-purple-800 to-purple-700",
            badges: true,
          },
        ].map((card, idx) => (
          <Card
            key={idx}
            className={`${card.gradient} hover:scale-105 transition-transform duration-300 shadow-2xl rounded-xl border-none`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-white tracking-wide uppercase opacity-90">
                {card.title}
              </CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              {card.badges ? (
                <div className="flex flex-wrap gap-2">
                  {card.value.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white border-none font-medium px-3 py-1 rounded-full"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <>
                  <div className="text-3xl font-extrabold text-white mb-1">{card.value}</div>
                  {card.description && <p className="text-xs text-white/80 font-medium">{card.description}</p>}
                  {card.progress && <Progress value={card.progress} className="mt-3 h-2 rounded-full bg-white/20" />}
                  {card.progressBar && <div className={`h-2 w-full rounded-full mt-3 ${card.progressBar} border border-white/10 animate-pulse`} />}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Salary Chart */}
      <Card className="bg-gray-900 border-gray-800 hover:shadow-2xl transition-shadow duration-300 rounded-xl overflow-hidden">
        <CardHeader className="border-b border-gray-800 bg-gray-900/50">
          <CardTitle className="text-white text-xl font-bold">Salary Ranges by Role</CardTitle>
          <CardDescription className="text-gray-400">Minimum, Median, and Maximum salaries (USD K)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[350px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salaryData} barCategoryGap={20}>
                <CartesianGrid stroke="#2d3748" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    tick={{ fill: "#cbd5e0", fontSize: 12, fontWeight: 500 }} 
                    axisLine={{ stroke: '#4a5568' }}
                />
                <YAxis 
                    tick={{ fill: "#cbd5e0", fontSize: 12 }} 
                    axisLine={{ stroke: '#4a5568' }}
                    tickFormatter={(value) => `$${value}k`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="bg-gray-950 text-white p-4 border border-gray-700 rounded-xl shadow-2xl">
                        <p className="font-bold text-lg mb-2 border-b border-gray-700 pb-1">{label}</p>
                        {payload.map((item) => (
                          <div key={item.name} className="flex justify-between items-center gap-8 my-1">
                            <span className="text-sm text-gray-400 capitalize">{item.name}:</span>
                            <span className="text-sm font-mono font-bold text-white">${item.value}K</span>
                          </div>
                        ))}
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="min" fill="#4a5568" radius={[4, 4, 0, 0]} name="Minimum" />
                <Bar dataKey="median" fill="#3182ce" radius={[4, 4, 0, 0]} name="Median" />
                <Bar dataKey="max" fill="#2c5282" radius={[4, 4, 0, 0]} name="Maximum" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Industry Trends & Recommended Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800 hover:scale-[1.02] transition-transform duration-300 shadow-2xl rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Key Industry Trends
            </CardTitle>
            <CardDescription className="text-gray-400 italic">Current market shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {insights.keyTrends.map((trend, i) => (
                <li key={i} className="flex items-start space-x-3 group">
                  <div className="h-2 w-2 mt-2 rounded-full bg-blue-500 group-hover:scale-150 transition-transform duration-200 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-gray-200 font-medium leading-tight">{trend}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800 hover:scale-[1.02] transition-transform duration-300 shadow-2xl rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Recommended Skills
            </CardTitle>
            <CardDescription className="text-gray-400 italic">High-growth areas to master</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 pt-2">
              {insights.recommendedSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-gray-700 hover:border-purple-500 transition-colors"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;