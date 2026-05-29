import { isPdfBuffer } from "../lib/pdf-valid";

async function probe(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": "TigerParent-Education-Importer/1.0", ...headers },
    redirect: "follow",
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    ct: res.headers.get("content-type"),
    size: buf.length,
    isPdf: isPdfBuffer(buf),
    head: buf.subarray(0, 40).toString().replace(/\n/g, " "),
  };
}

async function main() {
  const urls = [
    "https://www.education.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2025%20pssa%20mathematics%20grade%205%20item%20sampler.pdf",
    "https://doe.louisiana.gov/docs/default-source/assessment/leap-2025-grade-5-math-practice-test.pdf",
    "https://education.ohio.gov/getattachment/Topics/Testing/Ohios-State-Test-in-ELA-Math-Science-SocialStudies/Mathematics/Grade-5-Math-Released-Items-2024.pdf.aspx",
  ];
  for (const url of urls) {
    console.log("\n", url.slice(0, 90), "...");
    console.log(await probe(url));
    console.log(
      await probe(url, {
        Accept: "application/pdf,*/*",
        Referer: "https://www.education.pa.gov/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      }),
    );
  }
}

main().catch(console.error);
