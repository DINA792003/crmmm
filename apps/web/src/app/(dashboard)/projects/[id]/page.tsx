"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Edit,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  Home,
  Store,
} from "lucide-react";

interface ProjectData {
  id: string;
  name: string;
  location: string;
  description: string;
  type: "residential" | "commercial" | "mixed";
  totalUnits: number;
  soldUnits: number;
  availableUnits: number;
  status: "planning" | "under-construction" | "completed";
  completionPercentage: number;
  startDate: string;
  expectedCompletion: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  floor: number;
  area: number;
  price: number;
  status: "available" | "booked" | "sold" | "reserved";
  customerName?: string;
}

const mockProject: ProjectData = {
  id: "1",
  name: "Premium Tower",
  location: "Mumbai, Maharashtra",
  description: "Premium residential tower with world-class amenities and stunning city views.",
  type: "residential",
  totalUnits: 200,
  soldUnits: 145,
  availableUnits: 55,
  status: "under-construction",
  completionPercentage: 65,
  startDate: "2023-06-01T00:00:00Z",
  expectedCompletion: "2025-12-31T00:00:00Z",
};

const mockUnits: Unit[] = [
  { id: "1", unitNumber: "101", type: "2BHK", floor: 1, area: 1200, price: 7500000, status: "sold", customerName: "John Smith" },
  { id: "2", unitNumber: "102", type: "2BHK", floor: 1, area: 1200, price: 7500000, status: "sold", customerName: "Jane Doe" },
  { id: "3", unitNumber: "103", type: "3BHK", floor: 1, area: 1800, price: 12000000, status: "available" },
  { id: "4", unitNumber: "201", type: "2BHK", floor: 2, area: 1200, price: 7800000, status: "booked", customerName: "Raj Patel" },
  { id: "5", unitNumber: "202", type: "3BHK", floor: 2, area: 1800, price: 12500000, status: "available" },
  { id: "6", unitNumber: "203", type: "3BHK", floor: 2, area: 1800, price: 12500000, status: "sold", customerName: "Priya Gupta" },
  { id: "7", unitNumber: "301", type: "2BHK", floor: 3, area: 1200, price: 8000000, status: "available" },
  { id: "8", unitNumber: "302", type: "3BHK", floor: 3, area: 1800, price: 13000000, status: "sold", customerName: "Amit Singh" },
];

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800 border-green-300",
  booked: "bg-yellow-100 text-yellow-800 border-yellow-300",
  sold: "bg-blue-100 text-blue-800 border-blue-300",
  reserved: "bg-purple-100 text-purple-800 border-purple-300",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = React.useState<ProjectData | null>(null);
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedFloor, setSelectedFloor] = React.useState<number | null>(null);

  React.useEffect(() => {
    setTimeout(() => {
      setProject(mockProject);
      setUnits(mockUnits);
      setIsLoading(false);
    }, 500);
  }, [params.id]);

  const floors = Array.from(new Set(units.map((u) => u.floor))).sort((a, b) => a - b);

  const filteredUnits = selectedFloor
    ? units.filter((u) => u.floor === selectedFloor)
    : units;

  const availableCount = units.filter((u) => u.status === "available").length;
  const bookedCount = units.filter((u) => u.status === "booked").length;
  const soldCount = units.filter((u) => u.status === "sold").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {project.location}
            </p>
          </div>
        </div>
        <Button onClick={() => toast({ title: "Edit Project", description: "Edit project form coming soon" })}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold">{project.totalUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Home className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{availableCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booked</p>
                <p className="text-2xl font-bold">{bookedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sold</p>
                <p className="text-2xl font-bold">{soldCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory" className="gap-2">
            <Building2 className="h-4 w-4" />
            Unit Inventory
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <Home className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter by Floor:</span>
            <Button
              variant={selectedFloor === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFloor(null)}
            >
              All
            </Button>
            {floors.map((floor) => (
              <Button
                key={floor}
                variant={selectedFloor === floor ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFloor(floor)}
              >
                Floor {floor}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {filteredUnits.map((unit) => (
              <Card
                key={unit.id}
                className={cn("border-2", statusColors[unit.status])}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg">{unit.unitNumber}</span>
                    <Badge className={statusColors[unit.status]}>
                      {unit.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>Type: {unit.type}</p>
                    <p>Floor: {unit.floor}</p>
                    <p>Area: {unit.area} sq ft</p>
                    <p className="font-medium">{formatCurrency(unit.price)}</p>
                    {unit.customerName && (
                      <p className="text-muted-foreground">
                        Customer: {unit.customerName}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{project.description}</p>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant="outline" className="capitalize">{project.type}</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="capitalize">{project.status.replace("-", " ")}</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p>{new Date(project.startDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Expected Completion</p>
                  <p>{new Date(project.expectedCompletion).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
