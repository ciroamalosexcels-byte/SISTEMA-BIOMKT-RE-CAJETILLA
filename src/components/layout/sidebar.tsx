"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/lib/constants";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 flex-wrap items-center p-2 rounded-[26px] bg-white/55 border border-white/45">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={[
              "px-[14px] py-[10px] rounded-[14px] text-[13px] font-bold border leading-[1.1] whitespace-nowrap transition-colors",
              isActive
                ? "bg-[var(--dark)] text-white border-[var(--dark)]"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
