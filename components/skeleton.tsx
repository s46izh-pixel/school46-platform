export function SkeletonBlock() {
  return (
    <div className="grid gap-3 rounded-[8px] border border-line bg-white p-4">
      <div className="h-4 w-24 animate-pulse rounded-[8px] bg-slate-200" />
      <div className="h-6 w-3/4 animate-pulse rounded-[8px] bg-slate-200" />
      <div className="h-20 animate-pulse rounded-[8px] bg-slate-100" />
    </div>
  );
}
