export function StreakCard({ current, name }: { current: number; name: string }) {
  return (
    <div
      style={{
        width: 320,
        height: 400,
        background: "linear-gradient(160deg, #3E2D31, #2D1F23)",
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
        <div style={{ fontSize: 96 }}>🔥</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#98BDA8" }}>
          {current}
        </div>
        <div style={{ fontSize: 18, opacity: 0.85 }}>dias seguidos lendo</div>
      </div>
      <div style={{ fontSize: 16, opacity: 0.8, textAlign: "center" }}>
        {name} está em chamas 📚
      </div>
    </div>
  );
}
