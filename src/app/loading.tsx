import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <main className="mx-auto min-h-dvh max-w-5xl px-5 py-16"><Skeleton className="h-8 w-52" /><Skeleton className="mt-4 h-5 w-80 max-w-full" /><div className="mt-10 grid gap-4 sm:grid-cols-2"><Skeleton className="h-52" /><Skeleton className="h-52" /></div></main>;
}
