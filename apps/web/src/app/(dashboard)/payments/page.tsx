"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/crm/data-table";
import { Plus, Download, MoreHorizontal, Eye, Receipt } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  paymentNumber: string;
  customerName: string;
  bookingNumber: string;
  amount: number;
  method: "cash" | "cheque" | "online" | "emi";
  status: "pending" | "completed" | "failed" | "refunded";
  paymentDate: string;
  reference?: string;
}

const payments: Payment[] = [
  {
    id: "1",
    paymentNumber: "PAY-2024-001",
    customerName: "Neha Sharma",
    bookingNumber: "BK-2024-001",
    amount: 1500000,
    method: "online",
    status: "completed",
    paymentDate: "2024-01-15T10:00:00Z",
    reference: "TXN123456789",
  },
  {
    id: "2",
    paymentNumber: "PAY-2024-002",
    customerName: "Amit Singh",
    bookingNumber: "BK-2024-002",
    amount: 3000000,
    method: "cheque",
    status: "pending",
    paymentDate: "2024-01-14T14:30:00Z",
    reference: "CHQ987654",
  },
  {
    id: "3",
    paymentNumber: "PAY-2024-003",
    customerName: "Vikram Mehta",
    bookingNumber: "BK-2024-003",
    amount: 4500000,
    method: "emi",
    status: "completed",
    paymentDate: "2024-01-10T09:00:00Z",
    reference: "EMI-2024-001",
  },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

const methodColors: Record<string, string> = {
  cash: "bg-green-100 text-green-800",
  cheque: "bg-blue-100 text-blue-800",
  online: "bg-purple-100 text-purple-800",
  emi: "bg-orange-100 text-orange-800",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "paymentNumber",
    header: "Payment #",
    cell: ({ row }) => (
      <Link href={`/payments/${row.original.id}`} className="hover:underline font-medium">
        {row.getValue("paymentNumber")}
      </Link>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "bookingNumber",
    header: "Booking",
    cell: ({ row }) => (
      <Link href={`/bookings/${row.original.bookingNumber}`} className="hover:underline">
        {row.getValue("bookingNumber")}
      </Link>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.getValue("amount"))}</span>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => {
      const method = row.getValue("method") as string;
      return (
        <Badge className={methodColors[method]}>
          {method}
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
    accessorKey: "paymentDate",
    header: "Date",
    cell: ({ row }) => new Date(row.getValue("paymentDate")).toLocaleDateString(),
  },
  {
    accessorKey: "reference",
    header: "Reference",
    cell: ({ row }) => row.getValue("reference") || "-",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/payments/${payment.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Receipt className="mr-2 h-4 w-4" />
              Receipt
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">
            Track and manage all payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast({ title: "Export", description: "Export feature coming soon" })}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => toast({ title: "Record Payment", description: "Record payment form coming soon" })}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        searchKey="paymentNumber"
        searchPlaceholder="Search by payment number..."
        totalItems={payments.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
