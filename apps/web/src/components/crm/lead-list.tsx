"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/crm/data-table";
import { FilterBar, FilterField } from "@/components/crm/filters";
import { format } from "date-fns";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  priority: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

interface LeadListProps {
  leads: Lead[];
  isLoading?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  unqualified: "bg-gray-100 text-gray-800",
  converted: "bg-purple-100 text-purple-800",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export const leadColumns: ColumnDef<Lead>[] = [
  {
    accessorKey: "firstName",
    header: "Name",
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <Link href={`/leads/${lead.id}`} className="hover:underline font-medium">
          {lead.firstName} {lead.lastName}
        </Link>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("source")}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge className={cn("capitalize", statusColors[status])}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      return (
        <Badge className={cn("capitalize", priorityColors[priority])}>
          {priority}
        </Badge>
      );
    },
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "MMM d, yyyy"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/leads/${lead.id}`}>
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

export function LeadList({
  leads,
  isLoading,
  totalItems,
  currentPage,
  onPageChange,
}: LeadListProps) {
  const [filters, setFilters] = React.useState({
    status: "",
    priority: "",
    source: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: "", priority: "", source: "" });
  };

  return (
    <div className="space-y-4">
      <FilterBar onReset={resetFilters}>
        <FilterField
          label="Status"
          type="select"
          value={filters.status}
          onChange={(value) => handleFilterChange("status", value as string)}
          options={[
            { label: "New", value: "new" },
            { label: "Contacted", value: "contacted" },
            { label: "Qualified", value: "qualified" },
            { label: "Unqualified", value: "unqualified" },
            { label: "Converted", value: "converted" },
          ]}
          placeholder="All Statuses"
        />
        <FilterField
          label="Priority"
          type="select"
          value={filters.priority}
          onChange={(value) => handleFilterChange("priority", value as string)}
          options={[
            { label: "Low", value: "low" },
            { label: "Medium", value: "medium" },
            { label: "High", value: "high" },
            { label: "Urgent", value: "urgent" },
          ]}
          placeholder="All Priorities"
        />
        <FilterField
          label="Source"
          type="select"
          value={filters.source}
          onChange={(value) => handleFilterChange("source", value as string)}
          options={[
            { label: "Website", value: "website" },
            { label: "Referral", value: "referral" },
            { label: "Cold Call", value: "cold_call" },
            { label: "Advertisement", value: "advertisement" },
            { label: "Social Media", value: "social_media" },
          ]}
          placeholder="All Sources"
        />
      </FilterBar>
      <DataTable
        columns={leadColumns}
        data={leads}
        searchKey="firstName"
        searchPlaceholder="Search by name..."
        isLoading={isLoading}
        totalItems={totalItems}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
    </div>
  );
}
