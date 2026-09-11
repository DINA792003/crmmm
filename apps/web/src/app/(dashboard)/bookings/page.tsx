"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/crm/data-table";
import { Plus, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Booking {
  id: string;
  bookingNumber: string;
  customerName: string;
  projectName: string;
  unitNumber: string;
  amount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  bookingDate: string;
  paymentStatus: "pending" | "partial" | "complete";
}

const bookings: Booking[] = [
  {
    id: "1",
    bookingNumber: "BK-2024-001",
    customerName: "Neha Sharma",
    projectName: "Residential Project",
    unitNumber: "Unit 102",
    amount: 7500000,
    status: "confirmed",
    bookingDate: "2024-01-15T10:00:00Z",
    paymentStatus: "partial",
  },
  {
    id: "2",
    bookingNumber: "BK-2024-002",
    customerName: "Amit Singh",
    projectName: "Premium Tower",
    unitNumber: "Unit 501",
    amount: 15000000,
    status: "pending",
    bookingDate: "2024-01-14T14:30:00Z",
    paymentStatus: "pending",
  },
  {
    id: "3",
    bookingNumber: "BK-2024-003",
    customerName: "Vikram Mehta",
    projectName: "Commercial Complex",
    unitNumber: "Shop 12",
    amount: 4500000,
    status: "completed",
    bookingDate: "2024-01-10T09:00:00Z",
    paymentStatus: "complete",
  },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-orange-100 text-orange-800",
  complete: "bg-green-100 text-green-800",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const columns: ColumnDef<Booking>[] = [
  {
    accessorKey: "bookingNumber",
    header: "Booking #",
    cell: ({ row }) => (
      <Link href={`/bookings/${row.original.id}`} className="hover:underline font-medium">
        {row.getValue("bookingNumber")}
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
    accessorKey: "unitNumber",
    header: "Unit",
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
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => {
      const status = row.getValue("paymentStatus") as string;
      return (
        <Badge className={paymentStatusColors[status]}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "bookingDate",
    header: "Booking Date",
    cell: ({ row }) => new Date(row.getValue("bookingDate")).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const booking = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/bookings/${booking.id}`}>
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
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function BookingsPage() {
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">
            Manage property bookings and reservations
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        searchKey="bookingNumber"
        searchPlaceholder="Search by booking number..."
        totalItems={bookings.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
