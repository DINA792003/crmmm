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

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  type: "individual" | "corporate";
  createdAt: string;
}

const contacts: Contact[] = [
  {
    id: "1",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.j@abccorp.com",
    phone: "+91 98765 43211",
    company: "ABC Corporation",
    type: "corporate",
    createdAt: "2024-01-14T14:20:00Z",
  },
  {
    id: "2",
    firstName: "Raj",
    lastName: "Patel",
    email: "raj.patel@gmail.com",
    phone: "+91 98765 43212",
    company: "Individual",
    type: "individual",
    createdAt: "2024-01-13T09:45:00Z",
  },
  {
    id: "3",
    firstName: "Priya",
    lastName: "Gupta",
    email: "priya.g@xyzltd.com",
    phone: "+91 98765 43213",
    company: "XYZ Ltd",
    type: "corporate",
    createdAt: "2024-01-12T11:00:00Z",
  },
];

const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: "firstName",
    header: "Name",
    cell: ({ row }) => {
      const contact = row.original;
      return (
        <Link href={`/contacts/${contact.id}`} className="hover:underline font-medium">
          {contact.firstName} {contact.lastName}
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
    accessorKey: "company",
    header: "Company",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.getValue("type")}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const contact = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/contacts/${contact.id}`}>
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

export default function ContactsPage() {
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts and their information
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
            Add Contact
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={contacts}
        searchKey="firstName"
        searchPlaceholder="Search by name..."
        totalItems={contacts.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
