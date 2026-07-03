"use client";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
};

const SIZE = { sm: "text-sm", md: "text-xl", lg: "text-2xl" };

export function StarRating({ value, onChange, readonly = false, size = "md" }: Props) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={readonly ? "button" : "button"}
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${SIZE[size]} ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"} leading-none`}
          aria-label={`${star}星`}
        >
          <span className={star <= value ? "text-yellow-400" : "text-zinc-300"}>★</span>
        </button>
      ))}
    </div>
  );
}
