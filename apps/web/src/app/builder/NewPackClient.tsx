// New pack entry point. Creates a pack on the server for the signed in
// seller, then opens it in the builder. ?sample=1 starts with clearly
// marked sample content. ?name= sets the product name. No pack is
// created for a visitor who is not signed in.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, PageShell } from "../../components/ui";
import { siteCopy } from "../../config/site-copy";
import { createPackAction } from "../seller/actions";

export function NewPackClient(props: { signedIn: boolean }) {
  const router = useRouter();
  const created = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.signedIn || created.current) {
      return;
    }
    created.current = true;
    const params = new URLSearchParams(window.location.search);
    void createPackAction({ productName: params.get("name") ?? "", useSample: params.get("sample") === "1" }).then((result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace("/builder/" + result.value.packId);
    });
  }, [props.signedIn, router]);

  if (!props.signedIn) {
    return (
      <PageShell title={siteCopy.builder.heading} intro={siteCopy.errors.notSignedIn}>
        <a href="/auth/register?next=%2Fbuilder%3Fnew%3D1">Create an account</a> or <a href="/auth/login?next=%2Fbuilder%3Fnew%3D1">sign in</a>.
      </PageShell>
    );
  }

  return (
    <PageShell title={siteCopy.builder.heading}>
      {error ? <Alert tone="danger">{error}</Alert> : <Alert tone="info">Starting your pack...</Alert>}
    </PageShell>
  );
}
