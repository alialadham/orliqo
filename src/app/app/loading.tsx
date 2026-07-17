import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return <div className="mx-auto max-w-[1500px] space-y-4"><div><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="mt-2 h-5 w-80 max-w-full" /></div><Skeleton className="h-32 rounded-xl" /><div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]"><Skeleton className="h-[390px] rounded-xl" /><Skeleton className="h-[390px] rounded-xl" /></div></div>;
}
