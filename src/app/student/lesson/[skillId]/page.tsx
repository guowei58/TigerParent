import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId, getSkillWithLesson } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { parseJsonArray } from "@/lib/utils";
import { getLearningResourcesForSkill } from "@/lib/learning-library";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const { skillId } = await params;
  const student = await getStudentByUserId(session.user.id);
  const skill = await getSkillWithLesson(skillId, session.user.studentProfileId);

  const workedExamples = parseJsonArray<{ problem: string; solution: string }>(
    skill.lessons[0]?.workedExamplesJson,
  );
  const commonMistakes = parseJsonArray<string>(
    skill.lessons[0]?.commonMistakesJson,
  );

  const dbVideos = skill.videos.filter(
    (v) => v.url && !v.url.endsWith("khanacademy.org/"),
  );
  const libraryVideos = getLearningResourcesForSkill(skill.title);
  const seenUrls = new Set<string>();
  const allVideos = [...dbVideos, ...libraryVideos].filter((v) => {
    const url = "url" in v ? v.url : "";
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  return (
    <div className="min-h-[100dvh] pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student!.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <Card>
          <p className="text-sm text-indigo-600 font-medium">{skill.subject.name}</p>
          <CardTitle className="text-2xl mt-1">{skill.title}</CardTitle>
          <p className="text-slate-500 mt-2">{skill.description}</p>
        </Card>

        {skill.lessons[0] && (
          <Card>
            <CardTitle>Lesson</CardTitle>
            <div className="mt-3 prose prose-slate whitespace-pre-wrap">
              {skill.lessons[0].content}
            </div>
            {skill.lessons[0].whyItMatters && (
              <p className="mt-4 text-sm text-indigo-700 bg-indigo-50 rounded-xl p-3">
                💡 {skill.lessons[0].whyItMatters}
              </p>
            )}
          </Card>
        )}

        {workedExamples.length > 0 && (
          <Card>
            <CardTitle>Worked Example</CardTitle>
            {workedExamples.map((ex, i) => (
              <div key={i} className="mt-3 rounded-xl bg-slate-50 p-4">
                <p className="font-semibold">{ex.problem}</p>
                <p className="mt-2 text-slate-600">{ex.solution}</p>
              </div>
            ))}
          </Card>
        )}

        {commonMistakes.length > 0 && (
          <Card>
            <CardTitle>Common Mistakes</CardTitle>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-slate-600">
              {commonMistakes.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </Card>
        )}

        {allVideos.length > 0 && (
          <Card>
            <CardTitle>Watch & Learn</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Tap a link to open a video or lesson in a new tab.
            </p>
            <div className="mt-3 space-y-2">
              {allVideos.map((v, i) => {
                const title = "title" in v ? v.title : "";
                const provider = "provider" in v ? v.provider : "Other";
                const url = v.url;
                const duration =
                  "durationSeconds" in v && v.durationSeconds
                    ? v.durationSeconds
                    : null;
                return (
                  <a
                    key={`${url}-${i}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-indigo-50 hover:border-indigo-200 transition"
                  >
                    <span className="text-lg shrink-0">
                      {provider === "YouTube" ? "▶️" : "🎓"}
                    </span>
                    <span>
                      <p className="font-medium text-indigo-900">{title}</p>
                      <p className="text-sm text-slate-500">{provider}</p>
                      {duration && (
                        <p className="text-xs text-slate-400 mt-1">
                          ~{Math.round(duration / 60)} min
                        </p>
                      )}
                    </span>
                  </a>
                );
              })}
            </div>
          </Card>
        )}

        <Link href={`/student/practice/new?skillId=${skillId}`}>
          <Button size="lg" className="w-full">
            Start Practice →
          </Button>
        </Link>
      </main>
    </div>
  );
}
