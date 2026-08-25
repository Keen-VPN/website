import { Bell, ChevronDown, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface DashboardTopBarProps {
  title: string;
  onOpenNav?: () => void;
}

export default function DashboardTopBar({
  title,
  onOpenNav,
}: DashboardTopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e7edf5] bg-white px-4 shadow-[0px_2px_6px_rgba(15,32,64,0.02)] sm:h-[69px] sm:gap-4 sm:px-6 lg:px-7">
      <button
        type="button"
        onClick={onOpenNav}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[#e7edf5] text-[#0f2040] transition-colors hover:bg-[#f5f7fb] lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <p className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.43px] text-[#0f2040] sm:text-[20px]">
        {title}
      </p>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => navigate("/downloads")}
          className="hidden h-9 items-center gap-1.5 rounded-[8px] border border-[#dbe2ec] bg-white px-4 text-[13px] font-semibold text-[#43516a] transition-colors hover:bg-[#f5f7fb] sm:flex"
        >
          Download apps
          <ChevronDown className="h-3 w-3" />
        </button>

        <Button
          onClick={() => navigate("/subscription")}
          className="h-9 rounded-[8px] bg-[#0f2040] px-3 text-[12px] font-semibold text-white hover:bg-[#0f2040]/90 sm:px-4 sm:text-[13px]"
        >
          <span className="sm:hidden">Upgrade</span>
          <span className="hidden sm:inline">Upgrade plan</span>
        </Button>

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#e7edf5] bg-white text-[#0f2040] transition-colors hover:bg-[#f5f7fb] sm:h-10 sm:w-10"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 sm:h-[17px] sm:w-[15px]" />
          <span className="absolute right-[8px] top-[8px] h-[7px] w-[7px] rounded-full bg-[#ed7d36] sm:right-[9px] sm:top-[9px]" />
        </button>
      </div>
    </header>
  );
}
