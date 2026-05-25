import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatBox } from "@/components/ui/Badge";
import { getContentAuditReport } from "@/lib/content-audit";

export default async function ContentAuditPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const report = await getContentAuditReport();

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Content Audit</h1>
        <p className="text-sm text-slate-600">
          Track curriculum coverage, approval gaps, and quality issues across Math,
          English, and future subjects.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Approved (student-ready)" value={report.totals.approvedProblems} accent="emerald" />
          <StatBox label="Draft / needs review" value={report.totals.draftProblems} accent="amber" />
          <StatBox label="Missing explanations" value={report.totals.problemsNoExplanation} accent="rose" />
          <StatBox label="Open flags" value={report.totals.openFlags} accent="indigo" />
        </div>

        <Card>
          <CardTitle>Skills below minimum approved problems</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Foundation skills need 50+ approved problems; others need 20+.
          </p>
          <div className="mt-3 space-y-2">
            {report.skillsBelowThreshold.length === 0 ? (
              <p className="text-slate-500 text-sm">All skills meet thresholds.</p>
            ) : (
              report.skillsBelowThreshold.slice(0, 20).map(({ skill, approved, minRequired, gap }) => (
                <div
                  key={skill.id}
                  className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    {skill.subject.name} · {skill.title}
                    {skill.isFoundationSkill && (
                      <span className="text-amber-600 ml-1">(foundation)</span>
                    )}
                  </span>
                  <span className="text-slate-600">
                    {approved}/{minRequired} ({gap} short)
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Skills missing standard alignment</CardTitle>
          <div className="mt-3 space-y-2">
            {report.skillsWithoutStandards.length === 0 ? (
              <p className="text-slate-500 text-sm">All skills have standard mappings.</p>
            ) : (
              report.skillsWithoutStandards.map((skill) => (
                <p key={skill.id} className="text-sm text-slate-700">
                  {skill.subject.name} · {skill.title}
                </p>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
