import Sidebar from "@/components/Sidebar";
import VoiceControl from "@/components/VoiceControl";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";

export default function SistemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 sm:px-6 gap-3 flex-shrink-0 z-30"
          style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }}>
          {/* Spacer for mobile burger button */}
          <div className="w-8 lg:hidden" />

          {/* Global Search */}
          <div className="flex-1 flex items-center">
            <GlobalSearch />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <VoiceControl />
    </div>
  );
}
