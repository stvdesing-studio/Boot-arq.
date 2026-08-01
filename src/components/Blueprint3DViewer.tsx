import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCw,
  Sliders,
  ZoomIn,
  ZoomOut,
  Info,
  Layers,
  Sparkles,
  Compass,
  Activity,
  AlertTriangle
} from "lucide-react";
import { Point3D, Edge } from "../lib/geometry";

interface Blueprint3DViewerProps {
  points: Point3D[];
  edges: Edge[];
  simulationParams: {
    windForce: number; // km/h
    appliedLoad: number; // Tons
    materialName: string;
    elasticModulus: number; // GPa
    yieldStrength: number; // MPa
    materialDensity: number; // g/cm³
    complexity: number;
  };
  style: string;
  title: string;
  onSelectNode?: (index: number | null) => void;
  totalCost?: number; // Exact cost calculated from the database
}

export default function Blueprint3DViewer({
  points,
  edges,
  simulationParams,
  style,
  title,
  onSelectNode,
  totalCost = 0
}: Blueprint3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3D camera state
  const [pitch, setPitch] = useState<number>(-0.4); // rotation X
  const [yaw, setYaw] = useState<number>(0.6);   // rotation Y
  const [zoom, setZoom] = useState<number>(1.1);
  const [projection, setProjection] = useState<"perspective" | "orthogonal">("perspective");
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  
  // Interactive motors
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [motorSpeed, setMotorSpeed] = useState<number>(0.005);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [showNodeIds, setShowNodeIds] = useState<boolean>(false);
  const [showGroundGrid, setShowGroundGrid] = useState<boolean>(true);
  const [deflectionCycle, setDeflectionCycle] = useState<number>(0);
  const [showBendingMoments, setShowBendingMoments] = useState<boolean>(true);
  const [showStressColors, setShowStressColors] = useState<boolean>(true);

  // Mouse interaction state
  const isDragging = useRef<boolean>(false);
  const lastMouseX = useRef<number>(0);
  const lastMouseY = useRef<number>(0);

  // Procedural auto-rotation motor
  useEffect(() => {
    if (!isRotating) return;
    
    let animId: number;
    const tick = () => {
      setYaw((prev) => (prev + motorSpeed) % (2 * Math.PI));
      setDeflectionCycle((prev) => (prev + 0.08) % (2 * Math.PI));
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isRotating, motorSpeed]);

  // Calculate live engineering metrics
  // E is elasticModulus (GPa), windForce in km/h, appliedLoad in Tons.
  const windForceVal = simulationParams.windForce;
  const appliedLoadVal = simulationParams.appliedLoad;
  const E = simulationParams.elasticModulus;
  const yieldStrength = simulationParams.yieldStrength;

  // Real-time deflection calculation (in mm)
  // Higher wind and load = more deflection. Higher E = less deflection.
  const deflectionFactor = E > 0 ? (windForceVal * windForceVal * 0.004 + appliedLoadVal * 10) / (E * 0.25) : 0;
  const maxDeflectionMm = Number(deflectionFactor.toFixed(1));

  // Average stress estimate in MPa
  // Stress is proportional to applied load and wind torque
  const stressEstimateMpa = Number((appliedLoadVal * 15 + windForceVal * windForceVal * 0.005).toFixed(1));

  // Safety Factor (FoS)
  const factorOfSafety = stressEstimateMpa > 0 ? yieldStrength / stressEstimateMpa : 99;
  const isUnsafe = factorOfSafety < 1.1;

  // Handle drawing to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI retina screens
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const centerX = width / 2 + panX;
    const centerY = height / 2 + panY;

    // Clear with crisp off-white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 3D Projection mapping helper
    const project = (pt: Point3D): { x: number; y: number; zDepth: number } => {
      // Apply real physical deflection to coordinate calculation (swaying motion)
      // Base/anchor nodes are rigid (pt.y >= 0.4 or ids containing 'BASE')
      const isBase = pt.id.includes("BASE") || pt.y >= 0.45;
      
      // Deflection is side-to-side on X from wind, and down on Y from weight load
      const swayOffset = isBase ? 0 : Math.sin(deflectionCycle + pt.y * 4) * (deflectionFactor * 0.003);
      const sagOffset = isBase ? 0 : (appliedLoadVal * 0.005 * (0.5 - pt.y));

      const px = pt.x + swayOffset;
      const py = pt.y + sagOffset;
      const pz = pt.z;

      // Pitch (X-axis rotation)
      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);
      
      // Yaw (Y-axis rotation)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      // Rotate around Y (yaw)
      const x1 = px * cosY - pz * sinY;
      const z1 = px * sinY + pz * cosY;

      // Rotate around X (pitch)
      const y2 = py * cosX - z1 * sinX;
      const z2 = py * sinX + z1 * cosX;

      const scaleFactor = zoom * 135;

      if (projection === "orthogonal") {
        return {
          x: centerX + x1 * scaleFactor,
          y: centerY + y2 * scaleFactor,
          zDepth: z2
        };
      } else {
        // Perspective camera
        const d = 3.5; // camera distance
        const perspective = d / (d + z2);
        return {
          x: centerX + x1 * scaleFactor * perspective,
          y: centerY + y2 * scaleFactor * perspective,
          zDepth: z2
        };
      }
    };

    // Draw grid
    if (showGroundGrid) {
      ctx.strokeStyle = "rgba(0, 82, 204, 0.06)";
      ctx.lineWidth = 1;
      const gridSize = 5;
      const gridSpacing = 0.4;
      
      for (let i = -gridSize; i <= gridSize; i++) {
        // Lines parallel to X
        const startPt = project({ x: -gridSize * gridSpacing, y: 0.5, z: i * gridSpacing, id: `grid-x-${i}` });
        const endPt = project({ x: gridSize * gridSpacing, y: 0.5, z: i * gridSpacing, id: `grid-x-end-${i}` });
        
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.lineTo(endPt.x, endPt.y);
        ctx.stroke();

        // Lines parallel to Z
        const startPtZ = project({ x: i * gridSpacing, y: 0.5, z: -gridSize * gridSpacing, id: `grid-z-${i}` });
        const endPtZ = project({ x: i * gridSpacing, y: 0.5, z: gridSize * gridSpacing, id: `grid-z-end-${i}` });
        
        ctx.beginPath();
        ctx.moveTo(startPtZ.x, startPtZ.y);
        ctx.lineTo(endPtZ.x, endPtZ.y);
        ctx.stroke();
      }

      // Draw mathematical Coordinate Axis
      const origin = project({ x: 0, y: 0.5, z: 0, id: "origin" });
      const axisX = project({ x: 0.6, y: 0.5, z: 0, id: "axis-x" });
      const axisY = project({ x: 0, y: -0.1, z: 0, id: "axis-y" });
      const axisZ = project({ x: 0, y: 0.5, z: 0.6, id: "axis-z" });

      // Axis X (Red)
      ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axisX.x, axisX.y);
      ctx.stroke();
      
      // Axis Y (Green)
      ctx.strokeStyle = "rgba(34, 197, 94, 0.3)";
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axisY.x, axisY.y);
      ctx.stroke();

      // Axis Z (Blue)
      ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axisZ.x, axisZ.y);
      ctx.stroke();
    }

    // Projected points buffer
    const projectedPoints = points.map(pt => project(pt));

    // Sort edges by average depth (Painter's algorithm)
    const sortedEdgesWithIdx = edges.map((edge, idx) => {
      const uPt = projectedPoints[edge.u];
      const vPt = projectedPoints[edge.v];
      const zDepth = (uPt && vPt) ? (uPt.zDepth + vPt.zDepth) / 2 : 0;
      return { edge, idx, zDepth };
    }).sort((a, b) => b.zDepth - a.zDepth);

    // Draw vector edges with color stress indicator
    sortedEdgesWithIdx.forEach(({ edge }) => {
      const p1 = projectedPoints[edge.u];
      const p2 = projectedPoints[edge.v];
      if (!p1 || !p2) return;

      // Calculate member-specific stress and utilization
      const uPtOrig = points[edge.u];
      const vPtOrig = points[edge.v];
      let memberStress = 0;
      if (uPtOrig && vPtOrig) {
        const length3D = Math.sqrt(
          Math.pow(uPtOrig.x - vPtOrig.x, 2) +
          Math.pow(uPtOrig.y - vPtOrig.y, 2) +
          Math.pow(uPtOrig.z - vPtOrig.z, 2)
        );
        // Bending stress is proportional to length and applied load, plus wind torque on higher nodes
        const heightFactor = 1.1 - (uPtOrig.y + vPtOrig.y) / 2; // y close to 0 is top
        const windStress = windForceVal * windForceVal * 0.003 * heightFactor;
        const gravityStress = appliedLoadVal * 6 * (length3D > 0 ? 1 / length3D : 1);
        memberStress = Number((gravityStress + windStress).toFixed(1));
      } else {
        memberStress = stressEstimateMpa;
      }
      const utilization = yieldStrength > 0 ? memberStress / yieldStrength : 0;

      let strokeWidth = 2.0;
      let strokeColor = "rgba(0, 82, 204, 0.85)"; // Vivid blueprint blue

      // Render custom styles according to structural member type
      if (edge.type === "cable") {
        strokeWidth = 1.0;
        ctx.setLineDash([4, 2]);
        strokeColor = "rgba(6, 182, 212, 0.6)";
      } else if (edge.type === "strut") {
        strokeWidth = 3.5;
        ctx.setLineDash([]);
        strokeColor = "rgba(30, 58, 138, 1.0)";
      } else if (edge.type === "diagonal") {
        strokeWidth = 1.5;
        ctx.setLineDash([]);
        strokeColor = "rgba(3, 105, 161, 0.75)";
      } else {
        ctx.setLineDash([]);
      }

      // If showStressColors is active, override edge color with actual stress-to-strength ratio (Resistencia Real)
      if (showStressColors) {
        if (utilization >= 1.0) {
          strokeColor = "rgba(225, 29, 72, 0.95)"; // Danger Red
        } else if (utilization >= 0.7) {
          strokeColor = "rgba(245, 158, 11, 0.9)"; // Orange/Amber
        } else if (utilization >= 0.3) {
          strokeColor = "rgba(16, 185, 129, 0.85)"; // Emerald Green
        } else {
          strokeColor = "rgba(59, 130, 246, 0.75)"; // Light Blue
        }
      } else if (isUnsafe) {
        strokeColor = edge.type === "strut" ? "rgba(159, 18, 57, 0.95)" : "rgba(225, 29, 72, 0.85)";
      } else if (stressEstimateMpa > yieldStrength * 0.5) {
        strokeColor = "rgba(217, 119, 6, 0.85)"; // Orange/Amber
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Draw bending moments (Momentos Flectores) as a gorgeous parabola envelope
      if (showBendingMoments && edge.type !== "cable") {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          
          // Moment magnitude is proportional to stress/utilization and member length
          const momentScale = (memberStress * 0.15) * (len * 0.08);
          
          ctx.save();
          ctx.fillStyle = "rgba(168, 85, 247, 0.12)"; // Soft violet shading
          ctx.strokeStyle = "rgba(168, 85, 247, 0.65)"; // Dotted violet envelope
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          // Curve representing bending moment peak at midpoint
          ctx.quadraticCurveTo(midX + nx * momentScale, midY + ny * momentScale, p2.x, p2.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    ctx.setLineDash([]); // Reset line dash

    // Draw nodes
    projectedPoints.forEach((p, i) => {
      if (!p) return;
      const isSelected = selectedNode === i;
      const isNamed = points[i] && points[i].label;

      ctx.beginPath();
      ctx.arc(p.x, p.y, isSelected ? 6.5 : 3.0, 0, 2 * Math.PI);
      
      if (isSelected) {
        ctx.fillStyle = "#ff0055"; // Hot pink
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = isUnsafe ? "#e11d48" : "#0052cc"; // Vivid structural blue
        ctx.fill();
      }

      // Draw node text metadata / coordinates
      if (isNamed || isSelected || showNodeIds) {
        ctx.fillStyle = isSelected ? "#ff0055" : "#0f172a";
        ctx.font = "bold 9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
        ctx.textAlign = "left";
        
        const ptObj = points[i];
        if (ptObj) {
          const labelText = isSelected 
            ? `${ptObj.id} [X:${ptObj.x.toFixed(2)}, Y:${ptObj.y.toFixed(2)}, Z:${ptObj.z.toFixed(2)}]`
            : (ptObj.label || ptObj.id);

          ctx.fillText(" " + labelText, p.x + 6, p.y - 3);
        }
      }
    });

    // Draw bounding frame corner indicators (blueprint style)
    ctx.strokeStyle = "rgba(0, 82, 204, 0.12)";
    ctx.lineWidth = 1.0;
    const borderOffset = 15;
    const crossSize = 10;
    const corners = [
      { x: borderOffset, y: borderOffset },
      { x: width - borderOffset, y: borderOffset },
      { x: borderOffset, y: height - borderOffset },
      { x: width - borderOffset, y: height - borderOffset }
    ];

    corners.forEach(c => {
      ctx.beginPath();
      ctx.moveTo(c.x - crossSize/2, c.y);
      ctx.lineTo(c.x + crossSize/2, c.y);
      ctx.moveTo(c.x, c.y - crossSize/2);
      ctx.lineTo(c.x, c.y + crossSize/2);
      ctx.stroke();
    });

  }, [points, edges, pitch, yaw, zoom, projection, showGroundGrid, selectedNode, showNodeIds, deflectionCycle, simulationParams, deflectionFactor, panX, panY]);

  // Handle Dragging to rotate
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;
    setIsRotating(false); // Pause auto rotation on manual drag
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isDragging.current) {
      // Node Hover detection
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let matchedNodeIdx: number | null = null;
      const centerX = rect.width / 2 + panX;
      const centerY = rect.height / 2 + panY;

      const project = (pt: Point3D): { x: number; y: number } => {
        const isBase = pt.id.includes("BASE") || pt.y >= 0.45;
        const swayOffset = isBase ? 0 : Math.sin(deflectionCycle + pt.y * 4) * (deflectionFactor * 0.003);
        const sagOffset = isBase ? 0 : (appliedLoadVal * 0.005 * (0.5 - pt.y));

        const px = pt.x + swayOffset;
        const py = pt.y + sagOffset;
        const pz = pt.z;

        const cosX = Math.cos(pitch);
        const sinX = Math.sin(pitch);
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);

        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;
        const y2 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        const scaleFactor = zoom * 135;

        if (projection === "orthogonal") {
          return { x: centerX + x1 * scaleFactor, y: centerY + y2 * scaleFactor };
        } else {
          const d = 3.5;
          const perspective = d / (d + z2);
          return { x: centerX + x1 * scaleFactor * perspective, y: centerY + y2 * scaleFactor * perspective };
        }
      };

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (!pt) continue;
        const p = project(pt);
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        if (dx * dx + dy * dy < 81) { // 9px radius hitbox
          matchedNodeIdx = i;
          break;
        }
      }

      if (matchedNodeIdx !== selectedNode) {
        setSelectedNode(matchedNodeIdx);
        if (onSelectNode) onSelectNode(matchedNodeIdx);
      }
      return;
    }

    const deltaX = e.clientX - lastMouseX.current;
    const deltaY = e.clientY - lastMouseY.current;

    if (e.shiftKey) {
      setPanX((prev) => prev + deltaX);
      setPanY((prev) => prev + deltaY);
    } else {
      setYaw((prev) => (prev + deltaX * 0.015) % (2 * Math.PI));
      setPitch((prev) => Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev + deltaY * 0.015)));
    }

    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const handleZoomIn = () => setZoom(z => Math.min(3.0, z + 0.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.3, z - 0.15));

  return (
    <div ref={containerRef} className="w-full flex flex-col bg-white border-2 border-black relative select-none">
      
      {/* 3D Wireframe Canvas Stage */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] md:min-h-[460px] flex items-center justify-center bg-white overflow-hidden border-b-2 border-black">
        
        {/* Crisp clean canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
        />

        {/* Bounding Status Notification when collapsing */}
        {isUnsafe && (
          <div className="absolute top-2 inset-x-2 z-20 bg-rose-600 text-white font-mono text-[9px] font-black px-3 py-1.5 border-2 border-black flex items-center gap-2 uppercase tracking-wide justify-center animate-bounce shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            ¡FALLA DE MATERIAL! LÍMITE ELÁSTICO DE {simulationParams.materialName.toUpperCase()} SUPERADO (FOS: {factorOfSafety.toFixed(2)})
          </div>
        )}

        {/* Floating Blueprint Forensics overlay HUD */}
        <div className="absolute top-12 left-4 z-10 pointer-events-none flex flex-col space-y-1 select-none font-mono text-left">
          <div className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 border border-black uppercase w-fit tracking-widest">
            // SIMULACIÓN DE MATERIALES EN TIEMPO REAL
          </div>
          <h3 className="text-[13px] font-display font-black text-blue-900 uppercase tracking-tight truncate max-w-[280px]">
            {title || "SÍNTESIS PARAMÉTRICA SÍLEX"}
          </h3>
          <p className="text-[8.5px] text-blue-600 font-extrabold uppercase tracking-widest">
            GEOMETRÍA: {style || "Procedural Direct"}
          </p>
        </div>

        {/* Right Corner HUD Telemetry */}
        <div className="absolute top-12 right-4 z-10 pointer-events-none text-right font-mono text-[8px] text-blue-600/90 leading-snug">
          <div className="font-bold">NUDOS: {points.length} | TENSORES: {edges.length}</div>
          <div>YAW: {(yaw * 180 / Math.PI).toFixed(0)}° • PITCH: {(pitch * 180 / Math.PI).toFixed(0)}°</div>
          <div>MODO DE VISTA: {projection.toUpperCase()}</div>
          <div className={`font-black ${isUnsafe ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>
            COEF. SEGURIDAD (FoS): {factorOfSafety > 50 ? "ÓPTIMO (50+)" : factorOfSafety.toFixed(2)}
          </div>
        </div>

        {/* Floating Pan/Translation Overlay HUD */}
        <div className="absolute top-28 right-4 z-10 flex flex-col gap-1 pointer-events-auto bg-white border border-[#1a1a1a] p-2 shadow-[2px_2px_0px_#1a1a1a] w-[100px] select-none text-left">
          <span className="text-[6.5px] font-mono font-bold text-[#1a1a1a] block tracking-wider uppercase text-center">// TRASLACIÓN (PAN)</span>
          <div className="grid grid-cols-3 gap-1 w-full items-center justify-center">
            <div></div>
            <button
              onClick={() => setPanY((y) => y - 25)}
              className="p-1 border border-[#1a1a1a] bg-[#f8f7f4] text-[#1a1a1a] hover:bg-[#00ffff] font-black transition-colors text-center text-[8px] font-mono cursor-pointer"
              title="Mover arriba"
            >
              ▲
            </button>
            <div></div>
            
            <button
              onClick={() => setPanX((x) => x - 25)}
              className="p-1 border border-[#1a1a1a] bg-[#f8f7f4] text-[#1a1a1a] hover:bg-[#00ffff] font-black transition-colors text-center text-[8px] font-mono cursor-pointer"
              title="Mover izquierda"
            >
              ◀
            </button>
            <button
              onClick={() => {
                setPanX(0);
                setPanY(0);
              }}
              className="p-0.5 border border-[#1a1a1a] bg-[#f8f7f4] text-[#1a1a1a] hover:bg-[#00ffff] font-black transition-all text-[6px] font-mono cursor-pointer uppercase text-center"
              title="Centrar vista"
            >
              RST
            </button>
            <button
              onClick={() => setPanX((x) => x + 25)}
              className="p-1 border border-[#1a1a1a] bg-[#f8f7f4] text-[#1a1a1a] hover:bg-[#00ffff] font-black transition-colors text-center text-[8px] font-mono cursor-pointer"
              title="Mover derecha"
            >
              ▶
            </button>
            
            <div></div>
            <button
              onClick={() => setPanY((y) => y + 25)}
              className="p-1 border border-[#1a1a1a] bg-[#f8f7f4] text-[#1a1a1a] hover:bg-[#00ffff] font-black transition-colors text-center text-[8px] font-mono cursor-pointer"
              title="Mover abajo"
            >
              ▼
            </button>
            <div></div>
          </div>
          <span className="text-[5.5px] font-mono text-[#1a1a1a]/50 block mt-1 text-center font-bold leading-none uppercase">SHIFT+DRAG</span>
        </div>

        {/* Bottom Left: Interactive FEA Metricas Simulation Telemetry HUD */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 border-2 border-blue-600/35 p-3 max-w-[260px] rounded-none shadow-[3px_3px_0px_rgba(0,82,204,0.15)] font-mono text-[8.5px] text-blue-900 pointer-events-none text-left">
          <span className="font-extrabold text-[9.5px] text-blue-700 block border-b border-blue-100 pb-1 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            // ANÁLISIS F.E.A DE ESTRUCTURA
          </span>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span>ALEACIÓN ACTIVA:</span>
              <span className="font-bold text-black">{simulationParams.materialName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>MÓDULO DE DEFORMACIÓN:</span>
              <span className="font-bold text-black">{E} GPa</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>DEFLEXIÓN MÁXIMA:</span>
              <span className={`font-black ${maxDeflectionMm > 25 ? "text-amber-600" : "text-blue-700"}`}>
                {maxDeflectionMm} mm
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>ESFUERZO ESTIMADO:</span>
              <span className="font-bold text-black">{stressEstimateMpa} MPa</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>LÍMITE ELÁSTICO:</span>
              <span className="font-bold text-black">{yieldStrength} MPa</span>
            </div>
            {totalCost > 0 && (
              <div className="flex justify-between gap-4 border-t border-dashed border-blue-200 pt-1.5 mt-1.5">
                <span className="font-bold text-[#1a1a1a]">VALOR TOTAL:</span>
                <span className="font-black text-[#1a1a1a]">${totalCost.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
              </div>
            )}
            {showStressColors && (
              <div className="mt-2 pt-2 border-t border-dashed border-blue-200">
                <span className="font-bold text-[8px] text-neutral-500 block mb-1">LEYENDA DE RESISTENCIA F.E.A:</span>
                <div className="grid grid-cols-2 gap-1 text-[7.5px] font-black">
                  <span className="text-blue-500">■ &lt;30% (Seguro)</span>
                  <span className="text-emerald-600">■ 30-70% (Óptimo)</span>
                  <span className="text-amber-500">■ 70-100% (Alto)</span>
                  <span className="text-rose-600 animate-pulse">■ &gt;100% (Fluencia)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hover selection Node Telemetry */}
        {selectedNode !== null && points[selectedNode] && (
          <div className="absolute bottom-4 right-4 z-10 bg-black text-white p-2 border border-blue-400 font-mono text-[8px] text-left">
            <span className="text-amber-400 font-bold uppercase tracking-wider block mb-0.5">// NODULO SELECCIONADO</span>
            <div>ID: {points[selectedNode].id}</div>
            <div>COORD: [{points[selectedNode].x.toFixed(3)}, {points[selectedNode].y.toFixed(3)}, {points[selectedNode].z.toFixed(3)}]</div>
            {points[selectedNode].label && <div>ETIQUETA: {points[selectedNode].label}</div>}
          </div>
        )}
      </div>

      {/* Rhythmic Engine & CAD Calibration Controls Footer panel */}
      <div className="border-t border-black bg-[#f8f7f4] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          {/* Motor rotation buttons */}
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-1.5 border border-black transition-all cursor-pointer flex items-center gap-1 font-bold ${
              isRotating ? "bg-[#00ffff] text-[#1a1a1a]" : "bg-white text-[#1a1a1a] hover:bg-[#f8f7f4]"
            }`}
            title="Motor de Rotación Rítmica"
          >
            {isRotating ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                ROTACIÓN ACTIVA
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                ROTACIÓN PAUSADA
              </>
            )}
          </button>

          {/* Projection toggles */}
          <button
            onClick={() => setProjection(p => p === "perspective" ? "orthogonal" : "perspective")}
            className="p-1.5 bg-white border border-black hover:bg-[#f8f7f4] text-[#1a1a1a] font-bold transition-all cursor-pointer"
            title="Cambiar proyección de Cámara"
          >
            CÁM: {projection === "perspective" ? "PERSPECTIVA" : "ISOMÉTRICA"}
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGroundGrid(!showGroundGrid)}
            className={`p-1.5 border border-black transition-all cursor-pointer ${
              showGroundGrid ? "bg-[#00ffff] text-[#1a1a1a] font-bold" : "bg-white text-[#1a1a1a] hover:bg-[#f8f7f4]"
            }`}
            title="Cuadrícula del Suelo"
          >
            CUADRÍCULA COORD
          </button>

          {/* Nodes label toggle */}
          <button
            onClick={() => setShowNodeIds(!showNodeIds)}
            className={`p-1.5 border border-black transition-all cursor-pointer ${
              showNodeIds ? "bg-[#00ffff] text-[#1a1a1a] font-bold" : "bg-white text-[#1a1a1a] hover:bg-[#f8f7f4]"
            }`}
          >
            NUDOS ID
          </button>

          {/* Stress Colors Toggle */}
          <button
            onClick={() => setShowStressColors(!showStressColors)}
            className={`p-1.5 border border-black transition-all cursor-pointer ${
              showStressColors ? "bg-[#00ffff] text-[#1a1a1a] font-bold" : "bg-white text-[#1a1a1a] hover:bg-[#f8f7f4]"
            }`}
            title="Mostrar resistencias reales mediante colores de esfuerzo"
          >
            RESISTENCIA F.E.A
          </button>

          {/* Bending Moments Toggle */}
          <button
            onClick={() => setShowBendingMoments(!showBendingMoments)}
            className={`p-1.5 border border-black transition-all cursor-pointer ${
              showBendingMoments ? "bg-[#00ffff] text-[#1a1a1a] font-bold" : "bg-white text-[#1a1a1a] hover:bg-[#f8f7f4]"
            }`}
            title="Mostrar diagramas de momentos flectores"
          >
            MOMENTOS FLECTORES
          </button>
        </div>

        {/* Math factors: Zoom & Dynamic Wind deformer */}
        <div className="flex items-center gap-4">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#1a1a1a]/50 font-bold uppercase">ZOOM:</span>
            <button
              onClick={handleZoomOut}
              className="p-1 border border-black bg-white hover:bg-[#f8f7f4] cursor-pointer"
            >
              <ZoomOut className="w-3 h-3 text-[#1a1a1a]" />
            </button>
            <span className="min-w-[28px] text-center font-bold text-black">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 border border-black bg-white hover:bg-[#f8f7f4] cursor-pointer"
            >
              <ZoomIn className="w-3 h-3 text-[#1a1a1a]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
