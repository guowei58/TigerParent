/** Admin pages need the DB at request time — skip static prerender during `next build`. */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
