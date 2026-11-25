"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AtmoGraph error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="rounded-xl border border-red-900 bg-slate-900 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-400">
          Something went wrong
        </h1>
        <p className="mt-3 text-slate-400">
          AtmoGraph encountered an unexpected error.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-cyan-600 px-5 py-3 text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
