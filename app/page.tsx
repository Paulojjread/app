import { supabase } from "../lib/supabase";

export default async function Home() {
  const { data: posts } = await supabase.from("posts").select("*");

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-4xl font-bold mb-6">Meus posts</h1>

      <div className="space-y-4">
        {posts?.map((post) => (
          <div key={post.id} className="rounded-xl bg-slate-800 p-5">
            <h2 className="text-2xl font-semibold">{post.titulo}</h2>
            <p className="text-slate-300">{post.descricao}</p>
          </div>
        ))}
      </div>
    </main>
  );
}