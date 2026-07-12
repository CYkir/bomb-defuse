import type { WireColor } from "@/lib/socket";

const WIRE_HEX: Record<WireColor, string> = {
  red: "#ff4a4a",
  green: "#4ade80",
  blue: "#5aa9ff",
  yellow: "#ffde59",
  black: "#2a2a35",
};

interface Props {
  wires: { color: WireColor; cut: boolean; correct?: boolean }[];
  selected?: WireColor | null;
  danger?: boolean;
  size?: number;
}

export function Bomb({ wires, selected, danger, size = 460 }: Props) {
  const w = size;
  const h = size;
  return (
    <div
      className={`relative ${danger ? "animate-shake" : "animate-bomb-idle"}`}
      style={{ width: w, height: h }}
    >
      <svg
        viewBox="0 0 460 460"
        width={w}
        height={h}
        className="drop-shadow-[0_0_40px_rgba(90,169,255,0.5)]"
      >
        <defs>
          <radialGradient id="bombBody" cx="45%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#3b3d55" />
            <stop offset="70%" stopColor="#141626" />
            <stop offset="100%" stopColor="#05060d" />
          </radialGradient>
          <linearGradient id="screenGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0a0f1e" />
            <stop offset="100%" stopColor="#1c243d" />
          </linearGradient>
        </defs>

        {/* wires coming out of top */}
        {wires.map((wire, i) => {
          const x = 130 + i * 40;
          const color = WIRE_HEX[wire.color];
          const cut = wire.cut;
          const isSelected = selected === wire.color;
          return (
            <g key={wire.color}>
              {/* wire path */}
              <path
                d={`M ${x} 20 C ${x} 60, ${x - 10} 90, ${x} 130`}
                stroke={color}
                strokeWidth={isSelected ? 10 : 7}
                fill="none"
                strokeLinecap="round"
                opacity={cut ? 0.35 : 1}
                style={{
                  filter: isSelected
                    ? `drop-shadow(0 0 10px ${color})`
                    : undefined,
                  transition: "all 0.2s",
                }}
              />
              {cut && (
                <>
                  <circle cx={x} cy={70} r={4} fill={color} />
                  <path
                    d={`M ${x - 8} 74 L ${x + 8} 66`}
                    stroke="#fff"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </>
              )}
              {/* connector on top of bomb */}
              <rect
                x={x - 6}
                y={128}
                width={12}
                height={10}
                fill="#1a1c30"
                stroke={color}
                strokeWidth={1.5}
              />
            </g>
          );
        })}

        {/* bomb body */}
        <circle cx={230} cy={280} r={150} fill="url(#bombBody)" />
        <circle
          cx={230}
          cy={280}
          r={150}
          fill="none"
          stroke={danger ? "#ff4a4a" : "#5aa9ff"}
          strokeWidth={2}
          opacity={0.5}
        />

        {/* screen */}
        <rect
          x={155}
          y={230}
          width={150}
          height={70}
          rx={8}
          fill="url(#screenGrad)"
          stroke={danger ? "#ff4a4a" : "#5aa9ff"}
          strokeWidth={2}
        />
        {/* rivets */}
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          return (
            <circle
              key={i}
              cx={230 + Math.cos(a) * 130}
              cy={280 + Math.sin(a) * 130}
              r={4}
              fill="#0a0b16"
              stroke="#3b3d55"
              strokeWidth={1}
            />
          );
        })}

        {/* selected wire indicator on screen */}
        {selected && (
          <text
            x={230}
            y={275}
            textAnchor="middle"
            fill={WIRE_HEX[selected]}
            fontFamily="Orbitron, monospace"
            fontWeight={700}
            fontSize={22}
            style={{ filter: `drop-shadow(0 0 6px ${WIRE_HEX[selected]})` }}
          >
            {selected.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  );
}
