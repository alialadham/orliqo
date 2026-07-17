import { StatePanel } from "@/components/feedback/state-panel";

export default function NotFound() {
  return <StatePanel variant="missing" title="Page not found" description="The page does not exist or is not available in this workspace." action={{ label: "Go to Orliqo", href: "/" }} />;
}
