"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ProblemReviewActions({ problemId }: { problemId: string }) {
  const router = useRouter();

  async function act(action: string) {
    await fetch(`/api/admin/problems/${problemId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => act("revalidate")}>
        Re-validate
      </Button>
      <Button size="sm" variant="primary" onClick={() => act("approve")}>
        Approve
      </Button>
      <Button size="sm" variant="secondary" onClick={() => act("reject")}>
        Reject
      </Button>
      <Button size="sm" variant="secondary" onClick={() => act("retire")}>
        Retire
      </Button>
    </div>
  );
}
