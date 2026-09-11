"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { LeadDetail, LeadData } from "@/components/crm/lead-detail";

const mockLeadData: LeadData = {
  id: "1",
  firstName: "John",
  lastName: "Smith",
  email: "john.smith@example.com",
  phone: "+91 98765 43210",
  alternatePhone: "+91 98765 43215",
  source: "Website",
  status: "qualified",
  priority: "high",
  assignedTo: "Rajesh Kumar",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T14:45:00Z",
  notes: "Interested in premium apartments. Looking for 3BHK with city view. Budget around ₹1.5 Cr. Prefers high floor.",
  address: {
    street: "123 MG Road",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
  },
};

export default function LeadDetailPage() {
  const params = useParams();
  const [lead, setLead] = React.useState<LeadData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLead(mockLeadData);
      setIsLoading(false);
    }, 500);
  }, [params.id]);

  return (
    <div className="space-y-6">
      <LeadDetail lead={lead!} isLoading={isLoading} />
    </div>
  );
}
