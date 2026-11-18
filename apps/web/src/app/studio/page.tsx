// Mockup Studio page. The studio itself runs in the browser (WebGL), so
// the client component is loaded without server rendering.

import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/current-user";

const StudioClient = dynamic(() => import("@/studio/components/StudioClient").then((module) => module.StudioClient), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Loading the studio...</p>,
});

export const metadata = { title: "Mockup Studio, Listing Photos Generator" };
export const dynamicParams = true;
export const revalidate = 0;

export default async function StudioPage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-navy">Mockup Studio</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Place your real design on 3D devices and printed sheets, then export the ordered image set. A mockup is a presentation frame. The screen or sheet inside it is always your own design, shown as it is.
      </p>
      <div className="mt-6">
        {user ? (
          <StudioClient />
        ) : (
          <p className="text-sm">
            <a className="underline" href="/auth/login?next=%2Fstudio">Sign in</a> or <a className="underline" href="/auth/register?next=%2Fstudio">create an account</a> to use the studio.
          </p>
        )}
      </div>
    </div>
  );
}
