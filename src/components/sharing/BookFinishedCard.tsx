export function BookFinishedCard({
  count,
  name,
  latestTitle,
}: {
  count: number;
  name: string;
  latestTitle?: string;
}) {
  return (
    <div
      style={{
        width: 320,
        height: 400,
        background: "linear-gradient(160deg, #24332B, #192319)",
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
        <div style={{ fontSize: 72 }}>📚</div>
        <div style={{ fontSize: 20, opacity: 0.85 }}>Acabei de ler</div>
        <div style={{ fontSize: 64, fontWeight: 800, color: "#D4A89C" }}>
          {count}
        </div>
        <div style={{ fontSize: 20, opacity: 0.85 }}>
          livro{count === 1 ? "" : "s"} este ano!
        </div>
      </div>
      <div style={{ fontSize: 14, opacity: 0.75, textAlign: "center" }}>
        {latestTitle ? `Último: ${latestTitle}` : name}
      </div>
    </div>
  );
}
