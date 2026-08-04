"use client";

import { useState } from "react";

// Native window.confirm() is unreliable inside embedded/sandboxed preview
// contexts (commonly suppressed or a silent no-op), which makes a
// destructive action gated by it look like it simply doesn't work. This is
// an in-app equivalent that never depends on a browser-native dialog.
export function ConfirmButton({
  onConfirm,
  label,
  confirmLabel = "Remove?",
}: {
  onConfirm: () => void;
  label: string;
  confirmLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{confirmLabel}</span>
        <button
          type="button"
          style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          Yes, remove
        </button>
        <button type="button" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)}>
      {label}
    </button>
  );
}
