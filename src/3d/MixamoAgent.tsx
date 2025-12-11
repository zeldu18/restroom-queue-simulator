// 3D Agent - Stylized Human Figures (No GLB - too large/broken)
// Simple geometric shapes that represent people clearly

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Gender, CharacterType, PersonState } from '../engine/ca-types';

interface MixamoAgentProps {
  id: number;
  position: [number, number, number];
  gender: Gender;
  characterType: CharacterType;
  state: PersonState;
}

export function MixamoAgent({ id, position, gender, characterType, state }: MixamoAgentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const targetPosition = useRef<[number, number, number]>(position);
  const currentRotation = useRef(0);
  const bobPhase = useRef(Math.random() * Math.PI * 2);
  
  // Animation state
  const isWalking = state === 'WALKING_TO_QUEUE' || 
                    state === 'WALKING_TO_STALL' || 
                    state === 'WALKING_TO_SINK' ||
                    state === 'WALKING_TO_CHANGING_TABLE' ||
                    state === 'EXITING';

  // Colors based on gender
  const bodyColor = gender === 'F' ? '#e91e63' : '#2196f3';
  const headColor = gender === 'F' ? '#f8bbd9' : '#90caf9';
  const shirtColor = gender === 'F' ? '#f06292' : '#64b5f6';

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
      {/* STYLIZED PERSON */}
      
      {/* Body/Torso */}
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.15, 0.5, 4, 16]} />
        <meshStandardMaterial color={shirtColor} roughness={0.8} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={headColor} roughness={0.7} />
      </mesh>
      
      {/* Hair (optional visual distinction) */}
      {gender === 'F' && (
        <mesh position={[0, 1.22, 0]}>
          <sphereGeometry args={[0.13, 16, 8]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} />
        </mesh>
      )}
      
      {/* Legs */}
      <mesh position={[-0.06, 0.2, 0]}>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.06, 0.2, 0]}>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.22, 0.7, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.04, 0.25, 4, 8]} />
        <meshStandardMaterial color={headColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.22, 0.7, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.04, 0.25, 4, 8]} />
        <meshStandardMaterial color={headColor} roughness={0.7} />
      </mesh>
      
      {/* Character type indicators */}
      {characterType === 'pregnant' && (
        <mesh position={[0, 0.55, 0.12]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
        </mesh>
      )}
      
      {characterType === 'wheelchair' && (
        <group position={[0, 0.25, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.02, 8, 16]} />
            <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}
      
      {characterType === 'parent_with_child' && (
        <group position={[0.25, 0.4, 0]}>
          {/* Small child figure */}
          <mesh position={[0, 0.15, 0]}>
            <capsuleGeometry args={[0.06, 0.2, 4, 8]} />
            <meshStandardMaterial color="#ffeb3b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#ffe0b2" roughness={0.7} />
          </mesh>
        </group>
      )}
      
      {characterType === 'elderly' && (
        <mesh position={[0.15, 0.5, 0.1]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
          <meshStandardMaterial color="#8d6e63" roughness={0.6} />
        </mesh>
      )}
      
      {/* Character type emoji (floating) */}
      {characterType !== 'regular' && (
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.2} color="white" outlineWidth={0.03} outlineColor="black">
            {characterType === 'pregnant' ? '🤰' : 
             characterType === 'elderly' ? '🧓' : 
             characterType === 'wheelchair' ? '♿' : 
             characterType === 'parent_with_child' ? '👶' : ''}
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


import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Gender, CharacterType, PersonState } from '../engine/ca-types';

interface MixamoAgentProps {
  id: number;
  position: [number, number, number];
  gender: Gender;
  characterType: CharacterType;
  state: PersonState;
}

export function MixamoAgent({ id, position, gender, characterType, state }: MixamoAgentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const targetPosition = useRef<[number, number, number]>(position);
  const currentRotation = useRef(0);
  const bobPhase = useRef(Math.random() * Math.PI * 2);
  
  // Animation state
  const isWalking = state === 'WALKING_TO_QUEUE' || 
                    state === 'WALKING_TO_STALL' || 
                    state === 'WALKING_TO_SINK' ||
                    state === 'WALKING_TO_CHANGING_TABLE' ||
                    state === 'EXITING';

  // Colors based on gender
  const bodyColor = gender === 'F' ? '#e91e63' : '#2196f3';
  const headColor = gender === 'F' ? '#f8bbd9' : '#90caf9';
  const shirtColor = gender === 'F' ? '#f06292' : '#64b5f6';

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
      {/* STYLIZED PERSON */}
      
      {/* Body/Torso */}
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.15, 0.5, 4, 16]} />
        <meshStandardMaterial color={shirtColor} roughness={0.8} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={headColor} roughness={0.7} />
      </mesh>
      
      {/* Hair (optional visual distinction) */}
      {gender === 'F' && (
        <mesh position={[0, 1.22, 0]}>
          <sphereGeometry args={[0.13, 16, 8]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} />
        </mesh>
      )}
      
      {/* Legs */}
      <mesh position={[-0.06, 0.2, 0]}>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.06, 0.2, 0]}>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.22, 0.7, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.04, 0.25, 4, 8]} />
        <meshStandardMaterial color={headColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.22, 0.7, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.04, 0.25, 4, 8]} />
        <meshStandardMaterial color={headColor} roughness={0.7} />
      </mesh>
      
      {/* Character type indicators */}
      {characterType === 'pregnant' && (
        <mesh position={[0, 0.55, 0.12]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
        </mesh>
      )}
      
      {characterType === 'wheelchair' && (
        <group position={[0, 0.25, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.02, 8, 16]} />
            <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}
      
      {characterType === 'parent_with_child' && (
        <group position={[0.25, 0.4, 0]}>
          {/* Small child figure */}
          <mesh position={[0, 0.15, 0]}>
            <capsuleGeometry args={[0.06, 0.2, 4, 8]} />
            <meshStandardMaterial color="#ffeb3b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#ffe0b2" roughness={0.7} />
          </mesh>
        </group>
      )}
      
      {characterType === 'elderly' && (
        <mesh position={[0.15, 0.5, 0.1]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
          <meshStandardMaterial color="#8d6e63" roughness={0.6} />
        </mesh>
      )}
      
      {/* Character type emoji (floating) */}
      {characterType !== 'regular' && (
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.2} color="white" outlineWidth={0.03} outlineColor="black">
            {characterType === 'pregnant' ? '🤰' : 
             characterType === 'elderly' ? '🧓' : 
             characterType === 'wheelchair' ? '♿' : 
             characterType === 'parent_with_child' ? '👶' : ''}
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Gender, CharacterType, PersonState } from '../engine/ca-types';

interface MixamoAgentProps {
  id: number;
  position: [number, number, number];
  gender: Gender;
  characterType: CharacterType;
  state: PersonState;
}

const TARGET_HEIGHT = 1.6; // meters

const MODEL_BY_GENDER: Record<Gender, string> = {
  F: '/models/character-a.glb',
  M: '/models/character-b.glb',
};

export function MixamoAgent({ id, position, gender, characterType, state }: MixamoAgentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const targetPosition = useRef<[number, number, number]>(position);
  const currentRotation = useRef(0);

  // Load model
  const modelPath = MODEL_BY_GENDER[gender] ?? MODEL_BY_GENDER.F;
  const { scene } = useGLTF(modelPath);

  // Clone and scale model to target height
  const { scaledScene, yOffset } = useMemo(() => {
    const cloned = scene.clone(true);

    // Enable shadows
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const scale = TARGET_HEIGHT / (size.y || 1);

    cloned.scale.setScalar(scale);

    // Recompute for offset
    const scaledBox = new THREE.Box3().setFromObject(cloned);
    const minY = scaledBox.min.y;
    const offset = -minY;

    return { scaledScene: cloned, yOffset: offset };
  }, [scene]);

  // Smoothly update target position
  useEffect(() => {
    targetPosition.current = position;
  }, [position]);

  // Movement and facing
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const current = groupRef.current.position;
    const target = targetPosition.current;

    // Smooth position interpolation
    const lerpFactor = 1.0 - Math.exp(-6 * delta);
    current.x += (target[0] - current.x) * lerpFactor;
    current.z += (target[2] - current.z) * lerpFactor;

    // Face movement direction
    const dx = target[0] - current.x;
    const dz = target[2] - current.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) {
      const targetRot = Math.atan2(dx, dz);
      const rotLerp = 1.0 - Math.exp(-8 * delta);
      currentRotation.current += (targetRot - currentRotation.current) * rotLerp;
      groupRef.current.rotation.y = currentRotation.current;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[position[0], yOffset, position[2]]}
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
      {/* Character model */}
      <primitive object={scaledScene} />

      {/* Character type indicator (floating icon) */}
      {characterType !== 'regular' && (
        <Billboard position={[0, TARGET_HEIGHT + 0.3, 0]}>
          <Text
            fontSize={0.35}
            color="white"
            outlineWidth={0.06}
            outlineColor="black"
          >
            {characterType === 'pregnant' ? '🤰' : 
             characterType === 'elderly' ? '🧓' : 
             characterType === 'wheelchair' ? '♿' : 
             characterType === 'parent_with_child' ? '👶' : ''}
          </Text>
        </Billboard>
      )}
      
      {/* Hover tooltip */}
      {isHovered && (
        <Billboard position={[0, TARGET_HEIGHT + 0.6, 0]}>
          <Text
            fontSize={0.28}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="black"
          >
            {`Agent ${id}`}
          </Text>
          <Text
            position={[0, -0.4, 0]}
            fontSize={0.22}
            color="#ffeb3b"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.04}
            outlineColor="black"
          >
            {state.replace(/_/g, ' ')}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

useGLTF.preload('/models/character-a.glb');
useGLTF.preload('/models/character-b.glb');
