"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { LOCATIONS } from "@/lib/constants";
import { PREFECTURE_MAP_SVG_INNER } from "@/components/map/prefectureMapSvg";

type Props = {
  visitedLocations: string[];
  className?: string;
  /** 指定すると、visited の県だけクリック可能になりコールバックする（未指定なら静的表示） */
  onPrefectureClick?: (name: string) => void;
  /** 指定すると各エリアを件数に応じた濃淡（旅の熱量）で塗る。未指定なら従来の単色 */
  intensityByLocation?: Record<string, number>;
};

const VISITED_FILL = "#22c55e";
const UNVISITED_FILL = "#e4e4e7";
// 旅の熱量ヒートマップの両端（lime と green の中間、緑寄りの黄緑）
const HEAT_LIGHT = [202, 248, 183];
const HEAT_DARK = [62, 163, 44];

// 件数を薄い緑〜濃い緑に補間する。全件同数（max<=1）のときは中間色に寄せる。
function heatColor(count: number, max: number): string {
  const t = max > 1 ? (count - 1) / (max - 1) : 0.5;
  const [r, g, b] = HEAT_LIGHT.map((l, i) => Math.round(l + (HEAT_DARK[i] - l) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

export function PrefectureMapView({
  visitedLocations,
  className,
  onPrefectureClick,
  intensityByLocation,
}: Props) {
  const svgElRef = useRef<SVGSVGElement | null>(null);
  const cleanupRef = useRef<() => void>(() => {});

  const applyColors = useCallback(
    (svg: SVGSVGElement) => {
      cleanupRef.current();
      const maxCount = intensityByLocation ? Math.max(1, ...Object.values(intensityByLocation)) : 1;
      const groups = svg.querySelectorAll<SVGGElement>("g.prefecture[data-code]");
      const cleanups: Array<() => void> = [];
      groups.forEach((g) => {
        const code = Number(g.getAttribute("data-code"));
        const name = LOCATIONS[code - 1];
        const visited = name != null && visitedLocations.includes(name);
        let fill = UNVISITED_FILL;
        if (visited) {
          fill = intensityByLocation ? heatColor(intensityByLocation[name] ?? 1, maxCount) : VISITED_FILL;
        }
        g.setAttribute("fill", fill);
        if (visited && name != null && onPrefectureClick) {
          g.style.cursor = "pointer";
          const handler = () => onPrefectureClick(name);
          g.addEventListener("click", handler);
          cleanups.push(() => {
            g.style.cursor = "";
            g.removeEventListener("click", handler);
          });
        }
      });
      cleanupRef.current = () => cleanups.forEach((fn) => fn());
    },
    [visitedLocations, onPrefectureClick, intensityByLocation]
  );

  // コールバックref: SVG要素が生成された瞬間（dangerouslySetInnerHTMLの内容が
  // 確定した直後）に必ず色付けする。何らかの理由でDOMノードが再生成されても
  // useEffectの依存配列変化を待たずに確実に復元されるようにするための保険
  const setSvgRef = useCallback(
    (svg: SVGSVGElement | null) => {
      svgElRef.current = svg;
      if (svg) applyColors(svg);
    },
    [applyColors]
  );

  useEffect(() => {
    if (svgElRef.current) applyColors(svgElRef.current);
    return () => cleanupRef.current();
  }, [applyColors]);

  // 参照を固定する。インラインで {__html: ...} を渡すと毎レンダーで新しいオブジェクトになり、
  // React が同じ SVG ノードに innerHTML を再セットしてしまい、applyColors が塗った色や
  // クリックリスナーが初期状態に戻されてしまう（＝地図クリックで色が消える）ため。
  const innerHtml = useMemo(() => ({ __html: PREFECTURE_MAP_SVG_INNER }), []);

  return (
    <svg
      ref={setSvgRef}
      viewBox="0 0 1000 1000"
      className={className ?? "mx-auto h-auto w-full max-w-sm"}
      dangerouslySetInnerHTML={innerHtml}
    />
  );
}
