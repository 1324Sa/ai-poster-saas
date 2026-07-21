"use client";

import PosterEditor from "./components/PosterEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
       مولد بوسترات
      </h1>
      <PosterEditor />
    </main>
  );
}