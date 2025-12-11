// 3D Bathroom Fixtures - Toilets, Urinals, Sinks, Stalls

import { useRef, useState } from 'react';
import { Mesh, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// ============================================
// TOILET STALL (with door)
// ============================================
interface ToiletStallProps {
  position: [number, number, number];
  gender: 'F' | 'M' | 'both';
  isOccupied: boolean;
  onHover?: (hovering: boolean) => void;
  onClick?: () => void;
}

export function ToiletStall({ position, gender, isOccupied, onHover, onClick }: ToiletStallProps) {
  const [hovered, setHovered] = useState(false);
  const doorRef = useRef<Mesh>(null);
  
  // Animate door based on occupancy
  useFrame(() => {
    if (doorRef.current) {
      const targetRotation = isOccupied ? -Math.PI * 0.6 : 0;
      doorRef.current.rotation.y += (targetRotation - doorRef.current.rotation.y) * 0.1;
    }
  });

  const wallColor = gender === 'F' ? '#f8bbd9' : gender === 'M' ? '#90caf9' : '#c5e1a5';
  const doorColor = '#8b7355';

  return (
    <group 
      position={position}
      onPointerOver={() => { setHovered(true); onHover?.(true); }}
      onPointerOut={() => { setHovered(false); onHover?.(false); }}
      onClick={onClick}
    >
      {/* Back wall */}
      <mesh position={[0.5, 1.2, 0]} castShadow>
        <boxGeometry args={[1, 2.4, 0.1]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* Left wall */}
      <mesh position={[0.05, 1.2, 0.45]} castShadow>
        <boxGeometry args={[0.1, 2.4, 0.8]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* Right wall */}
      <mesh position={[0.95, 1.2, 0.45]} castShadow>
        <boxGeometry args={[0.1, 2.4, 0.8]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* Door (hinged on left) */}
      <group position={[0.1, 0, 0.85]}>
        <mesh ref={doorRef} position={[0.35, 1.1, 0]} castShadow>
          <boxGeometry args={[0.7, 2.0, 0.05]} />
          <meshStandardMaterial color={doorColor} />
        </mesh>
      </group>

      {/* Toilet (simplified) */}
      <group position={[0.5, 0, 0.3]}>
        {/* Bowl */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.18, 0.5, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Tank */}
        <mesh position={[0, 0.55, -0.15]} castShadow>
          <boxGeometry args={[0.35, 0.4, 0.2]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Occupancy indicator light */}
      <mesh position={[0.5, 2.3, 0.9]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial 
          color={isOccupied ? '#ff3333' : '#33ff33'} 
          emissive={isOccupied ? '#ff0000' : '#00ff00'}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Hover highlight */}
      {hovered && (
        <mesh position={[0.5, 1.2, 0.45]}>
          <boxGeometry args={[1.1, 2.5, 1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
}

// ============================================
// URINAL
// ============================================
interface UrinalProps {
  position: [number, number, number];
  isOccupied: boolean;
  onHover?: (hovering: boolean) => void;
}

export function Urinal({ position, isOccupied, onHover }: UrinalProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group 
      position={position}
      onPointerOver={() => { setHovered(true); onHover?.(true); }}
      onPointerOut={() => { setHovered(false); onHover?.(false); }}
    >
      {/* Back plate */}
      <mesh position={[0.3, 0.8, 0.02]} castShadow>
        <boxGeometry args={[0.5, 1.2, 0.04]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* Urinal bowl */}
      <mesh position={[0.3, 0.6, 0.15]} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 0.6, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Top part */}
      <mesh position={[0.3, 1.0, 0.1]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Flush valve */}
      <mesh position={[0.3, 1.3, 0.05]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Privacy divider (optional) */}
      <mesh position={[0.6, 0.8, 0.3]} castShadow>
        <boxGeometry args={[0.05, 1.2, 0.5]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>

      {/* Occupancy indicator */}
      <mesh position={[0.3, 1.5, 0.1]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial 
          color={isOccupied ? '#ff3333' : '#33ff33'} 
          emissive={isOccupied ? '#ff0000' : '#00ff00'}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ============================================
// SINK WITH MIRROR
// ============================================
interface SinkProps {
  position: [number, number, number];
  isOccupied: boolean;
  onHover?: (hovering: boolean) => void;
}

export function Sink({ position, isOccupied, onHover }: SinkProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group 
      position={position}
      onPointerOver={() => { setHovered(true); onHover?.(true); }}
      onPointerOut={() => { setHovered(false); onHover?.(false); }}
    >
      {/* Counter */}
      <mesh position={[0.4, 0.85, 0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.1, 0.5]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      {/* Sink basin (inset) */}
      <mesh position={[0.4, 0.82, 0.25]}>
        <cylinderGeometry args={[0.15, 0.12, 0.15, 24]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>

      {/* Faucet */}
      <mesh position={[0.4, 1.0, 0.08]} castShadow>
        <boxGeometry args={[0.08, 0.2, 0.04]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.4, 1.05, 0.18]} castShadow rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.15, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Mirror */}
      <mesh position={[0.4, 1.5, 0.02]}>
        <boxGeometry args={[0.6, 0.8, 0.02]} />
        <meshStandardMaterial 
          color="#a8d8ea" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>

      {/* Mirror frame */}
      <mesh position={[0.4, 1.5, 0.01]}>
        <boxGeometry args={[0.65, 0.85, 0.01]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>

      {/* Cabinet under sink */}
      <mesh position={[0.4, 0.4, 0.25]} castShadow>
        <boxGeometry args={[0.7, 0.8, 0.45]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
    </group>
  );
}

// ============================================
// CHANGING TABLE
// ============================================
interface ChangingTableProps {
  position: [number, number, number];
  isOccupied: boolean;
}

export function ChangingTable({ position, isOccupied }: ChangingTableProps) {
  return (
    <group position={position}>
      {/* Wall mount */}
      <mesh position={[0.5, 1.0, 0.05]} castShadow>
        <boxGeometry args={[0.8, 0.1, 0.1]} />
        <meshStandardMaterial color="#666666" />
      </mesh>

      {/* Table surface (folded down when occupied) */}
      <mesh 
        position={[0.5, isOccupied ? 0.85 : 1.0, isOccupied ? 0.35 : 0.15]} 
        rotation={[isOccupied ? 0 : Math.PI / 2, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.8, 0.05, 0.6]} />
        <meshStandardMaterial color="#fff59d" />
      </mesh>

      {/* Baby icon */}
      <Text
        position={[0.5, 1.3, 0.1]}
        fontSize={0.2}
        color="#ff9800"
        anchorX="center"
        anchorY="middle"
      >
        👶
      </Text>

      {/* Occupancy indicator */}
      <mesh position={[0.5, 1.5, 0.1]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial 
          color={isOccupied ? '#ff3333' : '#33ff33'} 
          emissive={isOccupied ? '#ff0000' : '#00ff00'}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ============================================
// WALL SEGMENT
// ============================================
interface WallProps {
  position: [number, number, number];
  width: number;
  height?: number;
  rotation?: [number, number, number];
}

export function Wall({ position, width, height = 3, rotation = [0, 0, 0] }: WallProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[width, height, 0.15]} />
      <meshStandardMaterial color="#e8e4e0" />
    </mesh>
  );
}

// ============================================
// ENTRANCE / EXIT MARKER
// ============================================
interface EntranceMarkerProps {
  position: [number, number, number];
  type: 'entrance' | 'exit';
}

export function EntranceMarker({ position, type }: EntranceMarkerProps) {
  const color = type === 'entrance' ? '#4caf50' : '#ff9800';
  const text = type === 'entrance' ? 'IN' : 'OUT';

  return (
    <group position={position}>
      {/* Floor marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.01, 0.5]}>
        <circleGeometry args={[0.4, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Arrow */}
      <mesh position={[0.5, 0.02, 0.5]} rotation={[-Math.PI / 2, 0, type === 'entrance' ? Math.PI : 0]}>
        <coneGeometry args={[0.2, 0.4, 3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Label */}
      <Text
        position={[0.5, 0.5, 0.5]}
        fontSize={0.2}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  );
}

