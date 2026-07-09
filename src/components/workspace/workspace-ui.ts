import { cn } from "@/lib/utils";

/** Elevated surface for panels nested inside AccountWorkspace tab content. */
export const workspacePanelSurface =
  "rounded-xl border border-border/80 bg-card shadow-sm";

export const workspacePanelHeader =
  "border-b border-border/60 px-4 py-3.5 sm:px-5";

export const workspacePanelBody = "space-y-4 px-4 py-4 sm:px-5";

/** Grouped content blocks inside a workspace panel. */
export const workspaceSectionSurface = cn(
  "rounded-lg border border-border/80 bg-muted/25 p-3 shadow-sm sm:p-4",
);

/** List containers (devices, history, members, etc.). */
export const workspaceListSurface = cn(
  "overflow-hidden rounded-lg border border-border/80 bg-background/70 shadow-sm divide-y divide-border/60",
);

export const workspaceListRow = "bg-card px-4 py-3";

/** Empty / placeholder states. */
export const workspaceEmptyState = cn(
  "rounded-lg border border-dashed border-muted-foreground/35 bg-background/70 p-4 text-center",
);

/** Info / alert callouts inside workspace panels. */
export const workspaceAlertBanner = cn(
  "flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm",
);
