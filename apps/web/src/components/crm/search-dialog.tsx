"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, ArrowRight, User, Building2, TrendingUp, FileText } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "lead" | "contact" | "account" | "opportunity";
  href: string;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const searchItems: SearchResult[] = [
    { id: "1", title: "John Smith", subtitle: "Lead - Premium Apartments", type: "lead", href: "/leads/1" },
    { id: "2", title: "Sarah Johnson", subtitle: "Contact - ABC Corp", type: "contact", href: "/contacts/2" },
    { id: "3", title: "ABC Corporation", subtitle: "Account - Enterprise", type: "account", href: "/accounts/3" },
    { id: "4", title: "Premium Tower Project", subtitle: "Opportunity - ₹2.5Cr", type: "opportunity", href: "/opportunities/4" },
  ];

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const filtered = searchItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
      setIsLoading(false);
    }, 300);
  };

  const handleSelect = (href: string) => {
    router.push(href);
    onOpenChange(false);
    setQuery("");
    setResults([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "lead":
        return <User className="h-4 w-4" />;
      case "contact":
        return <User className="h-4 w-4" />;
      case "account":
        return <Building2 className="h-4 w-4" />;
      case "opportunity":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "lead":
        return "bg-blue-100 text-blue-800";
      case "contact":
        return "bg-green-100 text-green-800";
      case "account":
        return "bg-purple-100 text-purple-800";
      case "opportunity":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
        </DialogHeader>
        <div className="relative p-4 pt-0">
          <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads, contacts, accounts, opportunities..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-12"
            autoFocus
          />
        </div>
        {results.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto px-4 pb-4">
            <div className="space-y-1">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.href)}
                  className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-md", getTypeColor(result.type))}>
                      {getIcon(result.type)}
                    </div>
                    <div>
                      <p className="font-medium">{result.title}</p>
                      <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
        {query.length >= 2 && results.length === 0 && !isLoading && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No results found for &quot;{query}&quot;</p>
          </div>
        )}
        <div className="border-t p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">⌘K</Badge>
                Open
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">↑↓</Badge>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">↵</Badge>
                Select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">Esc</Badge>
              Close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
