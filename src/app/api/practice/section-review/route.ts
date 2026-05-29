import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { progressScopeFromSession } from "@/lib/pdf-practice/progress";
import { getSectionReview } from "@/lib/pdf-practice/section-review";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = progressScopeFromSession(session.user);
  if (!scope) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const conceptSlug = url.searchParams.get("conceptSlug");
  if (!conceptSlug) {
    return NextResponse.json({ error: "conceptSlug required" }, { status: 400 });
  }
  const gradeParam = url.searchParams.get("gradeLevel");
  const gradeLevel = gradeParam ? parseInt(gradeParam, 10) : undefined;

  try {
    const items = await getSectionReview(
      scope,
      conceptSlug,
      Number.isFinite(gradeLevel) ? gradeLevel : undefined,
    );
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[section-review] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to load section review" },
      { status: 500 },
    );
  }
}
