type ProgressRingProps = {
  value: number;
  size?: number;
  stroke?: number;
};

const ProgressRing = ({ value, size = 72, stroke = 8 }: ProgressRingProps) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
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
        style={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: offset }}
      />
    </svg>
  );
};

export default ProgressRing;
