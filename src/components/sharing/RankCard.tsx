import { rankProgress } from "@/lib/constants";
import { formatXP } from "@/lib/utils/format";

export function RankCard({ xp, name }: { xp: number; name: string }) {
  const { current, next, pct } = rankProgress(xp);
  return (
    <div
      style={{
        width: 320,
        height: 400,
        background: "linear-gradient(160deg, #2C1523, #180C12)",
        borderRadius: 28,
        padding: 28,
        color: "#FDEEF3",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2 }}>READLY</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 80 }}>{current.emoji}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: current.color }}>
          {current.name}
        </div>
        <div style={{ fontSize: 16, opacity: 0.8 }}>{name}</div>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#FFC1D5" }}>
          {formatXP(xp)} XP
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: "#FFC1D5",
            }}
          />
        </div>
        {next && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Próximo: {next.emoji} {next.name}
          </div>
        )}
      </div>
    </div>
  );
}
