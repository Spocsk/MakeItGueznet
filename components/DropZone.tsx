"use client";

import { DragEvent, useState } from "react";

type DropZoneProps = {
  testId: string;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
  label: string;
  hint: string;
};

export function DropZone({
  testId,
  disabled,
  onFiles,
  label,
  hint,
}: DropZoneProps) {
  const [over, setOver] = useState(false);

  function markOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (disabled) return;
    setOver(true);
  }

  return (
    <label
      className={`drop${over ? " is-over" : ""}`}
      onDragEnter={markOver}
      onDragOver={markOver}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (disabled) return;
        const dropped = event.dataTransfer.files;
        const snapshot = dropped ? Array.from(dropped) : [];
        if (!snapshot.length) return;
        const transfer = new DataTransfer();
        for (const file of snapshot) transfer.items.add(file);
        onFiles(transfer.files);
      }}
    >
      <input
        className="drop-input"
        data-testid={testId}
        type="file"
        accept="image/*,image/gif"
        multiple
        disabled={disabled}
        onChange={(event) => {
          const list = event.target.files;
          const snapshot = list ? Array.from(list) : [];
          event.target.value = "";
          if (!snapshot.length) return;
          const transfer = new DataTransfer();
          for (const file of snapshot) transfer.items.add(file);
          onFiles(transfer.files);
        }}
      />
      <span className="drop-print" aria-hidden="true" />
      <span className="drop-band">
        <span className="drop-copy">{label}</span>
        <span className="drop-hint">{hint}</span>
      </span>
    </label>
  );
}
