"use client";

import { useId } from "react";

type SparklineProps = {
  points: string;
  endColor: string;
};

export function Sparkline({ points, endColor }: SparklineProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `spark-${uid}`;
  return (
    <svg
      width={80}
      height={40}
      viewBox="0 0 100 40"
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.split(" ").map((point, idx, arr) => {
        const [cx, cy] = point.split(",").map(Number);
        const isLast = idx === arr.length - 1;
        return (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={3.5}
            fill={isLast ? endColor : "#ffffff"}
            stroke={isLast ? "none" : idx === 0 ? "#e5e7eb" : endColor}
            strokeWidth={isLast ? 0 : 2}
          />
        );
      })}
    </svg>
  );
}
