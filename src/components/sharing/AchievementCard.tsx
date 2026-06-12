import type { Badge } from "@/types";

export function AchievementCard({ badge, name }: { badge: Badge; name: string }) {
  return (
    <div
      style={{
        width: 320,
        height: 400,
        background: "linear-gradient(160deg, #2C3D33, #1F2D26)",
        borderRadius: 28,
        padding: 28,
        color: "#F7EAE6",
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
        <div style={{ fontSize: 26, fontWeight: 800, color: "#D4A89C" }}>
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
