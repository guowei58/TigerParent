import { redirect } from "next/navigation";

/** Legacy URL — send straight to the main login form. */
export default function AdminLoginPage() {
  redirect("/login?callbackUrl=/admin/pdf-imports");
}
