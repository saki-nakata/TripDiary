"use client";

import { useEffect, useRef } from "react";
import { LOCATIONS } from "@/lib/constants";
import { PREFECTURE_MAP_SVG_INNER } from "@/components/map/prefectureMapSvg";

type Props = {
  visitedLocations: string[];
  className?: string;
};

const VISITED_FILL = "#22c55e";
const UNVISITED_FILL = "#e4e4e7";

export function PrefectureMapView({ visitedLocations, className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const groups = svg.querySelectorAll<SVGGElement>("g.prefecture[data-code]");
    groups.forEach((g) => {
      const code = Number(g.getAttribute("data-code"));
      const name = LOCATIONS[code - 1];
      const visited = name != null && visitedLocations.includes(name);
      g.setAttribute("fill", visited ? VISITED_FILL : UNVISITED_FILL);
    });
  }, [visitedLocations]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 1000"
      className={className ?? "mx-auto h-auto w-full max-w-sm"}
      dangerouslySetInnerHTML={{ __html: PREFECTURE_MAP_SVG_INNER }}
    />
  );
}
