"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import type { Problem } from "@/generated/prisma/client";

import { ProblemView } from "@/components/ProblemView";

import { Card, CardTitle } from "@/components/ui/Card";

import { ProgressBar } from "@/components/ui/Badge";

import { Button } from "@/components/ui/Button";

import { useRouter } from "next/navigation";



type NextUnit = {

  id: string;

  title: string;

};



export function PracticeClient({

  sessionId,

  problems,

  skillId,

  skillTitle,

  initialProblemIndex = 0,
  unitAlreadyComplete = false,
  nextUnit,
  isPopQuiz = false,
}: {
  sessionId: string;
  problems: Problem[];
  skillId?: string;
  skillTitle?: string;
  initialProblemIndex?: number;
  unitAlreadyComplete?: boolean;
  nextUnit?: NextUnit | null;
  isPopQuiz?: boolean;
}) {

  const router = useRouter();

  const [index, setIndex] = useState(initialProblemIndex);

  const [xp, setXp] = useState(0);

  const [done, setDone] = useState(false);

  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);



  const current = problems[index];



  const finishUnit = useCallback(async () => {
    setDone(true);

    await fetch(`/api/practice/${sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advanceUnit: !isPopQuiz, skillId }),
    }).catch(() => undefined);

    if (isPopQuiz) {
      setTransitionMessage("Pop quiz complete! You can continue your work.");
      advanceTimer.current = setTimeout(() => {
        router.push("/student");
      }, 2000);
      return;
    }

    if (nextUnit) {
      setTransitionMessage(`Unit complete! Moving to ${nextUnit.title}…`);
      advanceTimer.current = setTimeout(() => {
        router.push(`/student/lesson/${nextUnit.id}`);
      }, 2000);
    }
  }, [isPopQuiz, nextUnit, router, sessionId, skillId]);



  useEffect(

    () => () => {

      if (advanceTimer.current) clearTimeout(advanceTimer.current);

    },

    [],

  );

  useEffect(() => {
    if (unitAlreadyComplete && !done && !transitionMessage) {
      void finishUnit();
    }
  }, [unitAlreadyComplete, done, transitionMessage, finishUnit]);

  if (!current && !done && problems.length === 0) {

    return (

      <Card className="text-center space-y-4">

        <CardTitle>No practice problems for this unit yet</CardTitle>

        <p className="text-slate-500">Try another unit from your lesson plan.</p>

        <Button className="mt-4" onClick={() => router.push("/student/concepts")}>

          Practice by Topics

        </Button>

      </Card>

    );

  }



  if (transitionMessage) {

    return (

      <Card className="text-center space-y-4 py-10">

        <p className="text-5xl">✓</p>

        <CardTitle className="text-xl">{transitionMessage}</CardTitle>

      </Card>

    );

  }



  if (done) {

    return (

      <Card className="text-center space-y-4">

        <p className="text-4xl">⭐</p>

        <CardTitle>

          {isPopQuiz
            ? "Pop quiz complete!"
            : skillTitle
              ? `${skillTitle} — unit complete!`
              : "Unit complete!"}

        </CardTitle>

        <p className="text-slate-500">{xp} XP earned</p>

        {isPopQuiz ? (
          <Button onClick={() => router.push("/student")}>Back to Home</Button>
        ) : nextUnit ? (

          <Button onClick={() => router.push(`/student/lesson/${nextUnit.id}`)}>

            Next unit: {nextUnit.title} →

          </Button>

        ) : (

          <Button onClick={() => router.push("/student/concepts")}>

            Back to Practice by Topics

          </Button>

        )}

      </Card>

    );

  }



  return (

    <div className="space-y-4">

      {skillTitle && (

        <p className="text-sm font-medium text-indigo-700">{skillTitle}</p>

      )}

      <ProgressBar value={(index / problems.length) * 100} />

      <p className="text-sm text-slate-500">

        Problem {index + 1} of {problems.length}

      </p>

      <ProblemView

        key={current.id}

        problem={current}

        onSubmit={async (data) => {

          const res = await fetch(`/api/practice/${sessionId}`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({

              problemId: current.id,

              answer: data.answer,

              strokes: data.strokes,

              elapsedSeconds: data.elapsedSeconds,

              drawingSeconds: data.drawingSeconds,

            }),

          });

          const result = await res.json();

          if (!res.ok) {

            if (res.status === 401) {

              window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;

              return {

                isCorrect: false,

                blocked: true,

                workFeedback: "Signing you in again…",

              };

            }

            const message =

              result.workFeedback ?? result.error ?? "Something went wrong. Try again.";

            return {

              isCorrect: false,

              blocked: true,

              workFeedback: message,

            };

          }

          if (result.xpEarned) setXp((x) => x + result.xpEarned);



          return {

            isCorrect: result.isCorrect,

            explanation: result.explanation,

            roast: result.roast,

            workFeedback: result.workFeedback,

            workBonusXp: result.workBonusXp,

            placementChange: result.placementChange,

          };

        }}

        onContinue={() => {

          if (index < problems.length - 1) {

            setIndex(index + 1);

          } else {

            void finishUnit();

          }

        }}

        continueLabel={index < problems.length - 1 ? "Next Problem" : "Finish Unit"}

      />

    </div>

  );

}

