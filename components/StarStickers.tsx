"use client";

type StarStickersProps = {
  value: number | null;
  onChange?: (stars: number) => void;
  readOnly?: boolean;
};

export function StarStickers({
  value,
  onChange,
  readOnly = false,
}: StarStickersProps) {
  return (
    <div className="stars" role="group" aria-label="Note sur cinq">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            className={`star ${on ? "on" : ""}`}
            style={on ? { animationDelay: `${(n - 1) * 40}ms` } : undefined}
            disabled={readOnly || !onChange}
            aria-pressed={on}
            data-testid={`star-${n}`}
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            onClick={() => onChange?.(n)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.4 14.7 8l6.3.9-4.5 4.4 1.1 6.3L12 16.6 6.4 19.6l1.1-6.3L3 8.9 9.3 8z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
