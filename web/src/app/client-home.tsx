"use client";

import dynamic from "next/dynamic";

const LegacyApp = dynamic(() => import("../legacy/App"), {
  ssr: false,
  loading: () => <main className="app-loading">Loading learning workspace...</main>,
});

export default function ClientHome() {
  return <LegacyApp />;
}
