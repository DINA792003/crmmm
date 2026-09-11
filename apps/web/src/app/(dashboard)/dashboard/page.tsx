"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  KPICard,
  ActivityList,
  PipelineSummary,
} from "@/components/crm/dashboard-widgets";
import {
  Users,
  TrendingUp,
  DollarSign,
  FileText,
  Calendar,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const kpis = [
  {
    title: "Total Leads",
    value: "1,234",
    change: 12,
    changeLabel: "vs last month",
    icon: Users,
  },
  {
    title: "Opportunities",
    value: "₹45.2L",
    change: 8.5,
    changeLabel: "vs last month",
    icon: TrendingUp,
  },
  {
    title: "Revenue",
    value: "₹12.8L",
    change: -3.2,
    changeLabel: "vs last month",
    icon: DollarSign,
  },
  {
    title: "Bookings",
    value: "28",
    change: 15,
    changeLabel: "vs last month",
    icon: FileText,
  },
];

const activities = [
  {
    id: "1",
    title: "Call with John Smith",
    description: "Discussed premium apartment requirements",
    time: "5 minutes ago",
    type: "call" as const,
  },
  {
    id: "2",
    title: "Email sent to Sarah Johnson",
    description: "Sent brochure for Commercial Complex",
    time: "1 hour ago",
    type: "email" as const,
  },
  {
    id: "3",
    title: "Site visit scheduled",
    description: "Premium Tower with Raj Patel",
    time: "2 hours ago",
    type: "meeting" as const,
  },
  {
    id: "4",
    title: "Follow-up task",
    description: "Call back with revised quotation",
    time: "Tomorrow, 10:00 AM",
    type: "task" as const,
  },
];

const pipelineStages = [
  { name: "prospecting", count: 15, value: 2500000 },
  { name: "qualification", count: 8, value: 1800000 },
  { name: "proposal", count: 5, value: 1200000 },
  { name: "negotiation", count: 3, value: 800000 },
];

const upcomingTasks = [
  { id: "1", title: "Follow up with ABC Corp", dueDate: "Today", priority: "high" },
  { id: "2", title: "Send quotation to John Smith", dueDate: "Tomorrow", priority: "medium" },
  { id: "3", title: "Site visit at Premium Tower", dueDate: "In 2 days", priority: "low" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/reports">
              View Reports
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leads">
              <Plus className="mr-2 h-4 w-4" />
              New Lead
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Opportunities</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/opportunities">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: "1", title: "Premium Tower Project", value: "₹2.5Cr", stage: "Negotiation", client: "ABC Corp" },
                  { id: "2", title: "Commercial Complex", value: "₹1.8Cr", stage: "Proposal", client: "XYZ Ltd" },
                  { id: "3", title: "Residential Project", value: "₹95L", stage: "Qualification", client: "John Smith" },
                ].map((opp) => (
                  <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div>
                      <Link href={`/opportunities/${opp.id}`} className="font-medium hover:underline">
                        {opp.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">{opp.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{opp.value}</p>
                      <p className="text-sm text-muted-foreground">{opp.stage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PipelineSummary stages={pipelineStages} />
          <ActivityList activities={activities} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div
                      className={
                        task.priority === "high"
                          ? "h-2 w-2 rounded-full bg-red-500"
                          : task.priority === "medium"
                          ? "h-2 w-2 rounded-full bg-yellow-500"
                          : "h-2 w-2 rounded-full bg-green-500"
                      }
                    />
                    <span className="text-sm">{task.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{task.dueDate}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                <Link href="/leads">
                  <Users className="h-5 w-5" />
                  <span>Add Lead</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                <Link href="/site-visits">
                  <Calendar className="h-5 w-5" />
                  <span>Schedule Visit</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                <Link href="/quotations">
                  <FileText className="h-5 w-5" />
                  <span>Create Quote</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                <Link href="/opportunities">
                  <TrendingUp className="h-5 w-5" />
                  <span>New Opportunity</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
