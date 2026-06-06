import Link from "next/link";
import { auth, portalPath } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AuthBackground } from "@/components/layouts/AuthBackground";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(portalPath(session.user.role));
  }

  return (
    <AuthBackground overlayClassName="bg-slate-950/65">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-12 text-center text-white md:py-16">
        <p className="text-6xl mb-4 drop-shadow-lg">🐯</p>
        <h1 className="text-4xl font-bold mb-3 drop-shadow-md md:text-5xl">
          TigerParent
        </h1>
        <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto drop-shadow md:text-xl">
          Daily mastery-based practice for math and English. Teach, practice,
          track, review, and advance — built for tablet learning with parent
          oversight.
        </p>
        <div className="flex justify-center">
          <Link href="/login">
            <Button
              size="lg"
              variant="secondary"
              className="min-w-[200px] shadow-lg"
            >
              Sign In
            </Button>
          </Link>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 gap-4 text-left md:mt-16 md:gap-6 max-w-2xl mx-auto">
          {[
            {
              title: "Students",
              desc: "30-minute daily missions, stylus work, lessons, and rewards",
            },
            {
              title: "Review your kid's work",
              desc: "Open Review Your Kid's Work in the student app — daily problems, scratch work, and reading recordings, no extra login",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md md:p-6"
            >
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-white/85 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AuthBackground>
  );
}
