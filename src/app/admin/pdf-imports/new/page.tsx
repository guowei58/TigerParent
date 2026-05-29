import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { AdminNav } from "@/components/layouts/AdminNav";
import { PdfUploadForm } from "./PdfUploadForm";

export default async function NewPdfImportPage() {
  const session = await auth();
  if (!isAdminSession(session)) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Upload practice PDFs</h1>
        <p className="text-slate-600 text-sm mb-6">
          Queue multiple files, configure each one, then upload in one step. Ingestion continues in
          the background.
        </p>
        <PdfUploadForm />
      </main>
    </div>
  );
}
