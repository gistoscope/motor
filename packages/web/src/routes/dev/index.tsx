import React, { useMemo, useState } from "react";

/**
 * /dev  индексная страница раздела разработчика.
 * Ниже встроена двухпанельная DEV CONSOLE (Input/Display),
 * чтобы не трогать роутер и сразу получить рабочее окно ввода.
 */

const Item: React.FC<{ href: string; label: string; note?: string }> = ({ href, label, note }) => (
  <a href={href} style={{
    display:"block", padding:"14px 16px", margin:"8px 0",
    border:"1px solid #E5E7EB", borderRadius:12, textDecoration:"none", color:"#0F172A",
    background:"linear-gradient(180deg,#F8FAFC 0%,#FFFFFF 60%)", boxShadow:"0 1px 2px rgba(0,0,0,0.04)"
  }}>
    <div style={{fontWeight:600}}>{label}</div>
    {note ? <div style={{fontSize:12,color:"#64748B"}}>{note}</div> : null}
  </a>
);

export default function DevIndex() {
  return (
    <div style={{padding:24, maxWidth:960, margin:"0 auto", display:"grid", gap:16}}>
      <h1 style={{marginTop:0}}>Motor Dev</h1>
      <div style={{fontSize:12, color:"#16A34A"}}>Tools are enabled</div>

      <Item href="/dev/step" label="DEV STEP" note="Маршрут отладочного шага" />
      <Item href="/demo/highlight" label="DEMO HIGHLIGHT" note="Демо подсветки (dual-ring halo)" />

      <hr style={{border:"none", borderTop:"1px solid #E5E7EB", margin:"16px 0"}} />

      <h2 style={{margin:"8px 0"}}>DEV CONSOLE</h2>
      <div style={{fontSize:12, color:"#64748B", marginTop:-4, marginBottom:8}}>
        Двухпанельный редактор: слева ввод (ASCII/LaTeX), справа предпросмотр.
        Позже сюда подключим @motor/parser и KaTeX.
      </div>

      <InlineDevConsole />
    </div>
  );
}

/** Встроенная двухпанельная консоль (без внешних зависимостей) */
function InlineDevConsole() {
  type Mode = "ascii" | "latex";
  const [mode, setMode] = useState<Mode>("ascii");
  const [text, setText] = useState<string>("(1/2 + 1/3) ^ 2");

  const placeholder =
    mode === "ascii"
      ? "Пример (ASCII): (1/2 + 1/3) ^ 2"
      : "Пример (LaTeX): \\\\frac{1}{2} + \\\\frac{1}{3}";

  const preview = useMemo(() => {
    // Пока просто выводим исходный текст. Позже подключим parser/KaTeX.
    return text;
  }, [text]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <section style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Input</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={pill(mode === "ascii")}>
              <input type="radio" name="mode" value="ascii"
                checked={mode === "ascii"} onChange={() => setMode("ascii")} style={{ display: "none" }} />
              ASCII
            </label>
            <label style={pill(mode === "latex")}>
              <input type="radio" name="mode" value="latex"
                checked={mode === "latex"} onChange={() => setMode("latex")} style={{ display: "none" }} />
              LaTeX
            </label>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          style={{
            width: "100%",
            height: 360,
            resize: "vertical",
            fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14, lineHeight: "22px", padding: 12,
            borderRadius: 12, border: "1px solid #E5E7EB", outline: "none",
          }}
        />
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Display</h3>
          <span style={{ fontSize: 12, color: "#64748B" }}>
            {mode === "latex" ? "KaTeX preview (TODO)" : "Plain preview"}
          </span>
        </div>

        <div
          style={{
            minHeight: 360, padding: 16, borderRadius: 12,
            border: "1px solid #E5E7EB",
            background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 60%)",
            fontFamily:
              mode === "ascii"
                ? "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                : "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontSize: mode === "ascii" ? 14 : 18,
          }}
          aria-live="polite"
        >
          {preview}
        </div>
      </section>
    </div>
  );
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid " + (active ? "#2563EB" : "#E5E7EB"),
    color: active ? "#0B4FD6" : "#475569",
    fontSize: 12,
    cursor: "pointer",
    userSelect: "none",
  };
}
