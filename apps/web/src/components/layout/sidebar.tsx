"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Contact,
  Building2,
  UserCheck,
  MapPin,
  TrendingUp,
  FileText,
  CalendarCheck,
  CreditCard,
  FolderKanban,
  CheckSquare,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  Bell,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "CRM",
    href: "#",
    icon: Users,
    items: [
      { title: "Leads", href: "/leads", icon: Contact },
      { title: "Contacts", href: "/contacts", icon: Contact },
      { title: "Accounts", href: "/accounts", icon: Building2 },
      { title: "Customers", href: "/customers", icon: UserCheck },
    ],
  },
  {
    title: "Sales",
    href: "#",
    icon: TrendingUp,
    items: [
      { title: "Site Visits", href: "/site-visits", icon: MapPin },
      { title: "Opportunities", href: "/opportunities", icon: TrendingUp },
      { title: "Quotations", href: "/quotations", icon: FileText },
      { title: "Bookings", href: "/bookings", icon: CalendarCheck },
      { title: "Payments", href: "/payments", icon: CreditCard },
    ],
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "Admin",
    href: "/admin",
    icon: Settings,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (item: NavItem) =>
    item.items?.some((child) => pathname === child.href);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">DCT</span>
            </div>
            <span className="font-bold text-lg">CRM</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)] py-4">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => (
              <div key={item.title}>
                {item.items ? (
                  <>
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isParentActive(item)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </span>
                      {expandedItems.includes(item.title) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {expandedItems.includes(item.title) && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.items.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                              isActive(child.href)
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
