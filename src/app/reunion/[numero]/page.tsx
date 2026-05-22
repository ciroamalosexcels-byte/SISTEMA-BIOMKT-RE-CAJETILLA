import { CrmView } from "@/components/crm/crm-view";
import type { TabKey } from "@/types";

interface Props {
  params: Promise<{ numero: string }>;
}

export default async function ReunionPage({ params }: Props) {
  const { numero } = await params;
  const tab: TabKey = numero === "1" ? "REUNION_1" : "REUNION_2";
  return <CrmView tab={tab} />;
}

export function generateStaticParams() {
  return [{ numero: "1" }, { numero: "2" }];
}
