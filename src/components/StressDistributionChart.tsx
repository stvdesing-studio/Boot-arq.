import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Activity, ShieldAlert, Cpu } from "lucide-react";

interface StressDistributionChartProps {
  complexity: number;
  finish: string;
  style: string;
}

export default function StressDistributionChart({
  complexity,
  finish,
  style
}: StressDistributionChartProps) {
  // Generate stress curve data dynamically based on architectural inputs
  const data = useMemo(() => {
    // Material maximum plastic threshold (MPa)
    let elasticLimit = 400; // default Corten / Steel
    const fLower = finish.toLowerCase();
    if (fLower.includes("titanio")) {
      elasticLimit = 880; // aerospace grade
    } else if (fLower.includes("inoxidable")) {
      elasticLimit = 520; // high alloy
    } else if (fLower.includes("cromo")) {
      elasticLimit = 650;
    } else if (fLower.includes("hierro")) {
      elasticLimit = 280; // lower ductile iron
    } else if (fLower.includes("cobre")) {
      elasticLimit = 220; // soft metal
    }

    // Complexity amplifier factor
    const compAmp = 0.4 + (complexity / 10) * 1.2;

    // Style tension profile multiplier
    let styleFactor = 1.0;
    const sLower = style.toLowerCase();
    if (sLower.includes("tensegridad") || sLower.includes("tensegrity")) {
      styleFactor = 1.4; // extremely high cable tension
    } else if (sLower.includes("voladizo") || sLower.includes("cantilever")) {
      styleFactor = 1.25; // high localized moment
    } else if (sLower.includes("recíproca") || sLower.includes("recip")) {
      styleFactor = 0.85; // highly distributed loads
    } else if (sLower.includes("voro") || sLower.includes("celular")) {
      styleFactor = 0.95; // optimized organic flow
    }

    // Node structural segments
    const segments = [
      { name: "Anclaje Núcleo", baseStress: 80 },
      { name: "Brida de Junta", baseStress: 140 },
      { name: "Perno Cortante", baseStress: 220 },
      { name: "Cordón Soldado", baseStress: 190 },
      { name: "Filamento Tensor", baseStress: 110 },
      { name: "Placa Apoyo", baseStress: 60 }
    ];

    return segments.map((seg, idx) => {
      // Calculate dynamic stress profile based on complexity and position
      // Add subtle sinus noise matching the segment index to look organic
      const baseVal = seg.baseStress;
      const noise = Math.sin(idx * 1.5 + complexity) * 20;
      const computedStress = Math.round(Math.max(10, baseVal * compAmp * styleFactor + noise));
      
      // Calculate active safety coefficient
      const safetyMargin = Math.round((elasticLimit / Math.max(1, computedStress)) * 100) / 100;

      return {
        segment: seg.name,
        "Tensión Activa (MPa)": computedStress,
        "Límite Elástico (MPa)": elasticLimit,
        "Factor Seguridad": safetyMargin
      };
    });
  }, [complexity, finish, style]);

  // Compute overall summary stats
  const maxStress = useMemo(() => {
    return Math.max(...data.map(d => d["Tensión Activa (MPa)"]));
  }, [data]);

  const limitVal = data[0]?.["Límite Elástico (MPa)"] || 400;
  const isDanger = maxStress >= limitVal * 0.95;
  const activeSafetyFactor = Math.round((limitVal / Math.max(1, maxStress)) * 100) / 100;

  return (
    <div id="stress-distribution-analysis" className="bg-white p-5 border-2 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,1)] mt-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1a1a1a]/15 pb-3">
        <div className="flex items-center gap-2">
          {/* Subtle cyan detail */}
          <div className="p-1.5 bg-[#1a1a1a] border border-[#00ffff] text-[#00ffff] rounded-none">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black font-display text-black uppercase tracking-widest">
              A.F.E. • Simulador de Distribución de Tensiones
            </h4>
            <p className="text-[9.5px] font-mono tracking-wider font-bold text-[#1a1a1a]/60">
              // NODO_VCS01_TELEMETRÍA // COMPLEJIDAD {complexity}/10 ({finish})
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          {isDanger ? (
            <span className="bg-rose-50 text-rose-700 text-[9px] font-mono font-bold px-2.5 py-1 border-2 border-rose-600 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600 animate-pulse" /> SOBREESFUERZO LÍMITE
            </span>
          ) : (
            /* Yellow zone / hub area must use a highly visible dark gray / black text */
            <span className="bg-[#00ffff] text-[#1a1a1a] text-[9px] font-display font-black px-2.5 py-1 border-2 border-[#1a1a1a] flex items-center gap-1 shadow-[2px_2px_0px_rgba(26,26,26,1)]">
              <Cpu className="w-3 h-3 text-[#1a1a1a] animate-pulse" /> SEGURIDAD: ESTABLE
            </span>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-44 cursor-default">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: -22, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ffff" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#00ffff" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorLimit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(26, 26, 26, 0.1)" />
            <XAxis 
              dataKey="segment" 
              stroke="#1a1a1a" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#1a1a1a', fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}
            />
            <YAxis 
              stroke="#1a1a1a" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false}
              unit="M"
              tick={{ fill: '#1a1a1a', fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#f8f7f4",
                borderColor: "#1a1a1a",
                borderWidth: "2px",
                borderRadius: "0px",
                fontSize: "10px",
                fontFamily: "JetBrains Mono, monospace",
                color: "#1a1a1a"
              }}
              labelStyle={{ color: "#1a1a1a", fontWeight: "bold" }}
              itemStyle={{ padding: "1px 0" }}
            />
            <Legend 
              verticalAlign="top" 
              height={26} 
              iconSize={6}
              wrapperStyle={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#1a1a1a" }}
            />
            <Area
              name="Tensión Activa"
              type="monotone"
              dataKey="Tensión Activa (MPa)"
              stroke="#00ffff"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorStress)"
              isAnimationActive={false}
            />
            <Area
              name="Límite Elástico"
              type="monotone"
              dataKey="Límite Elástico (MPa)"
              stroke="#1a1a1a"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorLimit)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Numerical diagnostics panel */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono border-t border-[#1a1a1a]/15 pt-3">
        <div className="bg-[#f8f7f4] p-2 border border-[#1a1a1a]/15 text-left">
          <p className="text-[8px] text-[#1a1a1a]/60 uppercase font-extrabold tracking-widest font-mono">// ESFUERZO_PICO</p>
          <p className={`font-black font-display text-sm mt-0.5 ${isDanger ? "text-rose-600 animate-pulse" : "text-[#1a1a1a]"}`}>
            {maxStress} MPa
          </p>
        </div>
        <div className="bg-[#f8f7f4] p-2 border border-[#1a1a1a]/15 text-left">
          <p className="text-[8px] text-[#1a1a1a]/60 uppercase font-extrabold tracking-widest font-mono">// CAPACIDAD_LIMITE</p>
          <p className="font-black font-display text-sm mt-0.5 text-[#1a1a1a]">
            {limitVal} MPa
          </p>
        </div>
        <div className="bg-[#f8f7f4] p-2 border border-[#1a1a1a]/15 text-left">
          <p className="text-[8px] text-[#1a1a1a]/60 uppercase font-extrabold tracking-widest font-mono">// COEF_SEGURIDAD</p>
          <p className={`font-black font-display text-sm mt-0.5 ${activeSafetyFactor < 1.15 ? "text-rose-600 animate-pulse" : activeSafetyFactor < 2.0 ? "text-black bg-[#00ffff]/15 px-1 inline-block" : "text-[#1a1a1a]"}`}>
            {activeSafetyFactor} {activeSafetyFactor < 1.0 ? "⚠️" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
