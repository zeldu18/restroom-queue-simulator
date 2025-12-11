// 3D Bathroom Floor with Tiles

import React, { useRef } from 'react';
import { Mesh, RepeatWrapping, TextureLoader } from 'three';
import { useLoader } from '@react-three/fiber';

interface FloorProps {
  width: number;
  depth: number;
  position?: [number, number, number];
}

export function Floor({ width, depth, position = [0, 0, 0] }: FloorProps) {
  const meshRef = useRef<Mesh>(null);
  
  // Create a procedural tile pattern
  const tileSize = 1;
  const tilesX = Math.ceil(width / tileSize);
  const tilesZ = Math.ceil(depth / tileSize);

  return (
    <group position={position}>
      {/* Main floor */}
      <mesh 
        ref={meshRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[width / 2, 0, depth / 2]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial 
          color="#d4cfc7" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Tile grid lines */}
      {Array.from({ length: tilesX + 1 }).map((_, i) => (
        <mesh key={`vline-${i}`} position={[i * tileSize, 0.001, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, depth]} />
          <meshBasicMaterial color="#b8b0a4" />
        </mesh>
      ))}
      {Array.from({ length: tilesZ + 1 }).map((_, i) => (
        <mesh key={`hline-${i}`} position={[width / 2, 0.001, i * tileSize]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, 0.02]} />
          <meshBasicMaterial color="#b8b0a4" />
        </mesh>
      ))}
    </group>
  );
}

// Checkered floor alternative
export function CheckeredFloor({ width, depth, position = [0, 0, 0] }: FloorProps) {
  const tiles: React.ReactElement[] = [];
  const tileSize = 1;
  
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const isLight = (x + z) % 2 === 0;
      tiles.push(
        <mesh 
          key={`tile-${x}-${z}`}
          position={[x + 0.5, 0, z + 0.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[tileSize, tileSize]} />
          <meshStandardMaterial 
            color={isLight ? '#e8e4e0' : '#d8d4d0'} 
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>
      );
    }
  }

  return <group position={position}>{tiles}</group>;
}

