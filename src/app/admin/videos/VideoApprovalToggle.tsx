"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export function VideoApprovalToggle({ videoId, approved }: { videoId: string; approved: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size="sm"
      variant={approved ? "ghost" : "primary"}
      className="mt-3"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch(`/api/admin/videos/${videoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvedByParent: !approved }),
        });
        router.refresh();
        setLoading(false);
      }}
    >
      {approved ? "Revoke Approval" : "Approve for Students"}
    </Button>
  );
}
