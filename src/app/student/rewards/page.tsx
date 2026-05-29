import { redirect } from "next/navigation";

/** Rewards UI hidden for now — redirect old links to home. */
export default function StudentRewardsPage() {
  redirect("/student");
}
