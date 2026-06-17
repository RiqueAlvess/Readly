import type { Badge } from "@/types";

export function AchievementCard({ badge, name }: { badge: Badge; name: string }) {
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
        <div style={{ fontSize: 18, opacity: 0.7, letterSpacing: 1 }}>
          CONQUISTA DESBLOQUEADA
        </div>
        <div style={{ fontSize: 96, margin: "12px 0" }}>{badge.icon}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#FFC1D5" }}>
          {badge.name}
        </div>
        <div style={{ fontSize: 14, opacity: 0.8, marginTop: 6 }}>
          {badge.description}
        </div>
      </div>
      <div style={{ fontSize: 14, opacity: 0.75, textAlign: "center" }}>
        {name}
      </div>
    </div>
  );
}
