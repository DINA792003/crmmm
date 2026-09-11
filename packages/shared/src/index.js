"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activitySchema = exports.followUpSchema = exports.taskSchema = exports.unitSchema = exports.projectSchema = exports.paymentSchema = exports.bookingSchema = exports.quotationSchema = exports.opportunitySchema = exports.siteVisitSchema = exports.customerSchema = exports.accountSchema = exports.contactSchema = exports.leadSchema = exports.changePasswordSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// ============================================
// AUTH SCHEMAS
// ============================================
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    phone: zod_1.z.string().optional(),
    tenantSlug: zod_1.z.string().optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(6),
    newPassword: zod_1.z.string().min(8),
    confirmPassword: zod_1.z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
// ============================================
// CRM SCHEMAS
// ============================================
exports.leadSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().min(10, 'Phone number is required'),
    source: zod_1.z.enum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'ADVERTISEMENT', 'WALK_IN', 'PORTAL', 'SOCIAL_MEDIA', 'OTHER']).default('OTHER'),
    budget: zod_1.z.number().optional(),
    requirements: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    ownerId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
});
exports.contactSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().min(10),
    title: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    isPrimary: zod_1.z.boolean().default(false),
    notes: zod_1.z.string().optional(),
    leadId: zod_1.z.string().optional(),
    accountId: zod_1.z.string().optional(),
});
exports.accountSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    industry: zod_1.z.string().optional(),
    website: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.customerSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().min(10),
    address: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    leadId: zod_1.z.string().optional(),
    accountId: zod_1.z.string().optional(),
});
exports.siteVisitSchema = zod_1.z.object({
    leadId: zod_1.z.string().min(1),
    projectId: zod_1.z.string().optional(),
    assigneeId: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().datetime(),
    notes: zod_1.z.string().optional(),
});
exports.opportunitySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    stage: zod_1.z.enum(['PROSPECTING', 'QUALIFICATION', 'NEEDS_ANALYSIS', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).default('PROSPECTING'),
    amount: zod_1.z.number().optional(),
    expectedCloseDate: zod_1.z.string().optional(),
    probability: zod_1.z.number().min(0).max(100).optional(),
    description: zod_1.z.string().optional(),
    leadId: zod_1.z.string().optional(),
    ownerId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
});
exports.quotationSchema = zod_1.z.object({
    opportunityId: zod_1.z.string().optional(),
    leadId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
    totalAmount: zod_1.z.number().min(0),
    taxAmount: zod_1.z.number().optional(),
    discount: zod_1.z.number().optional(),
    validUntil: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        unitId: zod_1.z.string().optional(),
        description: zod_1.z.string().min(1),
        quantity: zod_1.z.number().min(1).default(1),
        unitPrice: zod_1.z.number().min(0),
        totalPrice: zod_1.z.number().min(0),
    })),
});
exports.bookingSchema = zod_1.z.object({
    leadId: zod_1.z.string().optional(),
    opportunityId: zod_1.z.string().optional(),
    quotationId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().min(1),
    unitId: zod_1.z.string().min(1),
    customerId: zod_1.z.string().optional(),
    ownerId: zod_1.z.string().optional(),
    totalAmount: zod_1.z.number().min(0),
    notes: zod_1.z.string().optional(),
});
exports.paymentSchema = zod_1.z.object({
    bookingId: zod_1.z.string().min(1),
    customerId: zod_1.z.string().optional(),
    amount: zod_1.z.number().min(0.01),
    reference: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.projectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    zipCode: zod_1.z.string().optional(),
    totalUnits: zod_1.z.number().optional(),
});
exports.unitSchema = zod_1.z.object({
    projectId: zod_1.z.string().min(1),
    number: zod_1.z.string().min(1),
    type: zod_1.z.string().optional(),
    floor: zod_1.z.number().optional(),
    area: zod_1.z.number().optional(),
    price: zod_1.z.number().optional(),
    status: zod_1.z.enum(['AVAILABLE', 'HOLD', 'RESERVED', 'BOOKED', 'SOLD', 'BLOCKED']).default('AVAILABLE'),
});
exports.taskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    dueDate: zod_1.z.string().optional(),
    leadId: zod_1.z.string().optional(),
    siteVisitId: zod_1.z.string().optional(),
    opportunityId: zod_1.z.string().optional(),
});
exports.followUpSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().min(1),
    leadId: zod_1.z.string().optional(),
});
exports.activitySchema = zod_1.z.object({
    type: zod_1.z.enum(['CALL', 'MEETING', 'WHATSAPP', 'EMAIL', 'SITE_VISIT', 'NOTE', 'TASK', 'FOLLOW_UP', 'SYSTEM']),
    subject: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().optional(),
    leadId: zod_1.z.string().optional(),
    siteVisitId: zod_1.z.string().optional(),
    opportunityId: zod_1.z.string().optional(),
    bookingId: zod_1.z.string().optional(),
});
//# sourceMappingURL=index.js.map