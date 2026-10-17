// src/features/hero3d/FloodScene.jsx
import { Canvas, useFrame, useLoader, useThree, extend } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { TextureLoader, SRGBColorSpace, Vector3 } from 'three';

extend({ OrbitControls });

// Centro de la ciudad y conversión lat/lng -> unidades (1 unidad ≈ 1 km)
const C_LAT = -27.8;
const C_LNG = -64.24;
const toXZ = (lat, lng) => [(lng - C_LNG) * 98, -(lat - C_LAT) * 111];

// Los colores de prioridad NO cambian con la paleta
const LEVEL_COLOR = {
  critica: '#ef4444',
  alta: '#f97316',
  media: '#facc15',
  baja: '#94a3b8',
};

// Colores de la escena por paleta: fondo/niebla, agua, luz de cielo
const SCENE_THEMES = {
  sobria: { bg: '#0a0a0b', water: '#7f9bb0', waterRing: '#b6c8d4', sky: '#e5e7eb' },
  aurora: { bg: '#0b0620', water: '#a78bfa', waterRing: '#c4b5fd', sky: '#ddd6fe' },
  semaforo: { bg: '#050505', water: '#a0a0a0', waterRing: '#e5e5e5', sky: '#f5f5f5' },
  hibrida: { bg: '#040a14', water: '#22d3ee', waterRing: '#67e8f9', sky: '#bae6fd' },
};

const readSceneTheme = () =>
  SCENE_THEMES[document.documentElement.dataset.theme] ?? SCENE_THEMES.sobria;

// Lee la paleta activa del <html> y se actualiza cuando cambia
function useSceneTheme() {
  const [theme, setTheme] = useState(readSceneTheme);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(readSceneTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    setTheme(readSceneTheme());
    return () => obs.disconnect();
  }, []);
  return theme;
}

// Lugares pre-cargados: puntos casi neutros (blanco para salud, gris para el resto)
const KIND_COLOR = {
  hospital: '#f4f4f5',
  centro_salud: '#f4f4f5',
  refugio: '#a1a1aa',
  escuela: '#a1a1aa',
  geriatrico: '#d4d4d8',
};

// Gira sola al arrancar; se detiene al tocarla. Si hay "focus", vuela hacia ese punto.
function Controls({ focus }) {
  const { camera, gl } = useThree();
  const ref = useRef();
  const goal = useRef(null);

  useEffect(() => {
    const c = ref.current;
    const stop = () => {
      c.autoRotate = false;
      goal.current = null; // si la persona toca la escena, cancela el vuelo
    };
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, []);

  useEffect(() => {
    if (!focus) return;
    const [x, z] = focus;
    goal.current = {
      target: new Vector3(x, 0.3, z),
      pos: new Vector3(x + 1.6, 2.2, z + 2.4),
    };
    ref.current.autoRotate = false;
  }, [focus]);

  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    const g = goal.current;
    if (g) {
      c.target.lerp(g.target, 0.06);
      camera.position.lerp(g.pos, 0.06);
      if (camera.position.distanceTo(g.pos) < 0.02) goal.current = null;
    }
    c.update();
  });

  return (
    <orbitControls
      ref={ref}
      args={[camera, gl.domElement]}
      enableDamping
      dampingFactor={0.08}
      autoRotate
      autoRotateSpeed={0.35}
      minDistance={3}
      maxDistance={20}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

// Suelo: imagen satelital real (16 x 14 km), levemente atenuada
function Ground() {
  const map = useLoader(TextureLoader, '/maps/santiago.jpg');
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 14]} />
      <meshStandardMaterial map={map} roughness={1} color="#bfc3ca" />
    </mesh>
  );
}

// Agua: disco + anillo que se expande como una onda (color según la paleta)
function FloodZone({ place, index, theme }) {
  const ring = useRef();
  const [x, z] = toXZ(place.lat, place.lng);
  const radius = 0.45 + place.vecesAfectado * 0.2;

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * 0.35 + index * 0.37) % 1;
    if (ring.current) {
      ring.current.scale.setScalar(0.7 + t * 0.6);
      ring.current.material.opacity = 0.5 * (1 - t);
    }
  });

  return (
    <group position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial color={theme.water} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[radius * 0.94, radius, 48]} />
        <meshBasicMaterial color={theme.waterRing} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

