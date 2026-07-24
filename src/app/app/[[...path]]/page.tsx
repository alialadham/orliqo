import { notFound, redirect } from "next/navigation";

export default async function AppFallbackPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  if (!path.length) redirect("/app/dashboard");
  if (path.length === 1 && path[0] === "settings")
    redirect("/app/settings/workspace");
  notFound();
}
