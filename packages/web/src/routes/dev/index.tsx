import React from "react";
import DevConsoleRoute from "./console"; // наша двухпанельная консоль

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

      {/* Встраиваем консоль прямо на страницу /dev */}
      <DevConsoleRoute />
    </div>
  );
}
