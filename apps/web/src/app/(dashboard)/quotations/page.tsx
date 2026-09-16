"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/crm/data-table";
import { Plus, Download, MoreHorizontal, Eye, Edit, Trash2, Send } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  projectName: string;
  amount: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  validUntil: string;
  createdAt: string;
}

const quotations: Quotation[] = [
  {
    id: "1",
    quotationNumber: "QUO-2024-001",
    customerName: "Amit Singh",
    projectName: "Premium Tower - Unit 501",
    amount: 15000000,
    status: "sent",
    validUntil: "2024-02-28T00:00:00Z",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    quotationNumber: "QUO-2024-002",
    customerName: "Neha Sharma",
    projectName: "Residential Project - Unit 102",
    amount: 7500000,
    status: "accepted",
    validUntil: "2024-02-15T00:00:00Z",
    createdAt: "2024-01-14T14:30:00Z",
  },
  {
    id: "3",
    quotationNumber: "QUO-2024-003",
    customerName: "Vikram Mehta",
    projectName: "Commercial Complex - Shop 12",
    amount: 4500000,
    status: "draft",
    validUntil: "2024-03-31T00:00:00Z",
    createdAt: "2024-01-13T09:15:00Z",
  },
  {
    id: "4",
    quotationNumber: "QUO-2024-004",
    customerName: "ABC Corporation",
    projectName: "IT Park - Floor 3",
    amount: 35000000,
    status: "rejected",
    validUntil: "2024-01-31T00:00:00Z",
    createdAt: "2024-01-10T11:00:00Z",
  },
];

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const columns: ColumnDef<Quotation>[] = [
  {
    accessorKey: "quotationNumber",
    header: "Quotation #",
    cell: ({ row }) => (
      <Link href={`/quotations/${row.original.id}`} className="hover:underline font-medium">
        {row.getValue("quotationNumber")}
      </Link>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "projectName",
    header: "Project",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.getValue("amount"))}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge className={statusColors[status]}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "validUntil",
    header: "Valid Until",
    cell: ({ row }) => new Date(row.getValue("validUntil")).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/quotations/${quotation.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Send className="mr-2 h-4 w-4" />
              Send
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
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

export default function QuotationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className="text-muted-foreground">
            Create and manage sales quotations
          </p>
        </div>
        <Button onClick={() => toast({ title: "New Quotation", description: "Create quotation form coming soon" })}>
          <Plus className="mr-2 h-4 w-4" />
          New Quotation
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={quotations}
        searchKey="quotationNumber"
        searchPlaceholder="Search by quotation number..."
        totalItems={quotations.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
