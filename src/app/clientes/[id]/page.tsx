interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <main>
      <h1>Cliente {id}</h1>
      {/* TODO: migrate client detail view with calendar + management events */}
    </main>
  );
}
