import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EDGE_HUBS, EdgeHub, FlowLayer, GLOBE_ARCS } from '../data/radarData';
import { Activity, ShieldAlert, Sparkles, Globe2, Pause, Play } from 'lucide-react';

interface Globe3DProps {
  selectedHub: EdgeHub | null;
  onSelectHub: (hub: EdgeHub) => void;
  flowLayer: FlowLayer;
  onChangeFlowLayer: (layer: FlowLayer) => void;
  isLive: boolean;
  theme: 'dark' | 'light';
}

// Compact continent landmass checker (lat, lng) -> boolean for crisp dotted Earth
function isLand(lat: number, lng: number): boolean {
  const boxes: [number, number, number, number][] = [
    // North America
    [50, 71, -168, -55],
    [30, 50, -126, -65],
    [15, 30, -115, -82],
    [8, 18, -92, -77],
    // Greenland
    [60, 82, -56, -18],
    // South America
    [-5, 12, -80, -35],
    [-25, -5, -75, -35],
    [-54, -25, -74, -53],
    // Europe
    [36, 70, -10, 40],
    [50, 60, -8, 2],
    // Africa
    [15, 36, -17, 35],
    [-5, 15, -17, 50],
    [-34, -5, 12, 41],
    [-25, -12, 43, 50], // Madagascar
    // Middle East & Asia
    [12, 42, 34, 62],
    [42, 74, 40, 140],
    [55, 70, 140, 175],
    [22, 42, 62, 122],
    [8, 28, 68, 92],   // India
    [10, 24, 92, 109], // SE Asia
    [-8, 6, 96, 140],  // Indonesia / Borneo / PNG
    [30, 45, 129, 145], // Japan / Korea
    // Australia & NZ
    [-39, -11, 113, 154],
    [-47, -35, 166, 179],
  ];

  for (const [minLat, maxLat, minLng, maxLng] of boxes) {
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      // Organic edge carve-out using deterministic pseudo-noise so coastlines look natural
      const n = Math.sin(lat * 0.45 + lng * 0.25) * Math.cos(lng * 0.35 - lat * 0.2);
      const edgeDist = Math.min(
        lat - minLat,
        maxLat - lat,
        lng - minLng,
        maxLng - lng
      );
      if (edgeDist > 2.2 || n > -0.25) return true;
    }
  }
  return false;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

const ARC_COLORS: Record<'traffic' | 'ddos' | 'ai', number> = {
  traffic: 0x00e5ff,
  ddos: 0xff4d2e,
  ai: 0xa855f7,
};

