import type { CSSProperties } from "react";

export function TwemojiIcon({
  codepoint,
  className,
  alt = "",
  style,
}: {
  codepoint: string;
  className?: string;
  alt?: string;
  style?: CSSProperties;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/twemoji/${codepoint}.svg`} alt={alt} className={className} style={style} />;
}
