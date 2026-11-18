"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePackAction } from "../../seller/actions";

export function DeletePackButton(props: { packId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await deletePackAction(props.packId);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => void remove()} disabled={busy}>
        Delete
      </button>
      {message ? <span role="alert"> {message}</span> : null}
    </>
  );
}
