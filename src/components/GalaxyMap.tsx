"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { CHARACTER_TYPES, LABELS } from "@/lib/constants";
import type { CharacterType, CharacterLabel } from "@/lib/constants";
import type { Character } from "@/lib/db/types";
import { useGameState } from "@/contexts/GameStateProvider";
import { getRank } from "@/lib/xp";
import { generateUUID } from "@/lib/uuid";

// --- 3D Components ---

function YouNode({ level }: { level: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.5;
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        <tetrahedronGeometry args={[0.25, 0]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Html distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center -translate-x-1/2 mt-4 select-none">
          <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#44aaff" }}>You</span>
          {level > 0 && (
            <span className="text-[10px] text-accent whitespace-nowrap">Lv. {level}</span>
          )}
        </div>
      </Html>
    </group>
  );
}

function ConnectionToYou({ position, selected }: { position: [number, number, number]; selected: boolean }) {
  const obj = useMemo(() => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...position)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: selected ? 1 : 0.4,
    });
    return new THREE.Line(geometry, material);
  }, [position, selected]);
  return <primitive object={obj} />;
}

function DottedConnection({
  fromPos,
  toPos,
}: {
  fromPos: [number, number, number];
  toPos: [number, number, number];
}) {
  const ref = useRef<THREE.Line>(null);

  const obj = useMemo(() => {
    const points = [new THREE.Vector3(...fromPos), new THREE.Vector3(...toPos)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.35,
      dashSize: 0.15,
      gapSize: 0.1,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, [fromPos, toPos]);

  useFrame(() => {
    if (!ref.current) return;
    const posAttr = ref.current.geometry.attributes.position;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    arr[0] = fromPos[0]; arr[1] = fromPos[1]; arr[2] = fromPos[2];
    arr[3] = toPos[0]; arr[4] = toPos[1]; arr[5] = toPos[2];
    posAttr.needsUpdate = true;
    ref.current.computeLineDistances();
  });

  return <primitive ref={ref} object={obj} />;
}

const ghostBoxGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

function GhostEdges() {
  const edges = useMemo(() => new THREE.EdgesGeometry(ghostBoxGeo), []);
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.5} />
    </lineSegments>
  );
}

