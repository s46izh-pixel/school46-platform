import { SkeletonBlock } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
      <SkeletonBlock />
      <SkeletonBlock />
      <SkeletonBlock />
    </main>
  );
}
