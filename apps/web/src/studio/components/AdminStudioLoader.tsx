"use client";

// Loads the admin studio screens without server rendering: they use
// WebGL and file inputs, which only exist in the browser.

import dynamic from "next/dynamic";
import type { LightingPreset } from "@listing-photos-generator/mockup-engine/studio";

const loading = () => <p className="text-sm text-slate-600">Loading...</p>;

const ModelRegistryAdmin = dynamic(() => import("./ModelRegistryAdmin").then((module) => module.ModelRegistryAdmin), { ssr: false, loading });
const StyleKitAdmin = dynamic(() => import("./StyleKitAdmin").then((module) => module.StyleKitAdmin), { ssr: false, loading });

export function ModelRegistryAdminLoader({ lighting }: { lighting: LightingPreset }) {
  return <ModelRegistryAdmin lighting={lighting} />;
}

export function StyleKitAdminLoader() {
  return <StyleKitAdmin />;
}
