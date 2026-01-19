import { useState, useEffect } from "react";

export type CategorySegment = {
  category: string;
  amount: number;
  color?: string;
};

type ProgressRingProps = {
  value?: number;
  categories?: CategorySegment[];
  size?: number;
  stroke?: number;
  showLegend?: boolean;
  animateOnMount?: boolean;
};

const defaultColors = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Salmon
  "#98D8C8", // Mint
  "#F7DC6F", // Yellow
  "#BB8FCE", // Purple
  "#85C1E2", // Light Blue
  "#F8B88B", // Peach
  "#AED6F1", // Sky Blue
  "#F1948A", // Light Red
  "#D5A6BD", // Mauve
  "#82E0AA", // Green
  "#F9E79F", // Light Yellow
  "#D7BDE2", // Lavender
  "#A9DFBF", // Light Green
  "#FAD7A0", // Light Orange
  "#AED6F1", // Powder Blue
  "#F1A9A0", // Rose
  "#ABEBC6", // Seafoam
];

const ProgressRing = ({
  value = 0,
  categories,
  size = 96,
  stroke = 8,
  showLegend = true,
  animateOnMount = true,
}: ProgressRingProps) => {
  const [isAnimating, setIsAnimating] = useState(animateOnMount);

  useEffect(() => {
    if (animateOnMount) {
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [animateOnMount]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // If categories are provided, render multi-color donut
  if (categories && categories.length > 0) {
    const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);

    // Calculate segments
    let currentOffset = 0;
    const segments = categories.map((cat, index) => {
      const percentage = totalAmount > 0 ? cat.amount / totalAmount : 0;
      const segmentLength = percentage * circumference;
      const offset = currentOffset;
      currentOffset += segmentLength;

      return {
        ...cat,
        percentage,
        offset,
        segmentLength,
        color: cat.color || defaultColors[index % defaultColors.length],
      };
    });

    return (
      <div className="progress-ring-container">
        <svg
          width={size}
          height={size}
          className={`progress-ring ${isAnimating ? "progress-ring-animate" : ""}`}
        >
          {/* Background track */}
          <circle
            className="progress-ring-track"
            strokeWidth={stroke}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />

          {/* Colored segments */}
          {segments.map((segment, index) => (
            <circle
              key={`${segment.category}-${index}`}
              className="progress-ring-segment"
              strokeWidth={stroke}
              r={radius}
              cx={size / 2}
              cy={size / 2}
              style={{
                stroke: segment.color,
                strokeDasharray: `${segment.segmentLength} ${circumference}`,
                strokeDashoffset: -segment.offset,
                animation: isAnimating
                  ? `progress-fill 0.8s ease-out ${index * 0.1}s forwards`
                  : "none",
              }}
            />
          ))}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="progress-legend">
            {segments.map((segment, index) => (
              <div
                key={`legend-${segment.category}-${index}`}
                className="legend-item"
              >
                <div
                  className="legend-color"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="legend-label">{segment.category}</span>
                <span className="legend-amount">
                  ({segment.percentage > 0 ? (segment.percentage * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default single-color progress ring (backward compatible)
  const progress = Math.min(Math.max(value, 0), 1);
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        className="progress-ring-track"
        strokeWidth={stroke}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-ring-value"
        strokeWidth={stroke}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          strokeDasharray: `${circumference} ${circumference}`,
          strokeDashoffset: offset,
        }}
      />
    </svg>
  );
};

export default ProgressRing;
