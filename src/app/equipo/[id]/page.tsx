interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberPage({ params }: Props) {
  const { id } = await params;

  return (
    <main>
      <h1>Perfil miembro {id}</h1>
      {/* TODO: migrate team member profile + status 9.1 card + badges */}
    </main>
  );
}
