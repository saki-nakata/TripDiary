export function TwemojiIcon({
  codepoint,
  className,
  alt = "",
}: {
  codepoint: string;
  className?: string;
  alt?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/twemoji/${codepoint}.svg`} alt={alt} className={className} />;
}
