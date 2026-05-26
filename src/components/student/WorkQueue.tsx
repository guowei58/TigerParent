"use client";

import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, ProgressBar } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Assignment, AssignmentStatus } from "@/generated/prisma/client";
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_TYPE_LABELS } from "@/lib/assignments/types";

type WorkQueueProps = {
  title: string;
  subtitle: string;
  assignments: Assignment[];
  startHref: (assignment: Assignment) => string;
};

function statusVariant(status: AssignmentStatus) {
  switch (status) {
    case "COMPLETED":
    case "REVIEWED":
      return "success" as const;
    case "IN_PROGRESS":
      return "warning" as const;
    case "OVERDUE":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

export function WorkQueue({ title, subtitle, assignments, startHref }: WorkQueueProps) {
  const completed = assignments.filter((a) => a.status === "COMPLETED" || a.status === "REVIEWED").length;
  const progress = assignments.length ? (completed / assignments.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600 mt-1">{subtitle}</p>
        {assignments.length > 0 && (
          <div className="mt-4">
            <ProgressBar value={progress} />
            <p className="text-sm text-slate-500 mt-1">
              {completed} of {assignments.length} complete
            </p>
          </div>
        )}
      </div>

      {assignments.length === 0 ? (
        <Card>
          <p className="text-slate-600">No assignments in this queue yet. Check back after your daily plan is generated.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const mix = assignment.sourceMixJson as
              | { officialPercent?: number; generatedPercent?: number }
              | null;
            const problemCount = Array.isArray(assignment.problemIdsJson)
              ? (assignment.problemIdsJson as string[]).length
              : 0;

            return (
              <Card key={assignment.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <Badge variant={statusVariant(assignment.status)}>
                      {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                    </Badge>
                    {assignment.timed && <Badge variant="warning">Timed</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {ASSIGNMENT_TYPE_LABELS[assignment.assignmentType]} · {problemCount} problems · ~
                    {assignment.targetMinutes} min
                  </p>
                  {mix && (
                    <p className="text-xs text-slate-400 mt-1">
                      Source mix: {mix.officialPercent ?? 0}% official · {mix.generatedPercent ?? 0}% generated
                    </p>
                  )}
                </div>
                <Link href={startHref(assignment)}>
                  <Button>
                    {assignment.status === "COMPLETED" ? "Review" : assignment.status === "IN_PROGRESS" ? "Continue" : "Start"}
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
