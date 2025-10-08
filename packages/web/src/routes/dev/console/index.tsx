import React, { useMemo, useState } from "react";

/**
 * /dev/console  минимальная консоль ввода/предпросмотра.
 * Слева: Input (режим ASCII или LaTeX).
 * Справа: Display (пока текстовый предпросмотр; место под KaTeX отмечено).
 *
 * Никаких внешних зависимостей: сборка не ломается.
 * Позже легко втыкаем @motor/parser для разбора и KaTeX для рендера.
 */

type Mode = "ascii" | "latex";

export default function DevConsoleRoute() {
  const [mode, setMode] = useState<Mode>("ascii");
  const [text, setText] = useState<string>("(x/n! ) = e^x");

  const label = mode === "ascii" ? "ASCII input" : "LaTeX input";
  const placeholder =
    mode === "ascii"
      ? "Пример (ASCII): (1/2 + 1/3) ^ 2"
      : "Пример (LaTeX): \\frac{1}{2} + \\frac{1}{3}";

  // На будущее: здесь же можно подключить @motor/parser и KaTeX.
  const preview = useMemo(() => {
    // Пока просто показываем исходный текст без рендера KaTeX.
    return text;
  }, [text]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 24 }}>
      <section style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Input</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={pill(mode === "ascii")}>
              <input
                type="radio"
                name="mode"
                value="ascii"
                checked={mode === "ascii"}
                onChange={() => setMode("ascii")}
                style={{ display: "none" }}
              />
              ASCII
            </label>
            <label style={pill(mode === "latex")}>
              <input
                type="radio"
                name="mode"
                value="latex"
                checked={mode === "latex"}
                onChange={() => setMode("latex")}
                style={{ display: "none" }}
              />
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
            fontSize: 14,
            lineHeight: "22px",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            outline: "none",
          }}
        />
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Display</h2>
          <span style={{ fontSize: 12, color: "#64748B" }}>
            {mode === "latex" ? "KaTeX preview (TODO)" : "Plain preview"}
          </span>
        </div>
        <div
          style={{
            minHeight: 360,
            padding: 16,
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 60%)",
            fontFamily:
              mode === "ascii"
                ? "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                : "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: mode === "ascii" ? 14 : 18,
          }}
          aria-live="polite"
        >
          {preview}
        </div>

        <div style={{ fontSize: 12, color: "#64748B" }}>
          Планы:
          <ul style={{ margin: "8px 0 0 16px" }}>
            <li>подключить @motor/parser  разбор и нормализация;</li>
            <li>подключить KaTeX  рендер в правой панели при режиме LaTeX;</li>
            <li>кнопки: Format, Simplify, Export (SVG/PNG);</li>
            <li>передать выделение в Highlight Lab (pin on click).</li>
          </ul>
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
