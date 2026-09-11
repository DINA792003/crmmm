"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { LeadList, Lead } from "@/components/crm/lead-list";
import { Plus, Upload, Download } from "lucide-react";

const mockLeads: Lead[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phone: "+91 98765 43210",
    source: "Website",
    status: "new",
    priority: "high",
    assignedTo: "Rajesh Kumar",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.j@example.com",
    phone: "+91 98765 43211",
    source: "Referral",
    status: "contacted",
    priority: "medium",
    assignedTo: "Priya Sharma",
    createdAt: "2024-01-14T14:20:00Z",
    updatedAt: "2024-01-15T09:15:00Z",
  },
  {
    id: "3",
    firstName: "Raj",
    lastName: "Patel",
    email: "raj.patel@example.com",
    phone: "+91 98765 43212",
    source: "Cold Call",
    status: "qualified",
    priority: "low",
    assignedTo: "Amit Verma",
    createdAt: "2024-01-13T09:45:00Z",
    updatedAt: "2024-01-14T16:30:00Z",
  },
  {
    id: "4",
    firstName: "Priya",
    lastName: "Gupta",
    email: "priya.g@example.com",
    phone: "+91 98765 43213",
    source: "Social Media",
    status: "converted",
    priority: "high",
    assignedTo: "Rajesh Kumar",
    createdAt: "2024-01-12T11:00:00Z",
    updatedAt: "2024-01-15T08:45:00Z",
  },
  {
    id: "5",
    firstName: "Amit",
    lastName: "Singh",
    email: "amit.s@example.com",
    phone: "+91 98765 43214",
    source: "Advertisement",
    status: "new",
    priority: "medium",
    assignedTo: "Priya Sharma",
    createdAt: "2024-01-11T15:30:00Z",
    updatedAt: "2024-01-11T15:30:00Z",
  },
];

export default function LeadsPage() {
  const [leads, setLeads] = React.useState<Lead[]>(mockLeads);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Manage your leads and track their progress
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
            Add Lead
          </Button>
        </div>
      </div>

      <LeadList
        leads={leads}
        isLoading={isLoading}
        totalItems={leads.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
