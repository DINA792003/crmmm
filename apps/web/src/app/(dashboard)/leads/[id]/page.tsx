"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { leadApi, siteVisitApi, opportunityApi, activityApi, taskApi, followUpApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckSquare,
  Clock,
  Map,
  TrendingUp,
  History,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  INCOMING: "Incoming",
  PROSPECT: "Prospect",
  SITE_VISIT_SCHEDULED: "Site Visit Scheduled",
  SITE_VISIT_HAPPENED: "Site Visit Happened",
  SALES: "Sales",
  OPPORTUNITY: "Opportunity",
  QUOTATION: "Quotation",
  APPROVAL: "Approval",
  BOOKING: "Booking",
  DUPLICATE: "Duplicate",
  LOST: "Lost",
  BOOKED: "Booked",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  NEW: "info",
  INCOMING: "info",
  PROSPECT: "warning",
  SITE_VISIT_SCHEDULED: "warning",
  SITE_VISIT_HAPPENED: "success",
  SALES: "default",
  OPPORTUNITY: "success",
  QUOTATION: "default",
  APPROVAL: "secondary",
  BOOKING: "success",
  DUPLICATE: "secondary",
  LOST: "destructive",
  BOOKED: "success",
};

const WORKFLOW_STAGES = [
  { key: "Campaign", statuses: ["NEW", "INCOMING"] },
  { key: "Lead Generation", statuses: ["NEW"] },
  { key: "Lead Capture", statuses: ["NEW", "INCOMING"] },
  { key: "Lead Assignment", statuses: ["INCOMING"] },
  { key: "Presales", statuses: ["INCOMING", "PROSPECT"] },
  { key: "Requirements", statuses: ["PROSPECT"] },
  { key: "Qualification", statuses: ["PROSPECT"] },
  { key: "Site Visit", statuses: ["SITE_VISIT_SCHEDULED", "SITE_VISIT_HAPPENED"] },
  { key: "Sales", statuses: ["SALES", "SITE_VISIT_HAPPENED"] },
  { key: "Opportunity", statuses: ["OPPORTUNITY", "QUOTATION"] },
  { key: "Booking", statuses: ["BOOKING", "APPROVAL"] },
  { key: "Payment", statuses: ["BOOKED"] },
  { key: "Finance", statuses: ["BOOKED"] },
];

const RECOVERY_REASONS = [
  "Not Interested",
  "Budget Issue",
  "No Response",
  "Property Not Suitable",
  "Customer Request",
  "Other",
];

const STATUS_ORDER = [
  "NEW", "INCOMING", "PROSPECT", "SITE_VISIT_SCHEDULED",
  "SITE_VISIT_HAPPENED", "SALES", "OPPORTUNITY", "QUOTATION",
  "APPROVAL", "BOOKING", "BOOKED",
];

interface LeadData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  source: string;
  status: string;
  budget?: number;
  requirements?: string;
  notes?: string;
  owner?: { id: string; firstName: string; lastName: string };
  creator?: { id: string; firstName: string; lastName: string };
  project?: { id: string; name: string };
  siteVisits?: any[];
  opportunities?: any[];
  activities?: any[];
  tasks?: any[];
  followUps?: any[];
  auditLogs?: any[];
  createdAt: string;
  updatedAt: string;
}

function getStatusIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : -1;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const leadId = params.id as string;

  const [lead, setLead] = React.useState<LeadData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [recoveryDialogOpen, setRecoveryDialogOpen] = React.useState(false);
  const [recoveryReason, setRecoveryReason] = React.useState("");
  const [recoveryNote, setRecoveryNote] = React.useState("");

  const fetchLead = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await leadApi.get(leadId);
      if (res.data.success && res.data.data) {
        setLead(res.data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load lead", variant: "destructive" as any });
    } finally {
      setIsLoading(false);
    }
  }, [leadId, toast]);

  React.useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const profileName = profile?.name?.toLowerCase() || "";
  const isAdminOrManager = profileName.includes("admin") || profileName.includes("manager");
  const isPresales = profileName.includes("presales");
  const isSVC = profileName.includes("svc") || profileName.includes("site visit");
  const isSales = profileName.includes("sales");
  const isCRM = profileName.includes("crm");
  const isFinance = profileName.includes("finance");
  const isRecovery = profileName.includes("recovery");

  const status = lead?.status || "";

  const handleAction = async (action: () => Promise<void>, label: string) => {
    setIsActionLoading(true);
    try {
      await action();
      await fetchLead();
    } catch {
      toast({ title: "Error", description: `${label} failed`, variant: "destructive" as any });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStatusUpdate = (newStatus: string) =>
    handleAction(async () => {
      await leadApi.updateStatus(leadId, newStatus);
      toast({ title: "Success", description: `Status updated to ${STATUS_LABELS[newStatus] || newStatus}` });
    }, "Status update");

  const handleReceiveLead = () => handleStatusUpdate("INCOMING");

  const handleRequestSiteVisit = () =>
    handleAction(async () => {
      await siteVisitApi.create({ leadId, status: "SCHEDULED" });
      await leadApi.updateStatus(leadId, "SITE_VISIT_SCHEDULED");
      toast({ title: "Success", description: "Site visit requested" });
    }, "Site visit request");

  const handleMarkVisitCompleted = () =>
    handleAction(async () => {
      await leadApi.updateStatus(leadId, "SITE_VISIT_HAPPENED");
      toast({ title: "Success", description: "Site visit marked as completed" });
    }, "Mark completed");

  const handleRescheduleVisit = () =>
    handleAction(async () => {
      await leadApi.updateStatus(leadId, "SITE_VISIT_SCHEDULED");
      toast({ title: "Success", description: "Visit rescheduled" });
    }, "Reschedule");

  const handleConvertLead = () =>
    handleAction(async () => {
      await opportunityApi.create({ leadId });
      await leadApi.updateStatus(leadId, "OPPORTUNITY");
      toast({ title: "Success", description: "Lead converted to opportunity" });
    }, "Convert lead");

  const handleCreateOpportunity = () =>
    handleAction(async () => {
      await opportunityApi.create({ leadId });
      toast({ title: "Success", description: "Opportunity created" });
    }, "Create opportunity");

  const handleCreateBooking = () =>
    handleAction(async () => {
      await leadApi.updateStatus(leadId, "BOOKING");
      toast({ title: "Success", description: "Booking created" });
    }, "Create booking");

  const handleMoveToRecovery = async () => {
    if (!recoveryReason) {
      toast({ title: "Validation", description: "Please select a reason", variant: "destructive" as any });
      return;
    }
    setIsActionLoading(true);
    try {
      await leadApi.recovery(leadId, { recoveryReason, note: recoveryNote || undefined });
      toast({ title: "Success", description: "Lead moved to recovery" });
      setRecoveryDialogOpen(false);
      setRecoveryReason("");
      setRecoveryNote("");
      await fetchLead();
    } catch {
      toast({ title: "Error", description: "Failed to move to recovery", variant: "destructive" as any });
    } finally {
      setIsActionLoading(false);
    }
  };

  const getWorkflowActions = (): { label: string; onClick: () => void; variant?: "default" | "outline" | "destructive" | "secondary" }[] => {
    const actions: { label: string; onClick: () => void; variant?: "default" | "outline" | "destructive" | "secondary" }[] = [];

    const canAct = (roleCheck: boolean, statuses: string[]) =>
      (isAdminOrManager || roleCheck) && statuses.includes(status);

    if (canAct(isPresales, ["NEW", "INCOMING"])) {
      if (status === "NEW") actions.push({ label: "Receive Lead", onClick: handleReceiveLead, variant: "default" });
      actions.push({ label: "Add Requirement", onClick: () => toast({ title: "Info", description: "Requirement form would open" }), variant: "outline" });
      actions.push({ label: "Add Follow-up", onClick: () => toast({ title: "Info", description: "Follow-up form would open" }), variant: "outline" });
      actions.push({ label: "Move to Recovery", onClick: () => setRecoveryDialogOpen(true), variant: "destructive" });
    }

    if (canAct(isSVC, ["PROSPECT"])) {
      actions.push({ label: "Request Site Visit", onClick: handleRequestSiteVisit, variant: "default" });
      actions.push({ label: "Assign Executive", onClick: () => toast({ title: "Info", description: "Assign executive form would open" }), variant: "outline" });
      actions.push({ label: "Schedule Visit", onClick: handleRequestSiteVisit, variant: "outline" });
    }

    if (canAct(isSVC, ["SITE_VISIT_SCHEDULED"])) {
      actions.push({ label: "Mark Visit Completed", onClick: handleMarkVisitCompleted, variant: "default" });
      actions.push({ label: "Add Feedback", onClick: () => toast({ title: "Info", description: "Feedback form would open" }), variant: "outline" });
      actions.push({ label: "Reschedule Visit", onClick: handleRescheduleVisit, variant: "outline" });
      actions.push({ label: "Add Follow-up", onClick: () => toast({ title: "Info", description: "Follow-up form would open" }), variant: "outline" });
    }

    if (canAct(isSales, ["SITE_VISIT_SCHEDULED"])) {
      actions.push({ label: "View Lead", onClick: () => {}, variant: "outline" });
    }

    if (canAct(isSales, ["SITE_VISIT_HAPPENED"])) {
      actions.push({ label: "Convert Lead", onClick: handleConvertLead, variant: "default" });
      actions.push({ label: "Create Opportunity", onClick: handleCreateOpportunity, variant: "outline" });
      actions.push({ label: "Create Quotation", onClick: () => toast({ title: "Info", description: "Quotation form would open" }), variant: "outline" });
    }

    if (canAct(isCRM, ["SITE_VISIT_HAPPENED"])) {
      actions.push({ label: "Create Booking", onClick: handleCreateBooking, variant: "default" });
    }

    if (canAct(isCRM, ["BOOKED"])) {
      actions.push({ label: "View Booking", onClick: () => {}, variant: "outline" });
      actions.push({ label: "Add Payment", onClick: () => toast({ title: "Info", description: "Payment form would open" }), variant: "outline" });
      actions.push({ label: "Add Reminder", onClick: () => toast({ title: "Info", description: "Reminder form would open" }), variant: "outline" });
    }

    if (canAct(isFinance, ["BOOKED"])) {
      actions.push({ label: "Add Bank Details", onClick: () => toast({ title: "Info", description: "Bank details form would open" }), variant: "outline" });
      actions.push({ label: "Record Payment", onClick: () => toast({ title: "Info", description: "Record payment form would open" }), variant: "default" });
      actions.push({ label: "Verify Payment", onClick: () => toast({ title: "Info", description: "Verify payment form would open" }), variant: "outline" });
    }

    if (canAct(isRecovery, ["LOST"])) {
      actions.push({ label: "Add Recovery Follow-up", onClick: () => toast({ title: "Info", description: "Recovery follow-up form would open" }), variant: "default" });
      actions.push({ label: "Add Recovery Notes", onClick: () => toast({ title: "Info", description: "Recovery notes form would open" }), variant: "outline" });
    }

    return actions;
  };

  const workflowActions = getWorkflowActions();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Lead not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {WORKFLOW_STAGES.map((stage, idx) => {
              const stageMaxIdx = Math.max(...stage.statuses.map(s => getStatusIndex(s)));
              const leadIdx = getStatusIndex(status);
              const isCompleted = stageMaxIdx >= 0 && leadIdx > stageMaxIdx;
              const isCurrent = stage.statuses.includes(status);

              return (
                <React.Fragment key={stage.key}>
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                      isCompleted ? "bg-green-500 text-white" : isCurrent ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <ArrowRight className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </div>
                    <span className={`text-[10px] mt-1 text-center ${isCurrent ? "font-semibold text-blue-600" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                      {stage.key}
                    </span>
                  </div>
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <div className={`h-0.5 w-4 mt-[-12px] ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lead Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lead.firstName} {lead.lastName}</h1>
            <Badge variant={STATUS_VARIANT[STATUS_LABELS[status] ? status : "default"]}>
              {STATUS_LABELS[status] || status}
            </Badge>
          </div>
          <p className="text-muted-foreground">Lead #{lead.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {workflowActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant || "default"}
              size="sm"
              onClick={action.onClick}
              disabled={isActionLoading}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <User className="h-4 w-4" />Overview
          </TabsTrigger>
          <TabsTrigger value="activities" className="gap-2">
            <History className="h-4 w-4" />Activities
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare className="h-4 w-4" />Tasks
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-2">
            <Clock className="h-4 w-4" />Follow-ups
          </TabsTrigger>
          <TabsTrigger value="site-visits" className="gap-2">
            <Map className="h-4 w-4" />Site Visits
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-2">
            <TrendingUp className="h-4 w-4" />Opportunities
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.phone}</span>
                </div>
                {lead.alternatePhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{lead.alternatePhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Lead Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={STATUS_VARIANT[STATUS_LABELS[status] ? status : "default"]}>
                    {STATUS_LABELS[status] || status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Source</span>
                  <Badge variant="secondary">{lead.source}</Badge>
                </div>
                {lead.budget && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Budget</span>
                    <span className="text-sm font-medium">₹{lead.budget.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Owner</span>
                  <span className="text-sm font-medium">
                    {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : "Unassigned"}
                  </span>
                </div>
                {lead.project && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Project</span>
                    <span className="text-sm font-medium">{lead.project.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-xs text-muted-foreground">{new Date(lead.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {lead.creator && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Created By</p>
                      <p className="text-xs text-muted-foreground">{lead.creator.firstName} {lead.creator.lastName}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {lead.requirements && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{lead.requirements}</p>
              </CardContent>
            </Card>
          )}

          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {lead.activities && lead.activities.length > 0 ? (
                <div className="space-y-3">
                  {lead.activities.map((activity: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-left p-3 rounded-md bg-muted/50">
                      <History className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{activity.description || activity.type}</p>
                        <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activities recorded yet</p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {lead.tasks && lead.tasks.length > 0 ? (
                <div className="space-y-3">
                  {lead.tasks.map((task: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-left p-3 rounded-md bg-muted/50">
                      <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{task.title || task.name}</p>
                        <p className="text-xs text-muted-foreground">{task.status} {task.dueDate ? `- Due ${new Date(task.dueDate).toLocaleDateString()}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks assigned</p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {lead.followUps && lead.followUps.length > 0 ? (
                <div className="space-y-3">
                  {lead.followUps.map((fu: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-left p-3 rounded-md bg-muted/50">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{fu.description || fu.type}</p>
                        <p className="text-xs text-muted-foreground">{fu.scheduledAt ? new Date(fu.scheduledAt).toLocaleString() : fu.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No follow-ups scheduled</p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site Visits Tab */}
        <TabsContent value="site-visits">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {lead.siteVisits && lead.siteVisits.length > 0 ? (
                <div className="space-y-3">
                  {lead.siteVisits.map((sv: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-left p-3 rounded-md bg-muted/50">
                      <Map className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{sv.status || "Scheduled"}</p>
                        <p className="text-xs text-muted-foreground">{sv.scheduledAt ? new Date(sv.scheduledAt).toLocaleString() : sv.createdAt ? new Date(sv.createdAt).toLocaleString() : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No site visits scheduled</p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {lead.opportunities && lead.opportunities.length > 0 ? (
                <div className="space-y-3">
                  {lead.opportunities.map((opp: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-left p-3 rounded-md bg-muted/50">
                      <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{opp.name || opp.title || "Opportunity"}</p>
                        <p className="text-xs text-muted-foreground">{opp.stage || opp.status} {opp.amount ? `- ₹${opp.amount.toLocaleString()}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No opportunities created</p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Move to Recovery Dialog */}
      <Dialog open={recoveryDialogOpen} onOpenChange={setRecoveryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Lead to Recovery?</DialogTitle>
            <DialogDescription>
              This lead will be marked as Lost and moved to the Recovery workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="recovery-reason">Reason *</Label>
              <Select value={recoveryReason} onValueChange={setRecoveryReason}>
                <SelectTrigger id="recovery-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {RECOVERY_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-note">Note (optional)</Label>
              <Textarea
                id="recovery-note"
                placeholder="Add any additional notes..."
                value={recoveryNote}
                onChange={(e) => setRecoveryNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecoveryDialogOpen(false)} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleMoveToRecovery} disabled={isActionLoading}>
              {isActionLoading ? "Moving..." : "Move to Recovery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
