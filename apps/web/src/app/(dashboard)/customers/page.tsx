"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/crm/data-table";
import { Plus, Upload, Download, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  type: "individual" | "corporate";
  status: "active" | "inactive" | "vip";
  totalSpent: number;
  createdAt: string;
}

const customers: Customer[] = [
  {
    id: "1",
    firstName: "Amit",
    lastName: "Singh",
    email: "amit.singh@example.com",
    phone: "+91 98765 43214",
    companyName: "Singh Enterprises",
    type: "corporate",
    status: "vip",
    totalSpent: 2500000,
    createdAt: "2024-01-10T09:00:00Z",
  },
  {
    id: "2",
    firstName: "Neha",
    lastName: "Sharma",
    email: "neha.s@example.com",
    phone: "+91 98765 43217",
    type: "individual",
    status: "active",
    totalSpent: 750000,
    createdAt: "2024-01-08T14:30:00Z",
  },
  {
    id: "3",
    firstName: "Vikram",
    lastName: "Mehta",
    email: "vikram.m@mehtaconstruction.com",
    phone: "+91 98765 43218",
    companyName: "Mehta Construction",
    type: "corporate",
    status: "active",
    totalSpent: 1800000,
    createdAt: "2024-01-05T11:15:00Z",
  },
];

const typeColors: Record<string, string> = {
  individual: "bg-blue-100 text-blue-800",
  corporate: "bg-purple-100 text-purple-800",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  vip: "bg-yellow-100 text-yellow-800",
};

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "firstName",
    header: "Name",
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <Link href={`/customers/${customer.id}`} className="hover:underline font-medium">
          {customer.firstName} {customer.lastName}
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
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => row.getValue("companyName") || "-",
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
    accessorKey: "totalSpent",
    header: "Total Spent",
    cell: ({ row }) => {
      const amount = row.getValue("totalSpent") as number;
      return (
        <span className="font-medium">
          ₹{amount.toLocaleString()}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/customers/${customer.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View 360
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

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customers and view their 360-degree profile
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast({ title: "Import", description: "Import feature coming soon" })}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={() => toast({ title: "Export", description: "Export feature coming soon" })}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => toast({ title: "Add Customer", description: "Create customer form coming soon" })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        searchKey="firstName"
        searchPlaceholder="Search by name..."
        totalItems={customers.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
