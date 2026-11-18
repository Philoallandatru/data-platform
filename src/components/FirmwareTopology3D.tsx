import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BenchmarkRun, FirmwareVersion, ThemeMode } from '../types/ssd';
import { Cpu, Pause, Play, Zap, Thermometer } from 'lucide-react';

interface FirmwareTopology3DProps {
  firmwares: FirmwareVersion[];
  runsForTest: BenchmarkRun[];
  selectedFirmwareId: string;
  onSelectFirmware: (fwId: string) => void;
  testName: string;
  theme: ThemeMode;
}

export const FirmwareTopology3D: React.FC<FirmwareTopology3DProps> = ({
  firmwares,
  runsForTest,
  selectedFirmwareId,
  onSelectFirmware,
  testName,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredFwId, setHoveredFwId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(true);
  const themeRef = useRef<ThemeMode>(theme);
  const selectedIdRef = useRef(selectedFirmwareId);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    selectedIdRef.current = selectedFirmwareId;
  }, [selectedFirmwareId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || firmwares.length === 0) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const rootGroup = new THREE.Group();
    rootGroup.rotation.x = 0.28;
    rootGroup.rotation.y = -0.5;
    scene.add(rootGroup);

    const R = 1.75;

    // Outer orbital wireframe sphere
    const cageGeo = new THREE.SphereGeometry(R, 24, 16);
    const cageMat = new THREE.MeshBasicMaterial({
      color: theme === 'light' ? 0x94a3b8 : 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: theme === 'light' ? 0.25 : 0.2,
    });
    rootGroup.add(new THREE.Mesh(cageGeo, cageMat));

    // Three orthogonal telemetry rings (Performance, Efficiency, Thermal)
    const ringColors = [0x00e5ff, 0xa855f7, 0xff6b2c];
    ringColors.forEach((col, i) => {
      const rGeo = new THREE.TorusGeometry(R * 1.03, 0.008, 8, 96);
      const rMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4 });
      const ring = new THREE.Mesh(rGeo, rMat);
      if (i === 0) ring.rotation.x = Math.PI / 2;
      if (i === 1) ring.rotation.y = Math.PI / 2;
      rootGroup.add(ring);
    });

    // Core subtle dot cloud
    const cloudPts: number[] = [];
    for (let i = 0; i < 900; i++) {
      const phi = Math.acos(1 - 2 * ((i + 0.5) / 900));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const rad = R * 0.94;
      cloudPts.push(
        rad * Math.sin(phi) * Math.cos(theta),
        rad * Math.cos(phi),
        rad * Math.sin(phi) * Math.sin(theta)
      );
    }
    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.Float32BufferAttribute(cloudPts, 3));
    const cloudMat = new THREE.PointsMaterial({
      size: 0.02,
      color: theme === 'light' ? 0x64748b : 0x38bdf8,
      transparent: true,
      opacity: 0.28,
    });
    rootGroup.add(new THREE.Points(cloudGeo, cloudMat));

    // Plot each firmware node in 3D space based on normalized metrics
    const maxTp = Math.max(1, ...runsForTest.map((r) => r.throughput_mbps));
    const maxEff = Math.max(1, ...runsForTest.map((r) => r.efficiency_mbps_per_w));

    const nodeMeshes: THREE.Mesh[] = [];
    const nodePositions: THREE.Vector3[] = [];
    const pulseRings: { mesh: THREE.Mesh; fwId: string; phase: number }[] = [];

    firmwares.forEach((fw, idx) => {
      const run = runsForTest.find((r) => r.firmware_id === fw.id);
      const tpNorm = run ? run.throughput_mbps / maxTp : 0.5;
      const effNorm = run ? run.efficiency_mbps_per_w / maxEff : 0.5;

      const angle = (idx / firmwares.length) * Math.PI * 2 + 0.4;
      const y = (tpNorm - 0.5) * 1.8 + (effNorm - 0.5) * 0.5;
      const radial = R * (0.72 + effNorm * 0.34);
      const pos = new THREE.Vector3(
        radial * Math.cos(angle),
        y,
        radial * Math.sin(angle)
      );
      nodePositions.push(pos);

      const isLatest = fw.id === 'fw-213' || fw.id === 'fw-200';
      const color =
        run?.pass_status === 'REGRESSION'
          ? 0xff4d2e
          : run?.pass_status === 'WARN'
          ? 0xf59e0b
          : isLatest
          ? 0x10b981
          : 0x00e5ff;

      const nodeGeo = new THREE.SphereGeometry(0.085, 20, 20);
      const nodeMat = new THREE.MeshBasicMaterial({ color });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      nodeMesh.userData = { fwId: fw.id };
      rootGroup.add(nodeMesh);
      nodeMeshes.push(nodeMesh);

      const pRingGeo = new THREE.RingGeometry(0.11, 0.145, 24);
      const pRingMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const pRing = new THREE.Mesh(pRingGeo, pRingMat);
      pRing.position.copy(pos);
      pRing.lookAt(pos.clone().multiplyScalar(2));
      rootGroup.add(pRing);
      pulseRings.push({ mesh: pRing, fwId: fw.id, phase: idx * 0.5 });
    });

    // Connect firmware evolution chain with animated Bezier telemetry arcs
    const pulses: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; offset: number }[] = [];
    for (let i = 0; i < nodePositions.length - 1; i++) {
      const a = nodePositions[i];
      const b = nodePositions[i + 1];
      const mid = a.clone().add(b).multiplyScalar(0.5).multiplyScalar(1.22);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));
      const lineMat = new THREE.LineBasicMaterial({
        color: i >= 3 ? 0x10b981 : 0x00e5ff,
        transparent: true,
        opacity: 0.45,
      });
      rootGroup.add(new THREE.Line(lineGeo, lineMat));

      const pGeo = new THREE.SphereGeometry(0.032, 10, 10);
      const pMat = new THREE.MeshBasicMaterial({
        color: theme === 'light' ? 0x0f172a : 0xffffff,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      rootGroup.add(pMesh);
      pulses.push({ mesh: pMesh, curve, offset: i * 0.22 });
    }

    // Pointer interaction
    let isDragging = false;
    let prev = { x: 0, y: 0 };
    let vel = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onDown = (e: PointerEvent) => {
      isDragging = true;
      prev = { x: e.clientX, y: e.clientY };
    };

    const onMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        vel = { x: dy * 0.005, y: dx * 0.005 };
        rootGroup.rotation.y += vel.y;
        rootGroup.rotation.x = THREE.MathUtils.clamp(rootGroup.rotation.x + vel.x, -1.1, 1.1);
        prev = { x: e.clientX, y: e.clientY };
        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(nodeMeshes, false);
      if (hits.length > 0) {
        setHoveredFwId(hits[0].object.userData.fwId as string);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredFwId(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onUp = (e: PointerEvent) => {
      if (isDragging && Math.abs(e.clientX - prev.x) < 4) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(nodeMeshes, false);
        if (hits.length > 0) {
          onSelectFirmware(hits[0].object.userData.fwId as string);
        }
      }
      isDragging = false;
    };

    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    let animId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        rootGroup.rotation.y += vel.y;
        rootGroup.rotation.x = THREE.MathUtils.clamp(rootGroup.rotation.x + vel.x, -1.1, 1.1);
        vel.x *= 0.92;
        vel.y *= 0.92;
        if (autoRotateRef.current) {
          rootGroup.rotation.y += 0.0022;
        }
      }

      pulseRings.forEach((p) => {
        const isSelected = p.fwId === selectedIdRef.current;
        const t = (elapsed * (isSelected ? 1.2 : 0.7) + p.phase) % 1;
        const s = (isSelected ? 1.25 : 0.9) + t * 1.1;
        p.mesh.scale.set(s, s, 1);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (isSelected ? 0.95 : 0.5);
      });

      pulses.forEach((p) => {
        const t = (elapsed * 0.35 + p.offset) % 1;
        p.mesh.position.copy(p.curve.getPoint(t));
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [firmwares, runsForTest, onSelectFirmware, theme]);

  const activeFwId = hoveredFwId || selectedFirmwareId;
  const activeFw = firmwares.find((f) => f.id === activeFwId) || firmwares[0];
  const activeRun = runsForTest.find((r) => r.firmware_id === activeFw?.id);

  return (
    <div className="relative w-full h-[450px] lg:h-[510px] rounded-2xl overflow-hidden bento-card">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(0,229,255,0.10),rgba(168,85,247,0.06)_45%,transparent_72%)]" />

      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Title Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] backdrop-blur-md">
        <Cpu className="w-4 h-4 text-[#00B4D8]" />
        <div>
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            3D Firmware Pareto Topology
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            Workload: {testName}
          </div>
        </div>
      </div>

      {/* Top-Right Spin Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setAutoRotate((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer backdrop-blur-md"
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5 text-[#00B4D8]" /> : <Play className="w-3.5 h-3.5 text-[#FF6B2C]" />}
          {autoRotate ? 'Spinning' : 'Paused'}
        </button>
      </div>

      {/* Bottom-Left Firmware Node Inspector */}
      {activeFw && activeRun && (
        <div className="absolute bottom-4 left-4 z-10 w-80 rounded-xl bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] p-3.5 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-mono-num text-sm font-bold text-[var(--text-primary)]">
                {activeFw.version}
              </span>
              <div className="text-[10px] text-[var(--text-secondary)]">
                {activeFw.power_profile} • {activeFw.release_date}
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                activeRun.pass_status === 'REGRESSION'
                  ? 'bg-[#FF4D2E]/15 text-[#FF4D2E] border-[#FF4D2E]/30'
                  : activeRun.pass_status === 'WARN'
                  ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
              }`}
            >
              {activeRun.pass_status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-[var(--border-card)]">
            <div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">Bandwidth</div>
              <div className="font-mono-num text-xs font-bold text-[#00B4D8]">
                {activeRun.throughput_mbps.toLocaleString()} MB/s
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase flex items-center justify-center gap-0.5">
                <Zap className="w-2.5 h-2.5 text-[#A855F7]" /> Power
              </div>
              <div className="font-mono-num text-xs font-bold text-[#A855F7]">
                {activeRun.power_avg_w} W
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase flex items-center justify-center gap-0.5">
                <Thermometer className="w-2.5 h-2.5 text-[#FF6B2C]" /> Ctrl
              </div>
              <div className="font-mono-num text-xs font-bold text-[#FF6B2C]">
                {activeRun.temp_controller_c}°C
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Right Legend */}
      <div className="hidden sm:flex absolute bottom-4 right-4 z-10 items-center gap-3 px-3 py-1.5 rounded-lg bg-[var(--bg-tooltip)] border border-[var(--border-card)] text-[11px] text-[var(--text-secondary)] backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF]" /> GA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF4D2E]" /> Regression
        </span>
      </div>
    </div>
  );
};
