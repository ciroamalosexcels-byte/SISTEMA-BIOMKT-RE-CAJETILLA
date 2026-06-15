"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const MESES_CORTO = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

const NAVY = "#07152f";
const AMBER = "#f59e0b";

/* ── Shared primitives ─────────────────────────────────────────── */
function PanelHead({ title, badge, right }: { title: string; badge?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-[18px] py-2" style={{ background: NAVY }}>
      <span className="text-[12px] font-black tracking-[0.02em] uppercase text-white">{title}</span>
      <div className="flex items-center gap-2">
        {badge && <span className="text-[10px] font-[700] rounded-[6px] px-2 py-[2px]" style={{ background: "rgba(255,255,255,0.12)", color: "#94a3b8" }}>{badge}</span>}
        {right}
      </div>
    </div>
  );
}

function SumCard({ title, amount, color, sub }: { title: string; amount: React.ReactNode; color: string; sub: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden">
      <div className="px-[14px] py-2 text-[12px] font-black tracking-[0.02em] uppercase text-white whitespace-nowrap overflow-hidden text-ellipsis" style={{ background: NAVY }}>{title}</div>
      <div className="px-[14px] py-3">
        <div className="text-[24px] font-black leading-none tracking-tight" style={{ color }}>{amount}</div>
        <div className="text-[10px] font-[600] mt-1" style={{ color: "#94a3b8" }}>{sub}</div>
      </div>
    </div>
  );
}

const thCls = "bg-[#f8fafc] text-[10px] font-black tracking-[0.02em] uppercase text-slate-400 px-3 py-[7px] text-left border-b border-slate-200 whitespace-nowrap";
const tdCls = "px-3 py-2 text-[12px] font-[600] text-[#374151] border-b border-[#f1f5f9] align-middle";
const movThCls = "bg-[#f8fafc] text-[10px] font-black tracking-[0.02em] uppercase text-slate-400 px-[4px] py-[5px] text-left border-b border-slate-200 whitespace-nowrap";
const movTdCls = "px-[4px] py-[4px] text-[11px] font-[600] text-[#374151] border-b border-[#f1f5f9] align-middle whitespace-nowrap";
const addBtnCls = "flex items-center gap-[6px] px-[14px] py-[9px] text-[11px] font-black tracking-[0.02em] uppercase border-none cursor-pointer w-full text-left font-sans border-t border-[#fde68a]";

function EntradaBadge() {
  return <span className="inline-flex items-center gap-[5px] bg-[#dcfce7] text-[#16a34a] rounded-[8px] px-[9px] py-[3px] text-[11px] font-black uppercase tracking-[0.01em] whitespace-nowrap">↑ Entrada</span>;
}
function SalidaBadge() {
  return <span className="inline-flex items-center gap-[5px] bg-[#fee2e2] text-[#dc2626] rounded-[8px] px-[9px] py-[3px] text-[11px] font-black uppercase tracking-[0.01em] whitespace-nowrap">↓ Salida</span>;
}
function TfBadge() {
  return <span className="inline-block bg-[#dbeafe] text-[#2563eb] rounded-[6px] px-[7px] py-[2px] text-[10px] font-black uppercase">Transfer.</span>;
}
function EfBadge() {
  return <span className="inline-block bg-[#dcfce7] text-[#16a34a] rounded-[6px] px-[7px] py-[2px] text-[10px] font-black uppercase">Efectivo</span>;
}

/* ── Spreadsheet cell helpers ────────────────────────────────── */
function SlLabel({ children, variant = "dark" }: { children: React.ReactNode; variant?: "dark" | "amber" }) {
  return (
    <td className="text-[11px] font-black tracking-[0.02em] uppercase px-[14px] py-[7px] whitespace-nowrap border-b border-white/[0.06] w-[160px] min-w-[140px]"
      style={{ background: variant === "amber" ? AMBER : NAVY, color: variant === "amber" ? NAVY : "#fff" }}>
      {children}
    </td>
  );
}
function SlData({ children, alt, amber }: { children?: React.ReactNode; alt?: boolean; amber?: boolean }) {
  return (
    <td className="text-[12px] font-[700] text-center px-2 py-[5px] border-b border-l"
      style={{
        background: amber ? "#fef3c7" : alt ? "#f8fafc" : "#fff",
        color: amber ? "#92400e" : "#374151",
        fontWeight: amber ? 900 : 700,
        borderColor: amber ? "#fde68a" : "#f1f5f9",
      }}>
      {children}
    </td>
  );
}
function SlInput({ defaultValue, amber }: { defaultValue: string; amber?: boolean }) {
  return (
    <input
      defaultValue={defaultValue}
      className="bg-transparent border-none outline-none text-[12px] font-[700] text-center w-full cursor-text"
      style={{ color: amber ? "#92400e" : "inherit", fontFamily: "inherit" }}
    />
  );
}
function SlMonthHead({ label, year }: { label: string; year: string }) {
  return (
    <td className="text-[13px] font-black text-center px-2 py-[5px] border-b border-l border-white/[0.06]"
      style={{ background: NAVY, color: AMBER }}>
      {label} {year}
    </td>
  );
}

