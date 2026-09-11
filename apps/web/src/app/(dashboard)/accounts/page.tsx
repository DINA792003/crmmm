"use client";

import * as React from "react";
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

interface Account {
  id: string;
  name: string;
  industry: string;
  type: "enterprise" | "smb" | "government";
  website: string;
  phone: string;
  email: string;
  createdAt: string;
}

const accounts: Account[] = [
  {
    id: "1",
    name: "ABC Corporation",
    industry: "Real Estate",
    type: "enterprise",
    website: "https://abccorp.com",
    phone: "+91 98765 43211",
    email: "info@abccorp.com",
    createdAt: "2024-01-14T14:20:00Z",
  },
  {
    id: "2",
    name: "XYZ Ltd",
    industry: "Construction",
    type: "enterprise",
    website: "https://xyzltd.com",
    phone: "+91 98765 43213",
    email: "contact@xyzltd.com",
    createdAt: "2024-01-12T11:00:00Z",
  },
  {
    id: "3",
    name: "PQR Builders",
    industry: "Real Estate",
    type: "smb",
    website: "https://pqrbuilders.com",
    phone: "+91 98765 43216",
    email: "info@pqrbuilders.com",
    createdAt: "2024-01-10T09:30:00Z",
  },
];

const typeColors: Record<string, string> = {
  enterprise: "bg-blue-100 text-blue-800",
  smb: "bg-green-100 text-green-800",
  government: "bg-purple-100 text-purple-800",
};

const columns: ColumnDef<Account>[] = [
  {
    accessorKey: "name",
    header: "Account Name",
    cell: ({ row }) => {
      const account = row.original;
      return (
        <Link href={`/accounts/${account.id}`} className="hover:underline font-medium">
          {account.name}
        </Link>
      );
    },
  },
  {
    accessorKey: "industry",
    header: "Industry",
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
    accessorKey: "website",
    header: "Website",
    cell: ({ row }) => (
      <a
        href={row.getValue("website") as string}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {row.getValue("website")}
      </a>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const account = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/accounts/${account.id}`}>
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

export default function AccountsPage() {
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your business accounts and companies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={accounts}
        searchKey="name"
        searchPlaceholder="Search by name..."
        totalItems={accounts.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
