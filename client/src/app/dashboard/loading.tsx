export default function DashboardLoading() {
  return (
    <div className="h-full flex items-center justify-center animate-page-in">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-border" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-accent animate-spin-slow" />
        </div>
        {/* Loading text */}
        <p className="text-sm text-muted animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
