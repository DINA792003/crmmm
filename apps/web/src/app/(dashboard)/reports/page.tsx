"use client";

import * as React from "react";
import Link from "next/link";
import { FileBarChart2, Folder, FolderOpen, Loader2, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReportView = "recent" | "createdByMe" | "private" | "public" | "all";
type FolderView = "all" | "createdByMe" | "sharedWithMe";

interface ReportFolder { id: string; name: string; description?: string | null; isShared: boolean; _count?: { reports: number }; }
interface Report { id: string; name: string; description?: string | null; type: string; objectName: string; isShared: boolean; createdBy: string; createdAt: string; folder?: { id: string; name: string } | null; }
interface ReportType { name: string; label: string; category: string; fields: { key: string; label: string; type: string }[]; }

const viewLabels: Record<ReportView, string> = { recent: "Recent", createdByMe: "Created by Me", private: "Private Reports", public: "Public Reports", all: "All Reports" };

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Authentication required");
  }
  const text = await response.text();
  let data: { success?: boolean; data?: T; error?: string; message?: string } = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `Request failed (${response.status})`);
  }
  if (!response.ok || !data.success) throw new Error(data.error || data.message || "Request failed");
  return data.data as T;
}

export default function ReportsPage() {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [folders, setFolders] = React.useState<ReportFolder[]>([]);
  const [view, setView] = React.useState<ReportView>("recent");
  const [folderView, setFolderView] = React.useState<FolderView>("all");
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const [movingReport, setMovingReport] = React.useState<Report | null>(null);
  const [showFolderModal, setShowFolderModal] = React.useState(false);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");
  const [folderDescription, setFolderDescription] = React.useState("");
  const [folderShared, setFolderShared] = React.useState(false);
  const [savingFolder, setSavingFolder] = React.useState(false);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [reportTypes, setReportTypes] = React.useState<ReportType[]>([]);
  const [reportTypeCategory, setReportTypeCategory] = React.useState("All");
  const [reportTypeSearch, setReportTypeSearch] = React.useState("");
  const [loadingReportTypes, setLoadingReportTypes] = React.useState(false);

  const openCreateModal = async () => {
    setShowCreateModal(true);
    if (reportTypes.length > 0) return;
    try {
      setLoadingReportTypes(true);
      const response = await fetch("/api/proxy/api/reports/metadata", { cache: "no-store" });
      const data = await readResponse<{ objects?: ReportType[] } | ReportType[]>(response);
      const types = Array.isArray(data) ? data : data.objects || [];
      setReportTypes(types);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to load report types");
    } finally {
      setLoadingReportTypes(false);
    }
  };

  const reportCategories = ["Recently Used", "All", ...Array.from(new Set(reportTypes.map((type) => type.category)))];
  const visibleReportTypes = reportTypes.filter((type) => {
    const matchesCategory = reportTypeCategory === "All" || reportTypeCategory === "Recently Used" || type.category === reportTypeCategory;
    const query = reportTypeSearch.trim().toLowerCase();
    return matchesCategory && (!query || type.label.toLowerCase().includes(query) || type.name.toLowerCase().includes(query));
  });

  const loadReports = React.useCallback(async () => {
    try {
      setLoading(true); setError("");
      const params = new URLSearchParams({ view, limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      const data = await readResponse<Report[]>(await fetch(`/api/proxy/api/reports?${params}`, { cache: "no-store" }));
      setReports(Array.isArray(data) ? data : []);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load reports"); setReports([]); }
    finally { setLoading(false); }
  }, [search, selectedFolderId, view]);

  const loadFolders = React.useCallback(async () => {
    try {
      const data = await readResponse<ReportFolder[]>(await fetch(`/api/proxy/api/report-folders?view=${folderView}`, { cache: "no-store" }));
      setFolders(Array.isArray(data) ? data : []);
    } catch { setFolders([]); }
  }, [folderView]);

  React.useEffect(() => { const timer = window.setTimeout(() => void loadReports(), 200); return () => window.clearTimeout(timer); }, [loadReports]);
  React.useEffect(() => { void loadFolders(); }, [loadFolders]);
  React.useEffect(() => { const close = () => setActiveMenu(null); window.addEventListener("click", close); return () => window.removeEventListener("click", close); }, []);

  const deleteReport = async (report: Report) => {
    if (!window.confirm(`Delete "${report.name}"?`)) return;
    try { await readResponse(await fetch(`/api/proxy/api/reports/${report.id}`, { method: "DELETE" })); setReports((current) => current.filter((item) => item.id !== report.id)); void loadFolders(); }
    catch (err) { window.alert(err instanceof Error ? err.message : "Unable to delete report"); }
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;
    try {
      setSavingFolder(true);
      await readResponse(await fetch("/api/proxy/api/report-folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: folderName.trim(), description: folderDescription.trim() || null, isShared: folderShared }) }));
      setFolderName(""); setFolderDescription(""); setFolderShared(false); setShowFolderModal(false); void loadFolders();
    } catch (err) { window.alert(err instanceof Error ? err.message : "Unable to create folder"); }
    finally { setSavingFolder(false); }
  };

  const moveReport = async (folderId: string | null) => {
    if (!movingReport) return;
    try {
      await readResponse(await fetch(`/api/proxy/api/reports/${movingReport.id}/move`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderId }) }));
      setShowMoveModal(false); setMovingReport(null); void loadReports(); void loadFolders();
    } catch (err) { window.alert(err instanceof Error ? err.message : "Unable to move report"); }
  };

  const sidebarButton = (active: boolean) => `flex w-full items-center gap-2 border-l-4 px-4 py-2.5 text-left text-sm transition ${active ? "border-primary bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted"}`;
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

  return <div className="space-y-4">
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm text-muted-foreground">Reports</p><h1 className="text-2xl font-bold tracking-tight">{viewLabels[view]}</h1><p className="mt-1 text-xs text-muted-foreground">{reports.length} {reports.length === 1 ? "item" : "items"}</p></div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1 lg:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports..." className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-4 w-4" /></button>}</div>
        <Button onClick={() => void openCreateModal()}><Plus className="mr-2 h-4 w-4" />New Report</Button><Button variant="outline" onClick={() => setShowFolderModal(true)}><Folder className="mr-2 h-4 w-4" />New Folder</Button>
      </div>
    </div>

    <div className="flex min-h-[620px] overflow-hidden rounded-lg border bg-card shadow-sm">
      <aside className="hidden w-56 shrink-0 border-r py-4 md:block"><NavHeading label="Reports" />{(Object.keys(viewLabels) as ReportView[]).slice(0, 5).map((item) => <button key={item} className={sidebarButton(view === item && !selectedFolderId)} onClick={() => { setSelectedFolderId(null); setView(item); }}>{viewLabels[item]}</button>)}<NavHeading label="Folders" />{(["all", "createdByMe", "sharedWithMe"] as FolderView[]).map((item) => <button key={item} className={sidebarButton(folderView === item)} onClick={() => { setSelectedFolderId(null); setFolderView(item); }}>{item === "all" ? "All Folders" : item === "createdByMe" ? "Created by Me" : "Shared with Me"}</button>)}{folders.slice(0, 5).map((folder) => <button key={folder.id} className={sidebarButton(selectedFolderId === folder.id)} onClick={() => { setSelectedFolderId(folder.id); setView("all"); setSearch(""); }}><FolderOpen className="h-4 w-4" />{folder.name}</button>)}</aside>
      <main className="min-w-0 flex-1">{error && <div className="m-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b bg-muted/50 text-muted-foreground"><th className="px-4 py-3 font-semibold">Report Name</th><th className="px-4 py-3 font-semibold">Description</th><th className="px-4 py-3 font-semibold">Folder</th><th className="px-4 py-3 font-semibold">Created By</th><th className="px-4 py-3 font-semibold">Created On</th><th className="w-16 px-4 py-3" /></tr></thead><tbody>
        {loading && <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading reports...</td></tr>}
        {!loading && reports.length === 0 && <tr><td colSpan={6} className="px-4 py-16 text-center"><FileBarChart2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" /><p className="font-medium">{search ? "No reports match your search." : "No reports found."}</p></td></tr>}
        {!loading && reports.map((report) => <tr key={report.id} className="border-b transition hover:bg-muted/40"><td className="px-4 py-3"><Link href={`/reports/${report.id}`} className="font-medium text-primary hover:underline">{report.name}</Link></td><td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">{report.description || `${report.objectName} ${report.type} report`}</td><td className="px-4 py-3">{report.folder ? <span className="flex items-center gap-2 text-primary"><FolderOpen className="h-4 w-4" />{report.folder.name}</span> : <span className="text-muted-foreground">-</span>}</td><td className="px-4 py-3 text-primary">{report.createdBy}</td><td className="px-4 py-3 text-muted-foreground">{formatDate(report.createdAt)}</td><td className="relative px-4 py-3"><button type="button" aria-label={`Actions for ${report.name}`} onClick={(event) => { event.stopPropagation(); setActiveMenu(activeMenu === report.id ? null : report.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>{activeMenu === report.id && <div onClick={(event) => event.stopPropagation()} className="absolute right-4 top-11 z-20 w-48 rounded-md border bg-popover py-1 shadow-lg"><MenuItem label="Run" onClick={() => window.location.assign(`/reports/${report.id}`)} /><MenuItem label="Edit" onClick={() => window.location.assign(`/reports/${report.id}/edit`)} /><MenuItem label="Export" onClick={() => window.open(`/api/proxy/api/reports/${report.id}/export`, "_blank")} /><MenuItem label="Delete" danger onClick={() => void deleteReport(report)} /><MenuItem label="Add to Dashboard" disabled onClick={() => undefined} /><MenuItem label="Move" onClick={() => { setMovingReport(report); setShowMoveModal(true); }} /></div>}</td></tr>)}
      </tbody></table></div></main>
    </div>

    {showFolderModal && <Modal title="New Report Folder" onClose={() => setShowFolderModal(false)}><div className="space-y-4"><Field label="Folder Name"><input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="field" placeholder="Sales Reports" /></Field><Field label="Description"><textarea value={folderDescription} onChange={(event) => setFolderDescription(event.target.value)} className="field min-h-20 py-2" /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={folderShared} onChange={(event) => setFolderShared(event.target.checked)} />Share this folder</label><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowFolderModal(false)}>Cancel</Button><Button disabled={savingFolder} onClick={() => void createFolder()}>{savingFolder ? "Saving..." : "Save"}</Button></div></div></Modal>}
    {showMoveModal && movingReport && <Modal title={`Move "${movingReport.name}"`} onClose={() => { setShowMoveModal(false); setMovingReport(null); }}><div className="space-y-2"><button className="flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm hover:bg-muted" onClick={() => void moveReport(null)}><Folder className="h-4 w-4" />No Folder</button>{folders.map((folder) => <button key={folder.id} className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-muted" onClick={() => void moveReport(folder.id)}><span className="flex items-center gap-3"><FolderOpen className="h-4 w-4 text-primary" />{folder.name}</span><span className="text-xs text-muted-foreground">{folder._count?.reports || 0}</span></button>)}</div></Modal>}
    {showCreateModal && <CreateReportModal categories={reportCategories} selectedCategory={reportTypeCategory} onCategoryChange={setReportTypeCategory} search={reportTypeSearch} onSearchChange={setReportTypeSearch} reportTypes={visibleReportTypes} loading={loadingReportTypes} onClose={() => setShowCreateModal(false)} />}
  </div>;
}

function NavHeading({ label }: { label: string }) { return <p className="mb-2 mt-5 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">{label}</p>; }
function MenuItem({ label, onClick, danger = false, disabled = false }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) { return <button type="button" disabled={disabled} className={`block w-full px-4 py-2.5 text-left text-sm ${disabled ? "cursor-not-allowed text-muted-foreground/50" : `hover:bg-muted ${danger ? "text-destructive" : ""}`}`} onClick={onClick}>{label}{disabled && <span className="ml-2 text-xs">Soon</span>}</button>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-1 block text-sm font-medium">{label}</label>{children}</div>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-lg rounded-lg bg-card shadow-xl"><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button></div><div className="p-5">{children}</div></div></div>; }
function CreateReportModal({ categories, selectedCategory, onCategoryChange, search, onSearchChange, reportTypes, loading, onClose }: { categories: string[]; selectedCategory: string; onCategoryChange: (category: string) => void; search: string; onSearchChange: (value: string) => void; reportTypes: ReportType[]; loading: boolean; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="flex max-h-[min(680px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-card shadow-2xl"><div className="flex items-center justify-between border-b px-6 py-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reports</p><h2 className="text-xl font-semibold">Create Report</h2></div><button type="button" aria-label="Close" onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button></div><div className="grid min-h-0 flex-1 md:grid-cols-[190px_1fr]"><aside className="border-b bg-muted/30 p-3 md:border-b-0 md:border-r"><p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>{categories.map((category) => <button key={category} type="button" onClick={() => onCategoryChange(category)} className={`w-full rounded-md px-3 py-2 text-left text-sm ${selectedCategory === category ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`}>{category}</button>)}</aside><main className="min-h-0 overflow-y-auto p-5"><h3 className="text-lg font-semibold">Select a Report Type</h3><p className="mt-1 text-sm text-muted-foreground">Choose the data source for your report.</p><div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search Report Types..." className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></div><div className="mt-5 grid grid-cols-[1fr_120px] border-b px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span>Report Type Name</span><span>Category</span></div>{loading ? <div className="flex items-center justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading report types...</div> : reportTypes.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">No report types found.</div> : reportTypes.map((type) => <Link key={type.name} href={`/reports/new?object=${encodeURIComponent(type.name)}`} onClick={onClose} className="grid grid-cols-[1fr_120px] items-center border-b px-3 py-3 text-sm transition hover:bg-muted"><span className="font-medium text-primary">{type.label}</span><span className="text-muted-foreground">{type.category}</span></Link>)}</main></div></div></div>;
}