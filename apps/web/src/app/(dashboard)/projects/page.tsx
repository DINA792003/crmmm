"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/crm/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  location: string;
  type: "residential" | "commercial" | "mixed";
  totalUnits: number;
  soldUnits: number;
  status: "planning" | "under-construction" | "completed";
  completionPercentage: number;
  startDate: string;
  expectedCompletion: string;
}

const projects: Project[] = [
  {
    id: "1",
    name: "Premium Tower",
    location: "Mumbai, Maharashtra",
    type: "residential",
    totalUnits: 200,
    soldUnits: 145,
    status: "under-construction",
    completionPercentage: 65,
    startDate: "2023-06-01T00:00:00Z",
    expectedCompletion: "2025-12-31T00:00:00Z",
  },
  {
    id: "2",
    name: "Commercial Complex",
    location: "Pune, Maharashtra",
    type: "commercial",
    totalUnits: 50,
    soldUnits: 32,
    status: "under-construction",
    completionPercentage: 45,
    startDate: "2023-09-01T00:00:00Z",
    expectedCompletion: "2025-06-30T00:00:00Z",
  },
  {
    id: "3",
    name: "Residential Project",
    location: "Thane, Maharashtra",
    type: "residential",
    totalUnits: 150,
    soldUnits: 150,
    status: "completed",
    completionPercentage: 100,
    startDate: "2022-01-01T00:00:00Z",
    expectedCompletion: "2024-06-30T00:00:00Z",
  },
  {
    id: "4",
    name: "Luxury Villas",
    location: "Navi Mumbai, Maharashtra",
    type: "residential",
    totalUnits: 30,
    soldUnits: 8,
    status: "planning",
    completionPercentage: 0,
    startDate: "2024-06-01T00:00:00Z",
    expectedCompletion: "2026-12-31T00:00:00Z",
  },
];

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800",
  "under-construction": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const typeColors: Record<string, string> = {
  residential: "bg-purple-100 text-purple-800",
  commercial: "bg-orange-100 text-orange-800",
  mixed: "bg-indigo-100 text-indigo-800",
};

const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "name",
    header: "Project Name",
    cell: ({ row }) => (
      <Link href={`/projects/${row.original.id}`} className="hover:underline font-medium">
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return (
        <Badge className={typeColors[type]}>
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "totalUnits",
    header: "Units",
    cell: ({ row }) => {
      const project = row.original;
      return (
        <span>
          {project.soldUnits}/{project.totalUnits}
        </span>
      );
    },
  },
  {
    accessorKey: "completionPercentage",
    header: "Progress",
    cell: ({ row }) => {
      const percentage = row.getValue("completionPercentage") as number;
      return (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm">{percentage}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge className={statusColors[status]}>
          {status.replace("-", " ")}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const project = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Inventory
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function ProjectsPage() {
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your real estate projects and inventory
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold">
                  {projects.reduce((sum, p) => sum + p.totalUnits, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Units Sold</p>
                <p className="text-2xl font-bold">
                  {projects.reduce((sum, p) => sum + p.soldUnits, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        searchKey="name"
        searchPlaceholder="Search projects..."
        totalItems={projects.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
