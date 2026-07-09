import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  workspacePanelBody,
  workspacePanelHeader,
  workspacePanelSurface,
} from "@/components/workspace/workspace-ui";

interface WorkspacePanelProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  headerAction?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function WorkspacePanel({
  title,
  description,
  icon: Icon,
  headerAction,
  children,
  className,
  bodyClassName,
}: WorkspacePanelProps) {
  return (
    <section className={cn(workspacePanelSurface, className)}>
      <div className={workspacePanelHeader}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
            ) : null}
            <div className="min-w-0 space-y-1">
              <h3 className="text-base font-semibold leading-tight text-foreground">
                {title}
              </h3>
              {description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {headerAction ? (
            <div className="shrink-0">{headerAction}</div>
          ) : null}
        </div>
      </div>
      {children !== undefined && children !== null ? (
        <div className={cn(workspacePanelBody, bodyClassName)}>{children}</div>
      ) : null}
    </section>
  );
}