/* ─────────────────────────────────────────────────────────────── */
export function CajaView() {
  const now = new Date();
  const [navYear, setNavYear] = useState(now.getFullYear());
  const [navMonth, setNavMonth] = useState(now.getMonth());
  const [extraRows, setExtraRows] = useState<string[]>([]);

  function prevMonth() {
    if (navMonth === 0) { setNavMonth(11); setNavYear(y => y - 1); }
    else setNavMonth(m => m - 1);
  }
  function nextMonth() {
    if (navMonth === 11) { setNavMonth(0); setNavYear(y => y + 1); }
    else setNavMonth(m => m + 1);
  }
  function goToday() {
    const t = new Date();
    setNavYear(t.getFullYear());
    setNavMonth(t.getMonth());
  }

  const projMonths = Array.from({ length: 5 }, (_, i) => {
    const m = (navMonth + i) % 12;
    const y = navYear + Math.floor((navMonth + i) / 12);
    return { label: MESES_CORTO[m], year: String(y).slice(2) };
  });

  const mesLabel = MESES[navMonth].charAt(0) + MESES[navMonth].slice(1).toLowerCase();

  return (
    <div className="flex flex-col min-h-full bg-[#f1f5f9] pb-16 text-[13px]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-7 py-[22px] flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[22px] font-black text-slate-900">CAJA</div>
          <div className="text-[10px] font-[700] tracking-[0.02em] uppercase text-slate-400 mt-[2px]">
            Biomarketing · {mesLabel} {navYear}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="bg-[#f8fafc] border border-slate-200 text-[#374151] rounded-lg px-3 py-1 font-black text-[14px] cursor-pointer hover:bg-slate-100">‹</button>
          <div className="bg-[#f8fafc] border border-slate-200 rounded-[10px] px-4 py-1 text-[12px] font-black min-w-[140px] text-center text-[#1e293b]">
            {MESES[navMonth]} {navYear}
          </div>
          <button onClick={nextMonth} className="bg-[#f8fafc] border border-slate-200 text-[#374151] rounded-lg px-3 py-1 font-black text-[14px] cursor-pointer hover:bg-slate-100">›</button>
          <button onClick={goToday} className="rounded-lg px-3 py-1 text-[11px] font-black cursor-pointer border-none" style={{ background: AMBER, color: NAVY }}>HOY</button>
        </div>
      </div>

      <div className="flex flex-col gap-[18px] px-7 py-5">

        {/* ── 1. Resumen ────────────────────────────────────── */}
        <div>
          <div className="text-[10px] font-black tracking-[0.02em] uppercase text-slate-400 py-1 mb-2">RESUMEN DE CAJA</div>
          <div className="grid grid-cols-5 gap-3">
            <SumCard title="Total Entrada Mes" amount="$4.850.000" color="#16a34a" sub="calculado desde movimientos" />
            <SumCard title="Total Salidas Mes" amount="$2.130.000" color="#dc2626" sub="calculado desde movimientos" />
            <SumCard title="Total en Caja" amount="$2.720.000" color="#d97706" sub="saldo ant. + entradas − salidas" />
            <SumCard
              title="Total Deuda"
              amount={
                <input defaultValue="6.500 USD" className="bg-transparent border-none outline-none text-[24px] font-black leading-none tracking-tight w-full cursor-text" style={{ color: "#dc2626", fontFamily: "inherit" }} />
              }
              color="#dc2626"
              sub="editable manualmente"
            />
            <SumCard title="Total en Calle (me deben)" amount="$980.000" color="#7c3aed" sub="calculado desde ingresos" />
          </div>
        </div>

        {/* ── 2. Movimientos (fila completa) ───────────────── */}
        <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden">
          <PanelHead
            title="Movimientos Diarios"
            badge="74 registros"
            right={
              <button className="flex items-center justify-center w-[26px] h-[26px] rounded-lg border-none text-[18px] font-black cursor-pointer leading-none" style={{ background: AMBER, color: NAVY }}>+</button>
            }
          />
          <div className="flex items-center justify-between px-4 py-[9px] border-b border-[#fde68a]" style={{ background: "#fffbeb" }}>
            <span className="text-[11px] font-black tracking-[0.02em] uppercase" style={{ color: "#92400e" }}>Saldo mes anterior — {navMonth === 0 ? MESES[11] + " " + (navYear - 1) : MESES[navMonth - 1] + " " + navYear}</span>
            <span className="text-[16px] font-black flex-shrink-0 ml-4" style={{ color: "#d97706" }}>$1.890.000</span>
          </div>
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "7%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                {["Día","Concepto","Tipo","Monto","Cat.","Medio","Saldo"].map((h,i) => <th key={i} className={movThCls}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { day:"01/06", concepto:"Marcos Ruiz",     entrada:true,  monto:"+$450.000", cat:"Servicios",   medio:"tf", saldo:"$2.340.000" },
                { day:"02/06", concepto:"Alquiler oficina", entrada:false, monto:"−$120.000", cat:"Alquiler",    medio:"ef", saldo:"$2.220.000" },
                { day:"05/06", concepto:"Laura González",   entrada:true,  monto:"+$680.000", cat:"Audiovisual", medio:"tf", saldo:"$2.900.000" },
                { day:"07/06", concepto:"Proveedores",      entrada:false, monto:"−$85.000",  cat:"Proveedor",   medio:"ef", saldo:"$2.815.000" },
                { day:"10/06", concepto:"Carlos Medina",    entrada:true,  monto:"+$900.000", cat:"Branding",    medio:"tf", saldo:"$3.715.000" },
                { day:"14/06", concepto:"Sueldos equipo",   entrada:false, monto:"−$800.000", cat:"Equipos",     medio:"tf", saldo:"$2.915.000" },
              ].map((r, i) => (
                <tr key={i} className="hover:bg-[#fafafa]">
                  <td className={movTdCls} style={{ color: "#94a3b8" }}>{r.day}</td>
                  <td className={`${movTdCls} truncate`}>{r.concepto}</td>
                  <td className={movTdCls}>
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-black" style={{ background: r.entrada ? "#dcfce7" : "#fee2e2", color: r.entrada ? "#16a34a" : "#dc2626" }}>
                      {r.entrada ? "↑" : "↓"}
                    </span>
                  </td>
                  <td className={`${movTdCls} font-black`} style={{ color: r.entrada ? "#16a34a" : "#dc2626" }}>{r.monto}</td>
                  <td className={`${movTdCls} truncate`} style={{ color: "#64748b" }}>{r.cat}</td>
                  <td className={movTdCls}>{r.medio === "tf" ? <TfBadge /> : <EfBadge />}</td>
                  <td className={`${movTdCls} font-black`} style={{ color: "#d97706" }}>{r.saldo}</td>
                </tr>
              ))}
              <tr style={{ background: "#fffbeb" }}>
                <td colSpan={2} className="px-[4px] py-[4px] font-black text-[11px] border-t border-[#fde68a]" style={{ color: "#d97706" }}>TOTAL DEL MES</td>
                <td className="px-[4px] py-[4px] border-t border-[#fde68a]"></td>
                <td className="px-[4px] py-[4px] font-black text-[10px] border-t border-[#fde68a]" style={{ color: "#16a34a" }}>+$4.850k / <span style={{ color: "#dc2626" }}>−$2.130k</span></td>
                <td className="px-[4px] py-[4px] border-t border-[#fde68a]"></td>
                <td className="px-[4px] py-[4px] border-t border-[#fde68a]"></td>
                <td className="px-[4px] py-[4px] font-black text-[11px] border-t border-[#fde68a]" style={{ color: "#d97706" }}>$2.720.000</td>
              </tr>
            </tbody>
          </table>
          <button className={addBtnCls} style={{ background: "#fffbeb", color: "#d97706" }}>＋ Agregar movimiento</button>
        </div>

        {/* ── 2b. Gastos + Por Medio (2 columnas) ──────────── */}
        <div className="grid grid-cols-2 gap-[18px] items-start">
          {/* Gastos por Categoría */}
          <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden">
            <PanelHead title="Gastos por Categoría" badge="calc." />
            {[
              { label: "Papelería",    val: "$85.000" },
              { label: "Herramientas", val: "$120.000" },
              { label: "Equipo",       val: "$800.000" },
              { label: "Alquiler",     val: "$120.000" },
              { label: "Proveedores",  val: "$300.000" },
              { label: "Varios",       val: "$95.000" },
              { label: "Servicios",    val: "$180.000" },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between px-4 py-2 border-b border-[#f1f5f9]">
                <span className="text-[11px] font-[700] uppercase tracking-[0.02em] text-slate-500">{r.label}</span>
                <span className="text-[14px] font-black text-[#dc2626]">{r.val}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2" style={{ background: "#fffbeb" }}>
              <span className="text-[11px] font-[700] uppercase tracking-[0.02em]" style={{ color: "#d97706" }}>Total</span>
              <span className="text-[16px] font-black" style={{ color: "#d97706" }}>$1.700.000</span>
            </div>
          </div>

          {/* Resumen de Caja */}
          <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden">
            <PanelHead title="Resumen de Caja" badge="calc." />
            {[
              { label: "↑ Transfer.",  val: "$3.870.000", color: "#2563eb" },
              { label: "↓ Transfer.",  val: "$680.000",   color: "#dc2626" },
              { label: "↑ Efectivo",   val: "$980.000",   color: "#16a34a" },
              { label: "↓ Efectivo",   val: "$320.000",   color: "#dc2626" },
              { label: "↑ Servicios",  val: "$4.200.000", color: "#16a34a" },
              { label: "↑ Inversión",  val: "$650.000",   color: "#16a34a" },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between px-4 py-2 border-b border-[#f1f5f9]">
                <span className="text-[11px] font-[700] uppercase tracking-[0.02em] text-slate-500">{r.label}</span>
                <span className="text-[14px] font-black" style={{ color: r.color }}>{r.val}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2" style={{ background: "#fffbeb" }}>
              <span className="text-[11px] font-[700] uppercase tracking-[0.02em]" style={{ color: "#d97706" }}>Total ↑</span>
              <span className="text-[16px] font-black" style={{ color: "#d97706" }}>$4.850.000</span>
            </div>
          </div>
        </div>

        {/* ── 3. Ingresos por Cliente ───────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden">
          <PanelHead title="Ingresos por Cliente" badge="21 clientes" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["N°","Cliente","Tipo servicio","Ticket","Cobrado","Deuda","Fecha cobro"].map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { n:1, cliente:"Marcos Ruiz",      tipo:"Audiovisual", ticket:"$450.000",   cobrado:"$450.000",  deuda:"$0",       fecha:"01/06",    dc:"green", dd:"green" },
                  { n:2, cliente:"Laura González",   tipo:"Audiovisual", ticket:"$680.000",   cobrado:"$680.000",  deuda:"$0",       fecha:"05/06",    dc:"green", dd:"green" },
                  { n:3, cliente:"Carlos Medina",    tipo:"Branding",    ticket:"$1.200.000", cobrado:"$900.000",  deuda:"$300.000", fecha:"1 al 10",  dc:"amber", dd:"red"   },
                  { n:4, cliente:"Ana Torres",       tipo:"Pág. Web",    ticket:"$900.000",   cobrado:"—",         deuda:"$900.000", fecha:"—",        dc:"gray",  dd:"red"   },
                  { n:5, cliente:"Diego Fernández",  tipo:"Estrategia",  ticket:"$600.000",   cobrado:"$600.000",  deuda:"$0",       fecha:"20/06",    dc:"green", dd:"green" },
                ].map(r => {
                  const cColor = r.dc === "green" ? "#16a34a" : r.dc === "amber" ? "#d97706" : "#94a3b8";
                  const dColor = r.dd === "green" ? "#16a34a" : "#dc2626";
                  return (
                    <tr key={r.n} className="hover:bg-[#fafafa]">
                      <td className={tdCls} style={{ color: "#94a3b8" }}>{r.n}</td>
                      <td className={tdCls}>{r.cliente}</td>
                      <td className={tdCls}>{r.tipo}</td>
                      <td className={tdCls}>{r.ticket}</td>
                      <td className={`${tdCls} font-black`} style={{ color: cColor }}>{r.cobrado}</td>
                      <td className={`${tdCls} font-black`} style={{ color: dColor }}>{r.deuda}</td>
                      <td className={tdCls} style={{ color: "#94a3b8" }}>{r.fecha}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: "#fffbeb" }}>
                  <td colSpan={3} className="px-3 py-2 font-black text-[13px] border-t border-[#fde68a]" style={{ color: "#d97706" }}>TOTAL</td>
                  <td className="px-3 py-2 font-black text-[13px] border-t border-[#fde68a]" style={{ color: "#d97706" }}>$4.850.000</td>
                  <td className="px-3 py-2 font-black text-[13px] border-t border-[#fde68a]" style={{ color: "#d97706" }}>$3.870.000</td>
                  <td className="px-3 py-2 font-black text-[13px] border-t border-[#fde68a]" style={{ color: "#d97706" }}>$980.000</td>
                  <td className="px-3 py-2 border-t border-[#fde68a]" style={{ color: "#94a3b8" }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button className={addBtnCls} style={{ background: "#fffbeb", color: "#d97706" }}>＋ Agregar ingreso</button>
        </div>

        {/* ── 4. Proyección de Servicios ───────────────────── */}
        <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden">
          <PanelHead title="Proyección de Servicios por Mes" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 600 }}>
              <tbody>
                <tr>
                  <SlLabel>SERVICIO</SlLabel>
                  {projMonths.map(m => <SlMonthHead key={m.label + m.year} label={m.label} year={m.year} />)}
                  <td className="text-center px-2 py-[5px] border-b border-l border-white/[0.06] text-[13px] font-black" style={{ background: NAVY, color: AMBER }}>PROMEDIO $</td>
                  <td className="text-center px-2 py-[5px] border-b border-l border-white/[0.06] text-[13px] font-black" style={{ background: NAVY, color: AMBER }}>HORAS APROX.</td>
                </tr>
                {[
                  { name: "BRANDING",      vals: ["3","3","5","5","9"],  avg:"$700k", hs:"9hs" },
                  { name: "PÁGINA WEB",    vals: ["5","5","5","8","13"], avg:"$600k", hs:"9hs", alt: true },
                  { name: "EST. MARCA 9M", vals: ["—","3","5","8","9"],  avg:"$600k", hs:"9hs" },
                  { name: "AUDIOVISUAL",   vals: ["13","18","11","13","21"],avg:"$400k",hs:"8hs", alt: true },
                  { name: "EVENTO",        vals: ["0","0","1","0","1"],  avg:"$1.5M", hs:"53hs" },
                ].map(row => (
                  <tr key={row.name}>
                    <SlLabel>{row.name}</SlLabel>
                    {row.vals.map((v, i) => (
                      <SlData key={i} alt={row.alt}><SlInput defaultValue={v} /></SlData>
                    ))}
                    <SlData alt={row.alt}><SlInput defaultValue={row.avg} /></SlData>
                    <SlData alt={row.alt}><SlInput defaultValue={row.hs} /></SlData>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 5. Sueldos y Gastos ──────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden">
          <PanelHead title="Sueldos y Gastos Proyectados" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 600 }}>
              <tbody>
                {/* Facturación */}
                <tr>
                  <SlLabel variant="amber">FACTURACIÓN</SlLabel>
                  {["$ 9.450","$ 14.100","$ 15.400","$ 18.300","$ 29.400"].map((v, i) => (
                    <SlData key={i} amber><SlInput defaultValue={v} amber /></SlData>
                  ))}
                </tr>
                {/* Meses header */}
                <tr>
                  <SlLabel>DESCRIPCIÓN</SlLabel>
                  {projMonths.map(m => <SlMonthHead key={m.label + m.year} label={m.label} year={m.year} />)}
                </tr>
                {/* HS Homb */}
                <tr>
                  <SlLabel variant="amber">HS HOMB. X3</SlLabel>
                  {["8 HS L.S","8 HS L.S","8 HS L.S","8 HS L.S","8 HS L.S"].map((v, i) => (
                    <SlData key={i} amber><SlInput defaultValue={v} amber /></SlData>
                  ))}
                </tr>
                {/* Equipo */}
                {[
                  { name:"LOREN",  vals:["$800","$800","$800","$1.000","$1.200"],      alt:false },
                  { name:"MATEO",  vals:["$700","$700","$700","$1.000","$1.200"],      alt:true  },
                  { name:"MARTIN", vals:["$500","$500","$500","$1.000","$1.200"],      alt:false },
                  { name:"CIRO",   vals:["$500","$700","$700","$1.000","$1.200"],      alt:true  },
                  { name:"PROOVEDORES", vals:["$500","$1.000","$3.000","$5.000","$8.000"], alt:false },
                  { name:"SISTEMA",     vals:["$600","$0","$0","$0","$0"],             alt:true  },
                  { name:"LUZ GAS INT", vals:["$0","$0","$200","$300","$300"],         alt:false },
                  { name:"EXTRAS VARIOS", vals:["$100","$200","$300","$300","$500"],   alt:true  },
                  { name:"GAST PAPELERIO", vals:["$130","$200","$200","$300","$300"],  alt:false },
                  { name:"ALQUILER",    vals:["$320","$400","$500","$500","$600"],     alt:true  },
                  { name:"COM PUB MKT", vals:["$200","$300","$700","$400","$400"],     alt:false },
                  { name:"BIENESTAR",   vals:["$0","$0","$200","$300","$500"],         alt:true  },
                  { name:"RE INVERSIÓN",vals:["$0","$500","$500","$500","$500"],       alt:false },
                ].map(row => (
                  <tr key={row.name}>
                    <SlLabel>{row.name}</SlLabel>
                    {row.vals.map((v, i) => (
                      <SlData key={i} alt={row.alt}><SlInput defaultValue={v} /></SlData>
                    ))}
                  </tr>
                ))}
                {/* Extra rows */}
                {extraRows.map((_, idx) => (
                  <tr key={`extra-${idx}`}>
                    <td className="px-[8px] py-1 border-b border-white/[0.06]" style={{ background: NAVY }}>
                      <input className="bg-transparent border-none outline-none text-[11px] font-black uppercase w-full text-white" placeholder="Concepto..." style={{ fontFamily: "inherit" }} />
                    </td>
                    {[0,1,2,3,4].map(i => (
                      <SlData key={i}><SlInput defaultValue="$0" /></SlData>
                    ))}
                  </tr>
                ))}
                {/* Add row */}
                <tr>
                  <td colSpan={6} className="p-0 border-b border-[#fde68a]">
                    <button onClick={() => setExtraRows(r => [...r, ""])} className={addBtnCls} style={{ background: "#fffbeb", color: "#d97706" }}>＋ Agregar fila</button>
                  </td>
                </tr>
                {/* Totales */}
                <tr>
                  <SlLabel variant="amber">TOTAL DE GASTOS</SlLabel>
                  {["$ 0","$ 5.300","$ 0","$ 11.600","$ 15.900"].map((v, i) => (
                    <SlData key={i} amber><SlInput defaultValue={v} amber /></SlData>
                  ))}
                </tr>
                <tr>
                  <SlLabel variant="amber">GANANCIA</SlLabel>
                  {["$ 0","$ 8.800","$ 0","$ 0","$ 13.500"].map((v, i) => (
                    <SlData key={i} amber><SlInput defaultValue={v} amber /></SlData>
                  ))}
                </tr>
                <tr>
                  <SlLabel variant="amber">FACTURACIÓN</SlLabel>
                  {["","$ 14.100","","$ 18.300","$ 29.400"].map((v, i) => (
                    <SlData key={i} amber><SlInput defaultValue={v} amber /></SlData>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 6. Precios de Servicio ───────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden">
          <PanelHead title="Precios de Servicio" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 400 }}>
              <tbody>
                <tr>
                  <SlLabel>SERVICIO</SlLabel>
                  {["TIPO A","TIPO B","TIPO C"].map(t => (
                    <td key={t} className="text-center px-2 py-[5px] border-b border-l border-white/[0.06] text-[13px] font-black" style={{ background: NAVY, color: AMBER }}>{t}</td>
                  ))}
                </tr>
                {[
                  { name:"BRANDING",    vals:["$1M – $1.5M","$500k – $800k","$300k – $400k"],   alt:false },
                  { name:"PÁGINA WEB",  vals:["$1.3M – $1.8M","$600k – $900k","$400k – $500k"], alt:true  },
                  { name:"ESTRATEGIA",  vals:["$1M – $1.5M","$600k – $800k","$300k – $400k"],   alt:false },
                  { name:"AUDIOVISUAL", vals:["$900k – $1.2M","$450k – $600k","$300k – $400k"], alt:true  },
                  { name:"EVENTOS",     vals:["$3M – $5M","$1.5M – $2M","$900k – $1.2M"],       alt:false },
                ].map(row => (
                  <tr key={row.name}>
                    <SlLabel variant="amber">{row.name}</SlLabel>
                    {row.vals.map((v, i) => (
                      <SlData key={i} alt={row.alt}><SlInput defaultValue={v} /></SlData>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
