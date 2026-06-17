export function StreakCard({ current, name }: { current: number; name: string }) {
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
        <div style={{ fontSize: 96 }}>🔥</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#FFC1D5" }}>
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
