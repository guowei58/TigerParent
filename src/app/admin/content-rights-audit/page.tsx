import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  getContentRightsAuditReport,
  getMcqPositionAudit,
  getSkillHighConfidenceGap,
} from "@/lib/content-provenance/rights-audit";

export default async function ContentRightsAuditPage() {
  const [report, mcqAudit, skillGaps] = await Promise.all([
    getContentRightsAuditReport(),
    getMcqPositionAudit(),
    getSkillHighConfidenceGap(),
  ]);

  return (
    <div>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Content Rights Audit</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card><CardTitle className="text-base">Unknown source</CardTitle><p className="text-2xl font-bold mt-2">{report.unknownSource}</p></Card>
          <Card><CardTitle className="text-base">Unknown copyright</CardTitle><p className="text-2xl font-bold mt-2">{report.unknownCopyright}</p></Card>
          <Card><CardTitle className="text-base">Generated labeled official</CardTitle><p className="text-2xl font-bold mt-2">{report.generatedLabeledOfficial}</p></Card>
          <Card><CardTitle className="text-base">Missing answer key</CardTitle><p className="text-2xl font-bold mt-2">{report.missingAnswerKey}</p></Card>
          <Card><CardTitle className="text-base">Missing explanation</CardTitle><p className="text-2xl font-bold mt-2">{report.missingExplanation}</p></Card>
          <Card><CardTitle className="text-base">Approved without verification</CardTitle><p className="text-2xl font-bold mt-2">{report.approvedWithoutVerification}</p></Card>
          <Card><CardTitle className="text-base">Low confidence approved</CardTitle><p className="text-2xl font-bold mt-2">{report.lowConfidenceApproved}</p></Card>
        </div>

        <Card>
          <CardTitle>MCQ answer position audit</CardTitle>
          <p className="text-sm mt-2">
            Sample {mcqAudit.sampleSize} · correct-first rate{" "}
            {Math.round(mcqAudit.correctAnswerFirstRate * 100)}%
          </p>
          <ul className="mt-2 text-sm text-slate-600">
            {mcqAudit.bySubject.map((row) => (
              <li key={row.subject}>
                {row.subject}: {Math.round(row.firstPositionRate * 100)}% first-position correct
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Skills needing more high-confidence content</CardTitle>
          <ul className="mt-2 space-y-2 text-sm">
            {skillGaps.map(({ skill, highConfidenceCount, minRequired }) => (
              <li key={skill.id}>
                {skill.subject.name} · {skill.title} — {highConfidenceCount}/{minRequired} high-confidence
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </div>
  );
}
