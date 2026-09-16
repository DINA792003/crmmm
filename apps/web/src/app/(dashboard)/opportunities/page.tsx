"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpportunityPipeline, Opportunity } from "@/components/crm/opportunity-pipeline";
import { DataTable } from "@/components/crm/data-table";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Plus, LayoutGrid, List, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const mockOpportunities: Opportunity[] = [
  {
    id: "1",
    title: "Premium Tower Project",
    value: 25000000,
    stage: "negotiation",
    probability: 75,
    closeDate: "2024-03-31T00:00:00Z",
    accountName: "ABC Corporation",
    assignedTo: "Rajesh Kumar",
  },
  {
    id: "2",
    title: "Commercial Complex",
    value: 18000000,
    stage: "proposal",
    probability: 50,
    closeDate: "2024-04-15T00:00:00Z",
    accountName: "XYZ Ltd",
    assignedTo: "Priya Sharma",
  },
  {
    id: "3",
    title: "Residential Project",
    value: 9500000,
    stage: "qualification",
    probability: 30,
    closeDate: "2024-05-01T00:00:00Z",
    accountName: "John Smith",
    assignedTo: "Amit Verma",
  },
  {
    id: "4",
    title: "Luxury Villas",
    value: 35000000,
    stage: "prospecting",
    probability: 20,
    closeDate: "2024-06-30T00:00:00Z",
    accountName: "PQR Builders",
    assignedTo: "Rajesh Kumar",
  },
  {
    id: "5",
    title: "IT Park Phase 2",
    value: 45000000,
    stage: "closed-won",
    probability: 100,
    closeDate: "2024-01-15T00:00:00Z",
    accountName: "ABC Corporation",
    assignedTo: "Priya Sharma",
  },
];

const stageColors: Record<string, string> = {
  prospecting: "bg-blue-100 text-blue-800",
  qualification: "bg-indigo-100 text-indigo-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-orange-100 text-orange-800",
  "closed-won": "bg-green-100 text-green-800",
  "closed-lost": "bg-red-100 text-red-800",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const listColumns: ColumnDef<Opportunity>[] = [
  {
    accessorKey: "title",
    header: "Opportunity",
    cell: ({ row }) => (
      <Link href={`/opportunities/${row.original.id}`} className="hover:underline font-medium">
        {row.getValue("title")}
      </Link>
    ),
  },
  {
    accessorKey: "accountName",
    header: "Account",
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => formatCurrency(row.getValue("value")),
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => {
      const stage = row.getValue("stage") as string;
      return (
        <Badge className={stageColors[stage]}>
          {stage.replace("-", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "probability",
    header: "Probability",
    cell: ({ row }) => `${row.getValue("probability")}%`,
  },
  {
    accessorKey: "closeDate",
    header: "Close Date",
    cell: ({ row }) => new Date(row.getValue("closeDate")).toLocaleDateString(),
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const opportunity = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/opportunities/${opportunity.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
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

export default function OpportunitiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = React.useState<"pipeline" | "list">("pipeline");
  const [currentPage, setCurrentPage] = React.useState(1);

  const handleStageChange = (opportunityId: string, newStage: string) => {
    toast({ title: "Stage Updated", description: `Opportunity moved to ${newStage.replace("-", " ")}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">
            Track and manage your sales pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView(view === "pipeline" ? "list" : "pipeline")}>
            {view === "pipeline" ? (
              <>
                <List className="mr-2 h-4 w-4" />
                List View
              </>
            ) : (
              <>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Pipeline View
              </>
            )}
          </Button>
          <Button onClick={() => toast({ title: "New Opportunity", description: "Create opportunity form coming soon" })}>
            <Plus className="mr-2 h-4 w-4" />
            New Opportunity
          </Button>
        </div>
      </div>

      {view === "pipeline" ? (
        <OpportunityPipeline
          opportunities={mockOpportunities}
          onStageChange={handleStageChange}
        />
      ) : (
        <DataTable
          columns={listColumns}
          data={mockOpportunities}
          searchKey="title"
          searchPlaceholder="Search opportunities..."
          totalItems={mockOpportunities.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
