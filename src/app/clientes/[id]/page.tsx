import { ClientDetailView } from "@/components/clientes/client-detail-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params;
  return <ClientDetailView clientId={id} />;
}