export const Globe3D: React.FC<Globe3DProps> = ({
  selectedHub,
  onSelectHub,
  flowLayer,
  onChangeFlowLayer,
  isLive,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredHub, setHoveredHub] = useState<EdgeHub | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(true);
  const flowLayerRef = useRef<FlowLayer>(flowLayer);
  const isLiveRef = useRef(isLive);
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const themeMatsRef = useRef<{
    coreMat: THREE.MeshBasicMaterial;
    wireMat: THREE.MeshBasicMaterial;
    oceanMat: THREE.PointsMaterial;
    landMat: THREE.PointsMaterial;
    atmosMat: THREE.ShaderMaterial;
    pulses: THREE.MeshBasicMaterial[];
  } | null>(null);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    flowLayerRef.current = flowLayer;
  }, [flowLayer]);

  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  // Update Three.js scene colors when theme changes
  useEffect(() => {
    const mats = themeMatsRef.current;
    if (!mats) return;
    if (theme === 'light') {
      mats.coreMat.color.setHex(0xe8eff8);
      mats.wireMat.color.setHex(0x94a3b8);
      mats.wireMat.opacity = 0.22;
      mats.oceanMat.color.setHex(0x94a3b8);
      mats.oceanMat.opacity = 0.35;
      mats.landMat.color.setHex(0x0284c7);
      mats.landMat.opacity = 0.85;
      mats.atmosMat.uniforms.uColor.value.set(0.02, 0.55, 0.95);
      mats.atmosMat.uniforms.uStrength.value = 0.25;
      mats.pulses.forEach((p) => p.color.setHex(0x0f172a));
    } else {
      mats.coreMat.color.setHex(0x070b12);
      mats.wireMat.color.setHex(0x1e293b);
      mats.wireMat.opacity = 0.18;
      mats.oceanMat.color.setHex(0x334155);
      mats.oceanMat.opacity = 0.35;
      mats.landMat.color.setHex(0xffffff);
      mats.landMat.opacity = 0.9;
      mats.atmosMat.uniforms.uColor.value.set(0.0, 0.72, 1.0);
      mats.atmosMat.uniforms.uStrength.value = 0.55;
      mats.pulses.forEach((p) => p.color.setHex(0xffffff));
    }
  }, [theme]);

  // Smoothly focus globe when selectedHub changes
  useEffect(() => {
    if (!selectedHub) return;
    const pos = latLngToVector3(selectedHub.lat, selectedHub.lng, 1);
    const targetY = -Math.atan2(pos.x, pos.z);
    const targetX = THREE.MathUtils.clamp((selectedHub.lat * Math.PI) / 180 * 0.6, -0.7, 0.7);
    targetRotationRef.current = { x: targetX, y: targetY };
  }, [selectedHub]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 5.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.25;
    globeGroup.rotation.y = -0.8;
    scene.add(globeGroup);

    const GLOBE_RADIUS = 1.85;

    // 1. Dark inner core sphere
    const coreGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.985, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x070b12,
      transparent: true,
      opacity: 0.96,
    });
    globeGroup.add(new THREE.Mesh(coreGeo, coreMat));

    // 2. Subtle latitude/longitude wireframe cage
    const wireGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.992, 24, 16);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    globeGroup.add(new THREE.Mesh(wireGeo, wireMat));

    // 3. Atmospheric Fresnel Halo
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.14, 48, 48);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Vector3(0.0, 0.72, 1.0) },
        uStrength: { value: 0.55 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uStrength;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          gl_FragColor = vec4(uColor, 1.0) * intensity * uStrength;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // 4. Dotted Continent Matrix
    const landPositions: number[] = [];
    const landColors: number[] = [];
    const oceanPositions: number[] = [];

    const samples = 5200;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < samples; i++) {
      const y = 1 - (i / (samples - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      const lat = 90 - Math.acos(y) * (180 / Math.PI);
      const lng = Math.atan2(z, -x) * (180 / Math.PI) - 180;
      const normLng = ((lng + 540) % 360) - 180;

      const v = latLngToVector3(lat, normLng, GLOBE_RADIUS);
      if (isLand(lat, normLng)) {
        landPositions.push(v.x, v.y, v.z);
        const tint = 0.55 + Math.random() * 0.45;
        landColors.push(0.22 * tint, 0.65 * tint, 0.95 * tint);
      } else if (i % 3 === 0) {
        oceanPositions.push(v.x, v.y, v.z);
      }
    }

    const landGeo = new THREE.BufferGeometry();
    landGeo.setAttribute('position', new THREE.Float32BufferAttribute(landPositions, 3));
    landGeo.setAttribute('color', new THREE.Float32BufferAttribute(landColors, 3));
    const landMat = new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    globeGroup.add(new THREE.Points(landGeo, landMat));

    const oceanGeo = new THREE.BufferGeometry();
    oceanGeo.setAttribute('position', new THREE.Float32BufferAttribute(oceanPositions, 3));
    const oceanMat = new THREE.PointsMaterial({
      size: 0.014,
      color: 0x334155,
      transparent: true,
      opacity: 0.35,
    });
    globeGroup.add(new THREE.Points(oceanGeo, oceanMat));

    // 5. Hub Markers & Pulsing Rings
    const hubMeshes: THREE.Mesh[] = [];
    const pulseRings: { mesh: THREE.Mesh; phase: number }[] = [];

    EDGE_HUBS.forEach((hub, idx) => {
      const pos = latLngToVector3(hub.lat, hub.lng, GLOBE_RADIUS + 0.025);
      const color =
        hub.status === 'mitigating' ? 0xff4d2e : hub.status === 'elevated' ? 0xf59e0b : 0x00e5ff;

      const dotGeo = new THREE.SphereGeometry(0.042, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.copy(pos);
      dotMesh.userData = { hub };
      globeGroup.add(dotMesh);
      hubMeshes.push(dotMesh);

      const ringGeo = new THREE.RingGeometry(0.055, 0.078, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(pos.clone().multiplyScalar(2));
      globeGroup.add(ringMesh);
      pulseRings.push({ mesh: ringMesh, phase: idx * 0.65 });
    });

    // 6. 3D Animated Bezier Arcs & Traveling Pulses
    const arcEntries: {
      type: 'traffic' | 'ddos' | 'ai';
      line: THREE.Line;
      pulse: THREE.Mesh;
      curve: THREE.QuadraticBezierCurve3;
      speed: number;
      offset: number;
    }[] = [];

    GLOBE_ARCS.forEach((arc, idx) => {
      const fromHub = EDGE_HUBS.find((h) => h.id === arc.from);
      const toHub = EDGE_HUBS.find((h) => h.id === arc.to);
      if (!fromHub || !toHub) return;

      const start = latLngToVector3(fromHub.lat, fromHub.lng, GLOBE_RADIUS + 0.02);
      const end = latLngToVector3(toHub.lat, toHub.lng, GLOBE_RADIUS + 0.02);
      const dist = start.distanceTo(end);
      const mid = start
        .clone()
        .add(end)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(GLOBE_RADIUS + dist * 0.42);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(48);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
      const arcMat = new THREE.LineBasicMaterial({
        color: ARC_COLORS[arc.type],
        transparent: true,
        opacity: 0.45,
      });
      const line = new THREE.Line(arcGeo, arcMat);
      globeGroup.add(line);

      const pulseGeo = new THREE.SphereGeometry(0.03, 10, 10);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
      });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      globeGroup.add(pulse);

      arcEntries.push({
        type: arc.type,
        line,
        pulse,
        curve,
        speed: 0.25 + arc.intensity * 0.25,
        offset: idx * 0.19,
      });
    });

    themeMatsRef.current = {
      coreMat,
      wireMat,
      oceanMat,
      landMat,
      atmosMat,
      pulses: arcEntries.map((a) => a.pulse.material as THREE.MeshBasicMaterial),
    };

    // Pointer interaction (drag + raycast)
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };
    let velocity = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      targetRotationRef.current = null;
      prevPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - prevPointer.x;
        const dy = e.clientY - prevPointer.y;
        velocity = { x: dy * 0.005, y: dx * 0.005 };
        globeGroup.rotation.y += velocity.y;
        globeGroup.rotation.x = THREE.MathUtils.clamp(globeGroup.rotation.x + velocity.x, -1.1, 1.1);
        prevPointer = { x: e.clientX, y: e.clientY };
        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hubMeshes, false);
      if (hits.length > 0) {
        const hub = hits[0].object.userData.hub as EdgeHub;
        setHoveredHub(hub);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredHub(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging && Math.abs(e.clientX - prevPointer.x) < 4) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(hubMeshes, false);
        if (hits.length > 0) {
          const hub = hits[0].object.userData.hub as EdgeHub;
          onSelectHub(hub);
        }
      }
      isDragging = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (targetRotationRef.current) {
        globeGroup.rotation.x += (targetRotationRef.current.x - globeGroup.rotation.x) * 0.07;
        globeGroup.rotation.y += (targetRotationRef.current.y - globeGroup.rotation.y) * 0.07;
        if (
          Math.abs(targetRotationRef.current.x - globeGroup.rotation.x) < 0.005 &&
          Math.abs(targetRotationRef.current.y - globeGroup.rotation.y) < 0.005
        ) {
          targetRotationRef.current = null;
        }
      } else if (!isDragging) {
        globeGroup.rotation.y += velocity.y;
        globeGroup.rotation.x = THREE.MathUtils.clamp(globeGroup.rotation.x + velocity.x, -1.1, 1.1);
        velocity.x *= 0.92;
        velocity.y *= 0.92;
        if (autoRotateRef.current && isLiveRef.current) {
          globeGroup.rotation.y += 0.0018;
        }
      }

      // Pulse rings
      pulseRings.forEach((p) => {
        const t = (elapsed * 0.8 + p.phase) % 1;
        const scale = 1 + t * 1.4;
        p.mesh.scale.set(scale, scale, 1);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.75;
      });

      // Filter & animate arcs
      const activeLayer = flowLayerRef.current;
      arcEntries.forEach((a) => {
        const visible = activeLayer === 'all' || a.type === activeLayer;
        a.line.visible = visible;
        a.pulse.visible = visible;
        if (visible) {
          const t = ((isLiveRef.current ? elapsed : 1.5) * a.speed + a.offset) % 1;
          a.pulse.position.copy(a.curve.getPoint(t));
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onSelectHub]);

  const activeDisplayHub = hoveredHub || selectedHub;

  return (
    <div className="relative w-full h-[460px] lg:h-[520px] rounded-2xl overflow-hidden bento-card">
      {/* Subtle radial glow behind globe */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(0,229,255,0.11),rgba(255,107,44,0.05)_45%,transparent_72%)]" />

      {/* Three.js Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Layer Controls */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-1.5 z-10">
        {(
          [
            { id: 'all', label: 'All Flows', icon: Globe2, color: 'text-[var(--text-primary)]' },
            { id: 'traffic', label: 'Edge Traffic', icon: Activity, color: 'text-[#00B4D8]' },
            { id: 'ddos', label: 'DDoS Vectors', icon: ShieldAlert, color: 'text-[#FF4D2E]' },
            { id: 'ai', label: 'AI Crawlers', icon: Sparkles, color: 'text-[#A855F7]' },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = flowLayer === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeFlowLayer(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer backdrop-blur-md ${
                active
                  ? 'bg-[#FF6B2C]/15 border-[#FF6B2C]/50 text-[var(--text-primary)] shadow-md'
                  : 'bg-[var(--bg-tooltip)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${item.color}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Top-Right Auto-Rotate Control */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setAutoRotate((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer backdrop-blur-md"
          title="Toggle Globe Rotation"
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5 text-[#00B4D8]" /> : <Play className="w-3.5 h-3.5 text-[#FF6B2C]" />}
          {autoRotate ? 'Spinning' : 'Paused'}
        </button>
      </div>

      {/* Bottom-Left Interactive Hub Inspector Card */}
      {activeDisplayHub && (
        <div className="absolute bottom-4 left-4 z-10 w-72 rounded-xl bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] p-3.5 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle-hover)] font-mono-num text-xs font-semibold text-[var(--text-primary)]">
                {activeDisplayHub.code}
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{activeDisplayHub.city}</span>
            </div>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                activeDisplayHub.status === 'mitigating'
                  ? 'bg-[#FF4D2E]/15 text-[#FF4D2E] border border-[#FF4D2E]/30'
                  : activeDisplayHub.status === 'elevated'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {activeDisplayHub.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1.5 border-t border-[var(--border-card)]">
            <div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">Edge RPS</div>
              <div className="font-mono-num text-sm font-bold text-[#00B4D8]">{activeDisplayHub.rps}M</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">DDoS Load</div>
              <div className="font-mono-num text-sm font-bold text-[#FF4D2E]">{activeDisplayHub.ddosGbps}G</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">Latency</div>
              <div className="font-mono-num text-sm font-bold text-emerald-500">{activeDisplayHub.latencyMs}ms</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Right Legend */}
      <div className="hidden sm:flex absolute bottom-4 right-4 z-10 items-center gap-3 px-3 py-1.5 rounded-lg bg-[var(--bg-tooltip)] border border-[var(--border-card)] text-[11px] text-[var(--text-secondary)] backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF]" /> HTTP/3
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF4D2E]" /> DDoS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#A855F7]" /> AI Bot
        </span>
        <span className="text-[var(--text-muted)]">• Drag to rotate</span>
      </div>
    </div>
  );
};