// Lugar pre-cargado: punto chico, casi neutro
function PlaceDot({ place }) {
  const [x, z] = toXZ(place.lat, place.lng);
  const color = KIND_COLOR[place.kind] ?? '#a1a1aa';
  return (
    <mesh position={[x, 0.06, z]}>
      <sphereGeometry args={[0.05, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
    </mesh>
  );
}

function ReportPin({ report, offset, selected, onSelect }) {
  const head = useRef();
  const ring = useRef();
  const [x, z] = toXZ(report.lat, report.lng);
  const color = LEVEL_COLOR[report.level];
  const height = 0.5 + (report.score / 100) * 1.5;
  const critical = report.level === 'critica';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (head.current) {
      const base = selected ? 1.6 : 1;
      head.current.scale.setScalar(
        critical ? base * (1 + Math.sin(t * 5) * 0.25) : base
      );
    }
    if (ring.current) {
      const k = (t * 0.8) % 1;
      ring.current.scale.setScalar(1 + k * 2.5);
      ring.current.material.opacity = 0.5 * (1 - k);
    }
  });

  return (
    <group
      position={[x + offset, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(report.id);
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, height, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh ref={head} position={[0, height, 0]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      {/* Zona invisible más grande, para tocar el pin con facilidad en tablet o celular */}
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.1, 32]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

// Edificios en escala de grises: el tipo se distingue por tamaño y por claridad
const BUILDING_STYLE = {
  hospital: { w: 0.28, h: 0.45, color: '#e4e4e7' },
  centro_salud: { w: 0.2, h: 0.3, color: '#d4d4d8' },
  escuela: { w: 0.3, h: 0.2, color: '#a1a1aa' },
  geriatrico: { w: 0.22, h: 0.25, color: '#c4c4cc' },
  refugio: { w: 0.4, h: 0.18, color: '#8b8b94' },
};

// Generador pseudoaleatorio con semilla: mismas casitas en cada recarga
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Buildings({ places }) {
  const items = useMemo(() => {
    const list = [];
    places.forEach((p, pi) => {
      const [x, z] = toXZ(p.lat, p.lng);
      const style = BUILDING_STYLE[p.kind];
      if (style) {
        list.push({ id: p.id, x, z, w: style.w, h: style.h, color: style.color });
      }
      if (p.kind === 'zona_inundable' || p.kind === 'planta_agua') {
        const rnd = seeded(pi * 7919 + 13);
        const reach = 0.45 + p.vecesAfectado * 0.2;
        for (let i = 0; i < 14; i++) {
          const ang = rnd() * Math.PI * 2;
          const dist = Math.sqrt(rnd()) * reach;
          list.push({
            id: `${p.id}-h${i}`,
            x: x + Math.cos(ang) * dist,
            z: z + Math.sin(ang) * dist,
            w: 0.07 + rnd() * 0.05,
            h: 0.05 + rnd() * 0.08,
            color: '#71717a',
          });
        }
      }
    });
    return list;
  }, [places]);

  return (
    <>
      {items.map((b) => (
        <mesh key={b.id} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color={b.color} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

export default function FloodScene({ reports, places, selectedId, onSelect }) {
  const theme = useSceneTheme();
  const selected = reports.find((r) => r.id === selectedId);
  // Solo recalcula cuando cambia el pin elegido
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const focus = useMemo(() => (selected ? toXZ(selected.lat, selected.lng) : null), [selectedId]);

  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 6, 9], fov: 50 }}>
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={[theme.bg, 12, 28]} />
      <hemisphereLight args={[theme.sky, theme.bg, 0.9]} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} />

      <Suspense fallback={null}>
        <Ground />
      </Suspense>

      {places
        .filter((p) => p.inundable)
        .map((p, i) => (
          <FloodZone key={p.id} place={p} index={i} theme={theme} />
        ))}
      {places.map((p) => (
        <PlaceDot key={p.id} place={p} />
      ))}
      <Buildings places={places} />
      {reports.map((r, i) => (
        <ReportPin
          key={r.id}
          report={r}
          offset={(i % 3) * 0.18}
          selected={r.id === selectedId}
          onSelect={onSelect}
        />
      ))}

      <Controls focus={focus} />
    </Canvas>
  );
}