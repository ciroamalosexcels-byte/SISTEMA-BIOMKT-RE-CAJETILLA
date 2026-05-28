import { MemberProfile } from "@/components/equipo/member-profile";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberPage({ params }: Props) {
  const { id } = await params;
  return <MemberProfile memberId={id} />;
}
