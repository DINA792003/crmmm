"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Customer360, CustomerData } from "@/components/crm/customer-360";

const mockCustomerData: CustomerData = {
  id: "1",
  firstName: "Amit",
  lastName: "Singh",
  email: "amit.singh@example.com",
  phone: "+91 98765 43214",
  alternatePhone: "+91 98765 43219",
  companyName: "Singh Enterprises",
  gstNumber: "27AAPFU0939F1ZV",
  panNumber: "AAPFU0939F",
  type: "corporate",
  status: "vip",
  assignedTo: "Rajesh Kumar",
  createdAt: "2024-01-10T09:00:00Z",
  updatedAt: "2024-01-15T14:30:00Z",
  lastActivity: "2024-01-15T10:00:00Z",
  address: {
    street: "456 Business Park",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400002",
  },
  totalSpent: 2500000,
  totalBookings: 2,
  outstandingBalance: 500000,
};

export default function CustomerDetailPage() {
  const params = useParams();
  const [customer, setCustomer] = React.useState<CustomerData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCustomer(mockCustomerData);
      setIsLoading(false);
    }, 500);
  }, [params.id]);

  return (
    <div className="space-y-6">
      <Customer360 customer={customer!} isLoading={isLoading} />
    </div>
  );
}
