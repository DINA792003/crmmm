import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    tenantSlug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    tenantSlug?: string | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    tenantSlug?: string | undefined;
}>;
export declare const changePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>;
export declare const leadSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodString;
    source: z.ZodDefault<z.ZodEnum<["WEBSITE", "REFERRAL", "COLD_CALL", "ADVERTISEMENT", "WALK_IN", "PORTAL", "SOCIAL_MEDIA", "OTHER"]>>;
    budget: z.ZodOptional<z.ZodNumber>;
    requirements: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    phone: string;
    source: "WEBSITE" | "REFERRAL" | "COLD_CALL" | "ADVERTISEMENT" | "WALK_IN" | "PORTAL" | "SOCIAL_MEDIA" | "OTHER";
    email?: string | undefined;
    lastName?: string | undefined;
    budget?: number | undefined;
    requirements?: string | undefined;
    notes?: string | undefined;
    ownerId?: string | undefined;
    projectId?: string | undefined;
}, {
    firstName: string;
    phone: string;
    email?: string | undefined;
    lastName?: string | undefined;
    source?: "WEBSITE" | "REFERRAL" | "COLD_CALL" | "ADVERTISEMENT" | "WALK_IN" | "PORTAL" | "SOCIAL_MEDIA" | "OTHER" | undefined;
    budget?: number | undefined;
    requirements?: string | undefined;
    notes?: string | undefined;
    ownerId?: string | undefined;
    projectId?: string | undefined;
}>;
export declare const contactSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodDefault<z.ZodBoolean>;
    notes: z.ZodOptional<z.ZodString>;
    leadId: z.ZodOptional<z.ZodString>;
    accountId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    phone: string;
    isPrimary: boolean;
    email?: string | undefined;
    lastName?: string | undefined;
    notes?: string | undefined;
    title?: string | undefined;
    department?: string | undefined;
    leadId?: string | undefined;
    accountId?: string | undefined;
}, {
    firstName: string;
    phone: string;
    email?: string | undefined;
    lastName?: string | undefined;
    notes?: string | undefined;
    title?: string | undefined;
    department?: string | undefined;
    isPrimary?: boolean | undefined;
    leadId?: string | undefined;
    accountId?: string | undefined;
}>;
export declare const accountSchema: z.ZodObject<{
    name: z.ZodString;
    industry: z.ZodOptional<z.ZodString>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    address: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
    industry?: string | undefined;
    website?: string | undefined;
    address?: string | undefined;
}, {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
    industry?: string | undefined;
    website?: string | undefined;
    address?: string | undefined;
}>;
export declare const customerSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    leadId: z.ZodOptional<z.ZodString>;
    accountId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    phone: string;
    email?: string | undefined;
    lastName?: string | undefined;
    notes?: string | undefined;
    leadId?: string | undefined;
    accountId?: string | undefined;
    address?: string | undefined;
}, {
    firstName: string;
    phone: string;
    email?: string | undefined;
    lastName?: string | undefined;
    notes?: string | undefined;
    leadId?: string | undefined;
    accountId?: string | undefined;
    address?: string | undefined;
}>;
export declare const siteVisitSchema: z.ZodObject<{
    leadId: z.ZodString;
    projectId: z.ZodOptional<z.ZodString>;
    assigneeId: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    leadId: string;
    scheduledAt: string;
    notes?: string | undefined;
    projectId?: string | undefined;
    assigneeId?: string | undefined;
}, {
    leadId: string;
    scheduledAt: string;
    notes?: string | undefined;
    projectId?: string | undefined;
    assigneeId?: string | undefined;
}>;
export declare const opportunitySchema: z.ZodObject<{
    name: z.ZodString;
    stage: z.ZodDefault<z.ZodEnum<["PROSPECTING", "QUALIFICATION", "NEEDS_ANALYSIS", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]>>;
    amount: z.ZodOptional<z.ZodNumber>;
    expectedCloseDate: z.ZodOptional<z.ZodString>;
    probability: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodString>;
    leadId: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    stage: "PROSPECTING" | "QUALIFICATION" | "NEEDS_ANALYSIS" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST";
    ownerId?: string | undefined;
    projectId?: string | undefined;
    leadId?: string | undefined;
    amount?: number | undefined;
    expectedCloseDate?: string | undefined;
    probability?: number | undefined;
    description?: string | undefined;
}, {
    name: string;
    ownerId?: string | undefined;
    projectId?: string | undefined;
    leadId?: string | undefined;
    stage?: "PROSPECTING" | "QUALIFICATION" | "NEEDS_ANALYSIS" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST" | undefined;
    amount?: number | undefined;
    expectedCloseDate?: string | undefined;
    probability?: number | undefined;
    description?: string | undefined;
}>;
export declare const quotationSchema: z.ZodObject<{
    opportunityId: z.ZodOptional<z.ZodString>;
    leadId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    totalAmount: z.ZodNumber;
    taxAmount: z.ZodOptional<z.ZodNumber>;
    discount: z.ZodOptional<z.ZodNumber>;
    validUntil: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        unitId: z.ZodOptional<z.ZodString>;
        description: z.ZodString;
        quantity: z.ZodDefault<z.ZodNumber>;
        unitPrice: z.ZodNumber;
        totalPrice: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        unitId?: string | undefined;
    }, {
        description: string;
        unitPrice: number;
        totalPrice: number;
        unitId?: string | undefined;
        quantity?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    totalAmount: number;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        unitId?: string | undefined;
    }[];
    notes?: string | undefined;
    projectId?: string | undefined;
    leadId?: string | undefined;
    opportunityId?: string | undefined;
    taxAmount?: number | undefined;
    discount?: number | undefined;
    validUntil?: string | undefined;
}, {
    totalAmount: number;
    items: {
        description: string;
        unitPrice: number;
        totalPrice: number;
        unitId?: string | undefined;
        quantity?: number | undefined;
    }[];
    notes?: string | undefined;
    projectId?: string | undefined;
    leadId?: string | undefined;
    opportunityId?: string | undefined;
    taxAmount?: number | undefined;
    discount?: number | undefined;
    validUntil?: string | undefined;
}>;
export declare const bookingSchema: z.ZodObject<{
    leadId: z.ZodOptional<z.ZodString>;
    opportunityId: z.ZodOptional<z.ZodString>;
    quotationId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodString;
    unitId: z.ZodString;
    customerId: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodString>;
    totalAmount: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    totalAmount: number;
    unitId: string;
    notes?: string | undefined;
    ownerId?: string | undefined;
    leadId?: string | undefined;
    opportunityId?: string | undefined;
    quotationId?: string | undefined;
    customerId?: string | undefined;
}, {
    projectId: string;
    totalAmount: number;
    unitId: string;
    notes?: string | undefined;
    ownerId?: string | undefined;
    leadId?: string | undefined;
    opportunityId?: string | undefined;
    quotationId?: string | undefined;
    customerId?: string | undefined;
}>;
export declare const paymentSchema: z.ZodObject<{
    bookingId: z.ZodString;
    customerId: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    reference: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    bookingId: string;
    notes?: string | undefined;
    customerId?: string | undefined;
    reference?: string | undefined;
}, {
    amount: number;
    bookingId: string;
    notes?: string | undefined;
    customerId?: string | undefined;
    reference?: string | undefined;
}>;
export declare const projectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
    totalUnits: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    address?: string | undefined;
    description?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    totalUnits?: number | undefined;
}, {
    name: string;
    address?: string | undefined;
    description?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    totalUnits?: number | undefined;
}>;
export declare const unitSchema: z.ZodObject<{
    projectId: z.ZodString;
    number: z.ZodString;
    type: z.ZodOptional<z.ZodString>;
    floor: z.ZodOptional<z.ZodNumber>;
    area: z.ZodOptional<z.ZodNumber>;
    price: z.ZodOptional<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["AVAILABLE", "HOLD", "RESERVED", "BOOKED", "SOLD", "BLOCKED"]>>;
}, "strip", z.ZodTypeAny, {
    number: string;
    status: "AVAILABLE" | "HOLD" | "RESERVED" | "BOOKED" | "SOLD" | "BLOCKED";
    projectId: string;
    type?: string | undefined;
    floor?: number | undefined;
    area?: number | undefined;
    price?: number | undefined;
}, {
    number: string;
    projectId: string;
    type?: string | undefined;
    status?: "AVAILABLE" | "HOLD" | "RESERVED" | "BOOKED" | "SOLD" | "BLOCKED" | undefined;
    floor?: number | undefined;
    area?: number | undefined;
    price?: number | undefined;
}>;
export declare const taskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]>>;
    priority: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
    dueDate: z.ZodOptional<z.ZodString>;
    leadId: z.ZodOptional<z.ZodString>;
    siteVisitId: z.ZodOptional<z.ZodString>;
    opportunityId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    title: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    leadId?: string | undefined;
    description?: string | undefined;
    opportunityId?: string | undefined;
    dueDate?: string | undefined;
    siteVisitId?: string | undefined;
}, {
    title: string;
    status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | undefined;
    leadId?: string | undefined;
    description?: string | undefined;
    opportunityId?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    dueDate?: string | undefined;
    siteVisitId?: string | undefined;
}>;
export declare const followUpSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodString;
    leadId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    dueDate: string;
    leadId?: string | undefined;
    description?: string | undefined;
}, {
    title: string;
    dueDate: string;
    leadId?: string | undefined;
    description?: string | undefined;
}>;
export declare const activitySchema: z.ZodObject<{
    type: z.ZodEnum<["CALL", "MEETING", "WHATSAPP", "EMAIL", "SITE_VISIT", "NOTE", "TASK", "FOLLOW_UP", "SYSTEM"]>;
    subject: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
    leadId: z.ZodOptional<z.ZodString>;
    siteVisitId: z.ZodOptional<z.ZodString>;
    opportunityId: z.ZodOptional<z.ZodString>;
    bookingId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "CALL" | "MEETING" | "WHATSAPP" | "EMAIL" | "SITE_VISIT" | "NOTE" | "TASK" | "FOLLOW_UP" | "SYSTEM";
    subject: string;
    leadId?: string | undefined;
    description?: string | undefined;
    opportunityId?: string | undefined;
    bookingId?: string | undefined;
    dueDate?: string | undefined;
    siteVisitId?: string | undefined;
}, {
    type: "CALL" | "MEETING" | "WHATSAPP" | "EMAIL" | "SITE_VISIT" | "NOTE" | "TASK" | "FOLLOW_UP" | "SYSTEM";
    subject: string;
    leadId?: string | undefined;
    description?: string | undefined;
    opportunityId?: string | undefined;
    bookingId?: string | undefined;
    dueDate?: string | undefined;
    siteVisitId?: string | undefined;
}>;
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface AIChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolCalls?: any[];
    toolResults?: any[];
    createdAt: Date;
}
export interface AIConversation {
    id: string;
    title?: string;
    messages: AIChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}
export interface AIToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required: string[];
    };
}
export interface AIToolResult {
    tool: string;
    result: any;
    success: boolean;
    error?: string;
}
export interface MetricDefinition {
    name: string;
    description: string;
    source: string;
    dateField: string;
    calculation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    filters?: Record<string, any>;
}
export interface DashboardWidget {
    id: string;
    type: 'kpi' | 'metric' | 'chart' | 'table' | 'funnel' | 'leaderboard' | 'trend' | 'gauge';
    title: string;
    metric?: string;
    data?: any;
    config?: Record<string, any>;
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
}
export interface SearchResult {
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    url: string;
    tenantId: string;
}
export interface SearchFilters {
    types?: string[];
    dateRange?: {
        start: string;
        end: string;
    };
    status?: string[];
    owner?: string;
}
//# sourceMappingURL=index.d.ts.map