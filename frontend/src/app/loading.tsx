import { Activity } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <Activity className="mx-auto h-12 w-12 animate-pulse text-cyan-400" />
        <h2 className="mt-5 text-xl font-semibold text-white">
          AtmoGraph
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Loading Supply Chain Intelligence...
        </p>
      </div>
    </main>
  );
}
