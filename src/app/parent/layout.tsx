/** Parent portal reads live data — skip static prerender during `next build`. */
export const dynamic = "force-dynamic";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
