"use client";

import { use } from "react";
import { PlanDetailView } from "@/components/planes/plan-detail-view";

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PlanDetailView planId={id} />;
}
