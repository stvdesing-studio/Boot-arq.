export interface Point3D {
  x: number;
  y: number;
  z: number;
  id: string;
  label?: string;
}

export interface Edge {
  u: number; // Index of start point
  v: number; // Index of end point
  type: "chord" | "diagonal" | "strut" | "cable" | "support";
  stress: number; // Value from 0 to 1 indicating compression/tension stress
}

export function generateInitialGeometry(
  style: string,
  density: "baja" | "media" | "alta",
  complexity: number
): { points: Point3D[]; edges: Edge[] } {
  let segments = 6;
  if (density === "baja") segments = Math.max(4, Math.floor(complexity * 0.7));
  if (density === "media") segments = Math.max(8, Math.floor(complexity * 1.0));
  if (density === "alta") segments = Math.max(12, Math.floor(complexity * 1.5));

  const newPoints: Point3D[] = [];
  const newEdges: Edge[] = [];
  const lowerStyle = style.toLowerCase();

  if (lowerStyle.includes("geodesic") || lowerStyle.includes("dome") || lowerStyle.includes("cúpula")) {
    // 1. GEODESIC DOME GENERATOR
    const radius = 1.3;
    const rings = Math.max(3, Math.min(6, Math.floor(segments / 2)));
    
    // Base center
    newPoints.push({ x: 0, y: radius, z: 0, id: "N-CROWN", label: "Corona Central" });

    for (let r = 1; r <= rings; r++) {
      const phi = (Math.PI / 2) * (r / rings); // elevation angle from top
      const ringRadius = radius * Math.sin(phi);
      const y = radius * Math.cos(phi) - 0.4; // shift center down
      const numPointsInRing = r * 6;

      for (let i = 0; i < numPointsInRing; i++) {
        const theta = (2 * Math.PI * i) / numPointsInRing;
        const x = ringRadius * Math.cos(theta);
        const z = ringRadius * Math.sin(theta);
        newPoints.push({ 
          x, 
          y: -y, // invert coordinate to make dome stand on floor
          z, 
          id: `N-R${r}-P${i}` 
        });
      }
    }

    // Triangulate geodesic edges
    let prevRingStart = 0;
    let prevRingCount = 1;

    for (let r = 1; r <= rings; r++) {
      const ringStart = prevRingStart + prevRingCount;
      const ringCount = r * 6;

      for (let i = 0; i < ringCount; i++) {
        const currentIdx = ringStart + i;
        const nextIdx = ringStart + ((i + 1) % ringCount);
        
        // Connect ring loop
        newEdges.push({
          u: currentIdx,
          v: nextIdx,
          type: "chord",
          stress: 0.1 + (Math.sin(i + r) * 0.2 + 0.3)
        });

        // Connect to previous ring nodes (approximate subdivision)
        if (r === 1) {
          newEdges.push({ u: 0, v: currentIdx, type: "diagonal", stress: 0.4 });
        } else {
          const prevRingStartIdx = prevRingStart;
          const prevRingCountVal = (r - 1) * 6;
          const ratio = prevRingCountVal / ringCount;
          const prevIdx = prevRingStartIdx + Math.floor(i * ratio) % prevRingCountVal;
          
          newEdges.push({
            u: prevIdx,
            v: currentIdx,
            type: "diagonal",
            stress: 0.2 + (Math.cos(i) * 0.1 + 0.2)
          });

          // Additional cross triangulation
          const prevSiblingIdx = prevRingStartIdx + (Math.floor(i * ratio) + 1) % prevRingCountVal;
          newEdges.push({
            u: prevSiblingIdx,
            v: currentIdx,
            type: "cable",
            stress: 0.15
          });
        }
      }
      prevRingStart = ringStart;
      prevRingCount = ringCount;
    }

  } else if (lowerStyle.includes("tensegridad") || lowerStyle.includes("tensegrity") || lowerStyle.includes("cable")) {
    // 2. TENSEGRITY TOWER GENERATOR
    const levels = Math.max(3, Math.min(6, Math.floor(segments / 2)));
    const rad = 0.6;
    const heightStep = 0.5;

    for (let l = 0; l < levels; l++) {
      const y = -0.8 + l * heightStep;
      const twist = l * (Math.PI / 4); // Twist of each level for structural tensegrity

      // 3 compression struts per level (6 nodes)
      for (let i = 0; i < 3; i++) {
        const theta1 = twist + (2 * Math.PI * i) / 3;
        const x1 = rad * Math.cos(theta1);
        const z1 = rad * Math.sin(theta1);

        newPoints.push({ x: x1, y, z: z1, id: `N-L${l}-A${i}` });
      }
    }

    // Add struts and cables
    for (let l = 0; l < levels; l++) {
      const startIdx = l * 3;
      
      // Ring cables of level l
      for (let i = 0; i < 3; i++) {
        newEdges.push({
          u: startIdx + i,
          v: startIdx + ((i + 1) % 3),
          type: "cable",
          stress: 0.3
        });
      }

      // Struts (compression elements) connecting levels
      if (l < levels - 1) {
        const nextStartIdx = (l + 1) * 3;
        for (let i = 0; i < 3; i++) {
          // Strut from level l, node i to level l+1, node (i+1)%3 (tilted strut)
          newEdges.push({
            u: startIdx + i,
            v: nextStartIdx + ((i + 1) % 3),
            type: "strut",
            stress: 0.85
          });

          // Tension cables pulling opposite directions
          newEdges.push({
            u: startIdx + i,
            v: nextStartIdx + i,
            type: "cable",
            stress: 0.4
          });

          newEdges.push({
            u: startIdx + i,
            v: nextStartIdx + ((i + 2) % 3),
            type: "cable",
            stress: 0.5
          });
        }
      }
    }

  } else if (lowerStyle.includes("cercha") || lowerStyle.includes("truss") || lowerStyle.includes("celosía") || lowerStyle.includes("viga")) {
    // 3. INDUSTRIAL PRATT SPACE TRUSS (SPANS HORIZONTALLY)
    const length = 2.8;
    const width = 0.5;
    const height = 0.6;
    const divisions = Math.max(4, Math.min(10, segments));
    const step = length / divisions;

    for (let i = 0; i <= divisions; i++) {
      const x = -length / 2 + i * step;

      // Bottom chord left
      newPoints.push({ x, y: 0.3, z: -width / 2, id: `N-BOT-L-${i}` });
      // Bottom chord right
      newPoints.push({ x, y: 0.3, z: width / 2, id: `N-BOT-R-${i}` });
      // Top chord left
      newPoints.push({ x, y: -height + 0.3, z: -width / 2, id: `N-TOP-L-${i}` });
      // Top chord right
      newPoints.push({ x, y: -height + 0.3, z: width / 2, id: `N-TOP-R-${i}` });
    }

    // Interconnect chords
    for (let i = 0; i <= divisions; i++) {
      const idx = i * 4;
      
      // Cross framing loop at each node division
      newEdges.push({ u: idx, v: idx + 1, type: "chord", stress: 0.2 }); // Bot transverse
      newEdges.push({ u: idx + 2, v: idx + 3, type: "chord", stress: 0.2 }); // Top transverse
      newEdges.push({ u: idx, v: idx + 2, type: "strut", stress: 0.3 }); // Left vertical
      newEdges.push({ u: idx + 1, v: idx + 3, type: "strut", stress: 0.3 }); // Right vertical

      // Diagonal bracing inside cross loop
      newEdges.push({ u: idx, v: idx + 3, type: "diagonal", stress: 0.15 });

      // Horizontal longitudinal elements to next index
      if (i < divisions) {
        const nextIdx = (i + 1) * 4;
        newEdges.push({ u: idx, v: nextIdx, type: "chord", stress: 0.6 }); // Bottom L chord
        newEdges.push({ u: idx + 1, v: nextIdx + 1, type: "chord", stress: 0.6 }); // Bottom R chord
        newEdges.push({ u: idx + 2, v: nextIdx + 2, type: "chord", stress: 0.75 }); // Top L chord
        newEdges.push({ u: idx + 3, v: nextIdx + 3, type: "chord", stress: 0.75 }); // Top R chord

        // Truss Pratt diagonals
        // Alternate diagonal direction to match structural flow
        if (i < divisions / 2) {
          newEdges.push({ u: idx, v: nextIdx + 2, type: "diagonal", stress: 0.5 }); // L diagonal
          newEdges.push({ u: idx + 1, v: nextIdx + 3, type: "diagonal", stress: 0.5 }); // R diagonal
        } else {
          newEdges.push({ u: idx + 2, v: nextIdx, type: "diagonal", stress: 0.5 }); // L diagonal
          newEdges.push({ u: idx + 3, v: nextIdx + 1, type: "diagonal", stress: 0.5 }); // R diagonal
        }
      }
    }

  } else if (lowerStyle.includes("hiperbólico") || lowerStyle.includes("paraboloide") || lowerStyle.includes("saddle") || lowerStyle.includes("malla")) {
    // 4. HYPERBOLIC PARABOLOID SADDLE CANOPY (GENERATIVE MATRIX)
    const size = 2.0;
    const res = Math.max(5, Math.min(11, segments));
    const step = size / (res - 1);

    for (let r = 0; r < res; r++) {
      const uVal = -size / 2 + r * step;
      for (let c = 0; c < res; c++) {
        const vVal = -size / 2 + c * step;
        // Saddle math: y = u^2 - v^2
        const y = (Math.pow(uVal, 2) - Math.pow(vVal, 2)) * 0.45 - 0.1;
        newPoints.push({ x: uVal, y, z: vVal, id: `N-SAD-${r}-${c}` });
      }
    }

    // Connect grid network
    for (let r = 0; r < res; r++) {
      for (let c = 0; c < res; c++) {
        const currentIdx = r * res + c;
        
        if (c < res - 1) {
          newEdges.push({
            u: currentIdx,
            v: currentIdx + 1,
            type: "chord",
            stress: 0.25 + Math.abs(r - res/2)/res * 0.4
          });
        }
        if (r < res - 1) {
          newEdges.push({
            u: currentIdx,
            v: currentIdx + res,
            type: "chord",
            stress: 0.25 + Math.abs(c - res/2)/res * 0.4
          });
        }
        // Diagonal bracing cables
        if (r < res - 1 && c < res - 1) {
          newEdges.push({
            u: currentIdx,
            v: currentIdx + res + 1,
            type: "cable",
            stress: 0.15
          });
        }
      }
    }

  } else {
    // 5. INDUSTRIAL PORTAL FRAME (DEFAULT STRUCTURAL RIGID FRAME)
    const bays = Math.max(2, Math.min(5, Math.floor(segments / 3)));
    const width = 1.6;
    const height = 1.1;
    const gableHeight = 0.35;
    const baySpacing = 0.9;

    for (let b = 0; b <= bays; b++) {
      const z = - (bays * baySpacing) / 2 + b * baySpacing;

      // Base Left Support
      newPoints.push({ x: -width / 2, y: 0.5, z, id: `N-B${b}-BASE-L`, label: b === 0 ? "Apoyo Izq" : undefined });
      // Base Right Support
      newPoints.push({ x: width / 2, y: 0.5, z, id: `N-B${b}-BASE-R`, label: b === 0 ? "Apoyo Der" : undefined });
      // Knee Left (Column joint)
      newPoints.push({ x: -width / 2, y: -height + 0.5, z, id: `N-B${b}-KNEE-L` });
      // Knee Right (Column joint)
      newPoints.push({ x: width / 2, y: -height + 0.5, z, id: `N-B${b}-KNEE-R` });
      // Apex (Ridge crown)
      newPoints.push({ x: 0, y: -height - gableHeight + 0.5, z, id: `N-B${b}-APEX`, label: b === 0 ? "Cumbrera" : undefined });
    }

    // Connect Portal Frames
    for (let b = 0; b <= bays; b++) {
      const idx = b * 5;

      // Single Portal Frame loops (columns + rafters)
      newEdges.push({ u: idx, v: idx + 2, type: "strut", stress: 0.7 });       // Left column
      newEdges.push({ u: idx + 1, v: idx + 3, type: "strut", stress: 0.7 });   // Right column
      newEdges.push({ u: idx + 2, v: idx + 4, type: "chord", stress: 0.8 });   // Left rafter
      newEdges.push({ u: idx + 3, v: idx + 4, type: "chord", stress: 0.8 });   // Right rafter

      // Purlins / Girts (Longitudinal beams linking the frames)
      if (b < bays) {
        const nextIdx = (b + 1) * 5;
        newEdges.push({ u: idx + 2, v: nextIdx + 2, type: "chord", stress: 0.45 }); // Knee Left strut
        newEdges.push({ u: idx + 3, v: nextIdx + 3, type: "chord", stress: 0.45 }); // Knee Right strut
        newEdges.push({ u: idx + 4, v: nextIdx + 4, type: "chord", stress: 0.5 });  // Ridge beam purlin

        // Wall and Roof X-bracings
        newEdges.push({ u: idx + 2, v: nextIdx + 4, type: "cable", stress: 0.2 });
        newEdges.push({ u: idx + 3, v: nextIdx + 4, type: "cable", stress: 0.2 });
      }
    }
  }

  return { points: newPoints, edges: newEdges };
}
