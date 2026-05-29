import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { SubjectLearningCardData } from "@/lib/unit-learning";
import { cn } from "@/lib/utils";

const subjectAccent: Record<string, { gradient: string }> = {
  math: { gradient: "from-indigo-600 to-violet-600" },
  english: { gradient: "from-violet-600 to-fuchsia-600" },
};

function accentFor(subjectName: string) {
  const key = subjectName.toLowerCase();
  return subjectAccent[key] ?? subjectAccent.math;
}

export function SubjectLearningCard({ card }: { card: SubjectLearningCardData }) {
  const accent = accentFor(card.subjectName);

  return (
    <Card className="overflow-hidden p-0">
      <div className={cn("bg-gradient-to-r px-5 py-4 text-white", accent.gradient)}>
        <div>
          <CardTitle className="text-white text-xl">{card.subjectName}</CardTitle>
          <p className="text-sm text-white/80 mt-0.5">Grade {card.gradeLevel}</p>
        </div>
      </div>

      <div className="p-5">
        <Link href={card.practiceHref}>
          <Button className="w-full">Practice</Button>
        </Link>
      </div>
    </Card>
  );
}
