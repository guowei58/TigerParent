import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { ImportContentForm } from "./ImportContentForm";

export default async function ImportContentPage() {
  const sources = await prisma.contentSource.findMany({
    where: { importAllowed: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Import Content</h1>
        <Card>
          <CardTitle>Approved sources only</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Paste JSON items from an approved source (TEA STAAR released, licensed OER, etc.).
            Imported items always enter the review queue — never straight to students.
          </p>
          <ImportContentForm sources={sources} />
        </Card>
      </main>
    </div>
  );
}
