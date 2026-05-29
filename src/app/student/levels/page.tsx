import { redirect } from "next/navigation";

/** Legacy route — lesson plan moved off student nav; topics live under Practice by Topics. */
export default function StudentLevelsPage() {
  redirect("/student/concepts");
}
