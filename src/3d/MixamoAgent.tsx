// 3D Agent - Simple Male (Blue) and Female (Pink) figures
// With optional pregnant indicator for females

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PersonState } from '../engine/ca-types';
import type { Gender, CharacterType, PersonState as PersonStateType } from '../engine/ca-types';

interface MixamoAgentProps {
  id: number;
  position: [number, number, number];
  gender: Gender;
  characterType: CharacterType;
  state: PersonStateType;
}

export function MixamoAgent({ id, position, gender, characterType, state }: MixamoAgentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const targetPosition = useRef<[number, number, number]>(position);
  const currentRotation = useRef(0);
  const bobPhase = useRef(Math.random() * Math.PI * 2);
  
  // Animation state
  const isWalking = state === PersonState.WALKING_TO_QUEUE || 
                    state === PersonState.WALKING_TO_STALL || 
                    state === PersonState.WALKING_TO_SINK ||
                    state === PersonState.WALKING_TO_CHANGING_TABLE ||
                    state === PersonState.EXITING;

  // Simple colors: Pink for female, Blue for male
  const mainColor = gender === 'F' ? '#e91e63' : '#2196f3';
  const skinColor = gender === 'F' ? '#ffcdd2' : '#bbdefb';
  const isPregnant = gender === 'F' && characterType === 'pregnant';

  // Update target position
  useEffect(() => {
    targetPosition.current = position;
  }, [position]);

  // Animation frame
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    const current = groupRef.current.position;
    const target = targetPosition.current;
    
    // Smooth position interpolation
    const dx = target[0] - current.x;
    const dz = target[2] - current.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > 0.01) {
      const speed = 2.0;
      const step = Math.min(speed * delta, distance);
      
      current.x += (dx / distance) * step;
      current.z += (dz / distance) * step;
      
      // Calculate target rotation
      const targetRotation = Math.atan2(dx, dz);
      
      // Smooth rotation
      let rotDiff = targetRotation - currentRotation.current;
      while (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;
      while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
      
      currentRotation.current += rotDiff * 0.15;
      groupRef.current.rotation.y = currentRotation.current;
    }
    
    // Walking bob animation
    if (isWalking) {
      bobPhase.current += delta * 8;
      const bobHeight = Math.sin(bobPhase.current) * 0.03;
      current.y = bobHeight;
    } else {
      current.y = 0;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setIsHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* SIMPLE PERSON FIGURE */}
      
      {/* Body/Torso */}
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.15, 0.5, 4, 16]} />
        <meshStandardMaterial color={mainColor} roughness={0.8} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      
      {/* Hair for females */}
      {gender === 'F' && (
        <mesh position={[0, 1.22, 0]}>
          <sphereGeometry args={[0.13, 16, 8]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} />
        </mesh>
      )}
      
      {/* Legs */}
      <mesh position={[-0.06, 0.2, 0]}>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial color={mainColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.06, 0.2, 0]}>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial color={mainColor} roughness={0.8} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.22, 0.7, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.04, 0.25, 4, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.22, 0.7, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.04, 0.25, 4, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      
      {/* Pregnant belly indicator */}
      {isPregnant && (
        <mesh position={[0, 0.55, 0.12]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={mainColor} roughness={0.8} />
        </mesh>
      )}
      
      {/* Pregnant emoji */}
      {isPregnant && (
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.2} color="white" outlineWidth={0.03} outlineColor="black">
            🤰
          </Text>
        </Billboard>
      )}
      
      {/* Hover tooltip */}
      {isHovered && (
        <Billboard position={[0, 1.7, 0]}>
          <Text fontSize={0.16} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black">
            {`#${id} ${gender === 'F' ? '♀' : '♂'}`}
          </Text>
          <Text position={[0, -0.22, 0]} fontSize={0.12} color="#ffeb3b" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="black">
            {state.replace(/_/g, ' ').toLowerCase()}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
