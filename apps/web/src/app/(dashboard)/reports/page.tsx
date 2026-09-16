"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  lastGenerated?: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
}

const reports: Report[] = [
  {
    id: "1",
    title: "Lead Conversion Report",
    description: "Track lead conversion rates and pipeline efficiency",
    category: "Sales",
    lastGenerated: "2024-01-15T10:00:00Z",
    frequency: "weekly",
  },
  {
    id: "2",
    title: "Revenue Report",
    description: "Detailed breakdown of revenue by project, region, and sales rep",
    category: "Finance",
    lastGenerated: "2024-01-14T14:00:00Z",
    frequency: "monthly",
  },
  {
    id: "3",
    title: "Site Visit Analytics",
    description: "Analyze site visit frequency, conversion, and feedback",
    category: "Operations",
    frequency: "weekly",
  },
  {
    id: "4",
    title: "Customer Satisfaction Report",
    description: "Track customer feedback and satisfaction scores",
    category: "Customer",
    frequency: "quarterly",
  },
  {
    id: "5",
    title: "Project Status Report",
    description: "Overview of all projects including completion and inventory status",
    category: "Projects",
    lastGenerated: "2024-01-13T09:00:00Z",
    frequency: "monthly",
  },
  {
    id: "6",
    title: "Sales Team Performance",
    description: "Individual and team performance metrics and targets",
    category: "Sales",
    frequency: "weekly",
  },
];

const categoryColors: Record<string, string> = {
  Sales: "bg-blue-100 text-blue-800",
  Finance: "bg-green-100 text-green-800",
  Operations: "bg-orange-100 text-orange-800",
  Customer: "bg-purple-100 text-purple-800",
  Projects: "bg-indigo-100 text-indigo-800",
};

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Sales: TrendingUp,
  Finance: DollarSign,
  Operations: Calendar,
  Customer: Users,
  Projects: FileText,
};

export default function ReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState("30d");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and view business reports
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last 1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toast({ title: "Export All", description: "Export feature coming soon" })}>
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = categoryIcons[report.category] || FileText;
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <Badge className={categoryColors[report.category]}>
                      {report.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{report.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Frequency: <span className="capitalize">{report.frequency}</span>
                  </span>
                  {report.lastGenerated && (
                    <span className="text-muted-foreground">
                      Last: {new Date(report.lastGenerated).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" onClick={() => toast({ title: "Generating Report", description: `${report.title} is being generated...` })}>
                    Generate
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast({ title: "Download", description: "Download feature coming soon" })}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