function CharacterNode({
  character,
  selected,
  onSelect,
  anchorPos,
  selectedId,
  isLinked,
  onLink,
  nodeRef,
}: {
  character: Character;
  selected: boolean;
  onSelect: (id: string) => void;
  anchorPos: [number, number, number] | null;
  selectedId: string | null;
  isLinked: boolean;
  onLink: (id: string) => void;
  nodeRef: (el: THREE.Group | null) => void;
}) {
  const typeInfo = CHARACTER_TYPES[character.type] || CHARACTER_TYPES.CONTACT;
  const color = typeInfo.color;
  const isGhost = character.type === "GHOST";
  const isAlly = character.type === "ALLY";
  const isContact = character.type === "CONTACT";
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const showLinkOption = selectedId !== null && selectedId !== character.id && !selected;

  const drift = useMemo(() => {
    const cx = anchorPos ? anchorPos[0] : 0;
    const cz = anchorPos ? anchorPos[2] : 0;
    const dx = character.position[0] - cx;
    const dz = character.position[2] - cz;
    const radius = Math.sqrt(dx * dx + dz * dz);
    return {
      speed: 0.08 + Math.random() * 0.06,
      radius: Math.max(radius, 1),
      offsetY: character.position[1],
      startAngle: Math.atan2(dz, dx),
      anchorPos: anchorPos || ([0, 0, 0] as [number, number, number]),
    };
  }, [character.position, anchorPos]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (isGhost && groupRef.current) {
      const angle = drift.startAngle + t * drift.speed;
      groupRef.current.position.x = drift.anchorPos[0] + Math.cos(angle) * drift.radius;
      groupRef.current.position.z = drift.anchorPos[2] + Math.sin(angle) * drift.radius;
      groupRef.current.position.y = drift.offsetY + Math.sin(t * 0.3) * 0.2;
    }

    if (isAlly && meshRef.current) {
      const beat = t * 2.5;
      const phase = beat % 1;
      let scale = 1;
      if (phase < 0.1) {
        scale = 1 + 0.15 * Math.sin(phase / 0.1 * Math.PI);
      } else if (phase > 0.15 && phase < 0.25) {
        scale = 1 + 0.1 * Math.sin((phase - 0.15) / 0.1 * Math.PI);
      }
      meshRef.current.scale.setScalar(scale);
    }
  });

  const rank = getRank(character.mentionCount);

  return (
    <group
      ref={(el) => {
        (groupRef as React.MutableRefObject<THREE.Group | null>).current = el;
        nodeRef(el);
      }}
      position={character.position}
    >
      <mesh ref={meshRef} onClick={() => onSelect(character.id)}>
        {isContact ? (
          <sphereGeometry args={[0.12, 8, 8]} />
        ) : (
          <boxGeometry args={[0.2, 0.2, 0.2]} />
        )}
        <meshBasicMaterial color={color} transparent opacity={isGhost ? 0.15 : 1} />
      </mesh>
      {isGhost && <GhostEdges />}
      <Html distanceFactor={10} style={{ pointerEvents: showLinkOption ? "auto" : "none" }}>
        <div className="flex flex-col items-center -translate-x-1/2 mt-4 select-none">
          <span className={`text-xs whitespace-nowrap ${selected ? "text-white font-semibold" : "text-[#666666]"}`}>
            {character.name}
          </span>
          {character.mentionCount > 0 && (
            <span className="text-[10px] whitespace-nowrap text-text-muted">{rank}</span>
          )}
          {character.label !== "none" && (
            <span className="text-[10px] whitespace-nowrap" style={{ color }}>
              {character.label}
            </span>
          )}
          {selected && character.description && (
            <span className="text-[10px] text-text-muted max-w-[120px] text-center whitespace-normal">
              {character.description}
            </span>
          )}
          {showLinkOption && (
            <button
              onClick={(e) => { e.stopPropagation(); onLink(character.id); }}
              className={`text-[10px] mt-1 px-2 py-0.5 border transition-colors ${
                isLinked
                  ? "border-red-500/50 text-red-500 hover:border-red-500"
                  : "border-accent/50 text-accent hover:border-accent"
              }`}
            >
              {isLinked ? "unlink" : "link"}
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}

function LiveDottedLink({
  nodeRefs,
  fromId,
  toId,
}: {
  nodeRefs: React.MutableRefObject<Map<string, THREE.Group>>;
  fromId: string;
  toId: string;
}) {
  const fromPos = useRef<[number, number, number]>([0, 0, 0]);
  const toPos = useRef<[number, number, number]>([0, 0, 0]);

  useFrame(() => {
    const fromNode = nodeRefs.current.get(fromId);
    const toNode = nodeRefs.current.get(toId);
    if (fromNode) {
      fromPos.current = [fromNode.position.x, fromNode.position.y, fromNode.position.z];
    }
    if (toNode) {
      toPos.current = [toNode.position.x, toNode.position.y, toNode.position.z];
    }
  });

  return <DottedConnection fromPos={fromPos.current} toPos={toPos.current} />;
}

// --- Scene ---

function Scene({
  characters,
  links,
  selectedId,
  onSelect,
  onLink,
  nodeRefs,
  level,
}: {
  characters: Character[];
  links: { from: string; to: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLink: (id: string) => void;
  nodeRefs: React.MutableRefObject<Map<string, THREE.Group>>;
  level: number;
}) {
  const ghostAnchors = useMemo(() => {
    const anchors = new Map<string, string>();
    for (const link of links) {
      const fromChar = characters.find((c) => c.id === link.from);
      const toChar = characters.find((c) => c.id === link.to);
      if (!fromChar || !toChar) continue;
      if (fromChar.type === "GHOST" && toChar.type !== "GHOST") {
        anchors.set(fromChar.id, toChar.id);
      }
      if (toChar.type === "GHOST" && fromChar.type !== "GHOST") {
        anchors.set(toChar.id, fromChar.id);
      }
      if (fromChar.type === "GHOST" && toChar.type === "GHOST") {
        if (!anchors.has(fromChar.id)) anchors.set(fromChar.id, toChar.id);
      }
    }
    return anchors;
  }, [links, characters]);

  const visibleLinks = useMemo(() => {
    return links.filter((link) => {
      const fromChar = characters.find((c) => c.id === link.from);
      const toChar = characters.find((c) => c.id === link.to);
      if (!fromChar || !toChar) return false;
      return fromChar.type !== "GHOST" && toChar.type !== "GHOST";
    });
  }, [links, characters]);

  const linkedPairs = useMemo(() => {
    const set = new Set<string>();
    for (const link of links) {
      set.add(`${link.from}-${link.to}`);
      set.add(`${link.to}-${link.from}`);
    }
    return set;
  }, [links]);

  return (
    <>
      <Grid
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1f1f1f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#333333"
        fadeDistance={25}
        fadeStrength={1}
        infiniteGrid
      />
      <YouNode level={level} />
      {characters.map((character) => {
        const anchorId = ghostAnchors.get(character.id);
        const anchorChar = anchorId ? characters.find((c) => c.id === anchorId) : null;
        const anchorPos = anchorChar ? anchorChar.position : null;
        const isLinked = selectedId ? linkedPairs.has(`${selectedId}-${character.id}`) : false;

        return (
          <group key={character.id}>
            {character.type !== "GHOST" && (
              <ConnectionToYou
                position={character.position}
                selected={character.id === selectedId}
              />
            )}
            <CharacterNode
              character={character}
              selected={character.id === selectedId}
              onSelect={onSelect}
              anchorPos={anchorPos}
              selectedId={selectedId}
              isLinked={isLinked}
              onLink={onLink}
              nodeRef={(el) => {
                if (el) nodeRefs.current.set(character.id, el);
                else nodeRefs.current.delete(character.id);
              }}
            />
          </group>
        );
      })}
      {visibleLinks.map((link, i) => (
        <LiveDottedLink
          key={`${link.from}-${link.to}-${i}`}
          nodeRefs={nodeRefs}
          fromId={link.from}
          toId={link.to}
        />
      ))}
      <OrbitControls enablePan enableZoom enableRotate />
    </>
  );
}

// --- Editor ---

function CharacterEditor({
  character,
  characters,
  links,
  onUpdate,
  onDelete,
  onClose,
  onRemoveLink,
}: {
  character: Character;
  characters: Character[];
  links: { from: string; to: string }[];
  onUpdate: (char: Character) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onRemoveLink: (from: string, to: string) => void;
}) {
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description);
  const [type, setType] = useState<CharacterType>(character.type);
  const [label, setLabel] = useState<CharacterLabel>(character.label);

  const charLinks = links.filter((l) => l.from === character.id || l.to === character.id);
  const linkedIds = charLinks.map((l) => l.from === character.id ? l.to : l.from);
  const linkedCharacters = linkedIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean) as Character[];

  const rank = getRank(character.mentionCount);

  return (
    <div className="border border-border p-4 w-full md:w-72 h-full md:h-auto" style={{ backgroundColor: "#111111" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Edit Character</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">
          &times;
        </button>
      </div>

      <label className="block text-xs text-text-muted mb-1">Name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-background border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent mb-3"
      />

      <label className="block text-xs text-text-muted mb-1">Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full bg-background border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent mb-3 resize-none"
        placeholder="A short note about this person..."
      />

      <label className="block text-xs text-text-muted mb-1">Type</label>
      <div className="flex flex-col gap-1 mb-3">
        {(Object.keys(CHARACTER_TYPES) as CharacterType[]).map((key) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`text-left px-3 py-2 text-xs border transition-colors ${
              type === key
                ? "border-current"
                : "border-border hover:border-current"
            }`}
            style={{ color: type === key ? CHARACTER_TYPES[key].color : undefined }}
          >
            <span className="font-semibold" style={{ color: CHARACTER_TYPES[key].color }}>
              {CHARACTER_TYPES[key].label}
            </span>
            <span className="text-text-muted ml-2">
              {CHARACTER_TYPES[key].description}
            </span>
          </button>
        ))}
      </div>

      <label className="block text-xs text-text-muted mb-1">Label</label>
      <select
        value={label}
        onChange={(e) => setLabel(e.target.value as CharacterLabel)}
        className="w-full bg-background border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mb-3"
      >
        {LABELS.map((l) => (
          <option key={l} value={l}>{l === "none" ? "None" : l.charAt(0).toUpperCase() + l.slice(1)}</option>
        ))}
      </select>

      {/* Stats */}
      {character.mentionCount > 0 && (
        <div className="text-xs text-text-muted mb-3">
          Mentions: {character.mentionCount} &middot; Rank: <span className="text-accent">{rank}</span>
        </div>
      )}

      {/* Links section */}
      {linkedCharacters.length > 0 && (
        <>
          <label className="block text-xs text-text-muted mb-1">Linked to</label>
          <div className="mb-3">
            {linkedCharacters.map((lc) => {
              const lcType = CHARACTER_TYPES[lc.type] || CHARACTER_TYPES.CONTACT;
              return (
                <div key={lc.id} className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: lcType.color }}>{lc.name}</span>
                  <button
                    onClick={() => onRemoveLink(character.id, lc.id)}
                    className="text-xs text-text-muted hover:text-red-500"
                  >
                    unlink
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="text-xs text-text-muted mb-3">
        Distance: {Math.sqrt(character.position.reduce((s, v) => s + v * v, 0)).toFixed(1)}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { onUpdate({ ...character, name, description, type, label }); onClose(); }}
          className="flex-1 border border-accent text-accent px-3 py-2 text-sm font-semibold hover:bg-accent/5 transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => { onDelete(character.id); onClose(); }}
          className="border border-border text-red-500 px-3 py-2 text-sm hover:border-red-500 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function GalaxyMap() {
  const { characters, links, level, addCharacter, updateCharacter, deleteCharacter, addLink, removeLink, ready } = useGameState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, THREE.Group>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedCharacter = characters.find((c) => c.id === selectedId) || null;

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  function handleLink(targetId: string) {
    if (!selectedId || targetId === selectedId) return;
    const exists = links.some(
      (l) => (l.from === selectedId && l.to === targetId) || (l.from === targetId && l.to === selectedId)
    );
    if (exists) {
      removeLink(selectedId, targetId);
    } else {
      addLink(selectedId, targetId);
    }
  }

  function handleAddCharacter() {
    const id = generateUUID();
    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * 4;
    const distance = 1.5 + Math.random() * 8.5;
    const position: [number, number, number] = [
      Math.cos(angle) * distance,
      elevation,
      Math.sin(angle) * distance,
    ];
    addCharacter({ id, name: "New Person", description: "", position, type: "CONTACT", label: "none" });
    setSelectedId(id);
  }

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  if (!ready) return null;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-background">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }} dpr={[1, 1.5]} performance={{ min: 0.5 }}>
          <Scene
            characters={characters}
            links={links}
            selectedId={selectedId}
            onSelect={handleSelect}
            onLink={handleLink}
            nodeRefs={nodeRefs}
            level={level}
          />
        </Canvas>
      </div>

      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={handleAddCharacter}
          className="border border-border bg-surface text-accent px-3 py-2 text-sm font-semibold hover:border-accent transition-colors"
        >
          + Add Character
        </button>
        <button
          onClick={toggleFullscreen}
          className="border border-border bg-surface text-text-muted px-3 py-2 text-sm hover:border-accent hover:text-text-primary transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen ? (
              <>
                <polyline points="4 1 4 4 1 4" />
                <polyline points="10 1 10 4 13 4" />
                <polyline points="4 13 4 10 1 10" />
                <polyline points="10 13 10 10 13 10" />
              </>
            ) : (
              <>
                <polyline points="1 4 1 1 4 1" />
                <polyline points="13 4 13 1 10 1" />
                <polyline points="1 10 1 13 4 13" />
                <polyline points="13 10 13 13 10 13" />
              </>
            )}
          </svg>
          {isFullscreen ? "Exit" : "Fullscreen"}
        </button>
      </div>

      {selectedCharacter && (
        <div className="absolute z-50 inset-0 overflow-y-auto md:inset-auto md:top-4 md:left-4 md:max-h-[calc(100%-2rem)]" style={{ backgroundColor: "#111111" }}>
          <CharacterEditor
            key={selectedCharacter.id}
            character={selectedCharacter}
            characters={characters}
            links={links}
            onUpdate={updateCharacter}
            onDelete={(id) => { deleteCharacter(id); setSelectedId(null); }}
            onClose={() => setSelectedId(null)}
            onRemoveLink={removeLink}
          />
        </div>
      )}
    </div>
  );
}
