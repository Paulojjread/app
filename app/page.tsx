import { supabase } from "../lib/supabase";

export default async function Home() {
  const { data, error } = await supabase.from("posts").select("*");

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-4xl font-bold mb-6">Teste Supabase Produção</h1>

      <pre>{JSON.stringify({ data, error }, null, 2)}</pre>
    </main>
  );
}