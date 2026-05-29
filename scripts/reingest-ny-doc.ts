import { prisma } from "../src/lib/db";
import { spawn } from "child_process";
import path from "path";

const docId = "cmpnhm83100001svmscgl00hp";

async function main() {
  await prisma.pdfSourceDocument.update({
    where: { id: docId },
    data: {
      ingestionLayout: "one_problem_per_page",
      answerKeyPageCount: 9,
      importStatus: "uploaded",
    },
  });

  const job = await prisma.pdfIngestionJob.create({
    data: { sourceDocumentId: docId, status: "uploaded", currentStep: "reingest" },
  });

  console.log("job", job.id);

  const script = path.join(process.cwd(), "scripts", "run-pdf-ingestion-job.ts");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        "--env-file",
        path.join(process.cwd(), ".env"),
        script,
        docId,
        job.id,
      ],
      { stdio: "inherit", cwd: process.cwd() },
    );
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

main().finally(() => prisma.$disconnect());
