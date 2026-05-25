import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VideoApprovalToggle } from "./VideoApprovalToggle";

export default async function AdminVideosPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const videos = await prisma.videoResource.findMany({
    include: { skill: { include: { subject: true } } },
    orderBy: { title: "asc" },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Video Resources</h1>
        <p className="text-sm text-slate-500">Only approved videos are shown to students.</p>
        {videos.map((v) => (
          <Card key={v.id}>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">{v.title}</CardTitle>
                <p className="text-sm text-slate-500">{v.skill.subject.name} · {v.skill.title}</p>
                <p className="text-xs text-slate-400 mt-1">{v.url}</p>
              </div>
              <Badge variant={v.approvedByParent ? "success" : "warning"}>
                {v.approvedByParent ? "Approved" : "Pending"}
              </Badge>
            </div>
            <VideoApprovalToggle videoId={v.id} approved={v.approvedByParent} />
          </Card>
        ))}
      </main>
    </div>
  );
}
