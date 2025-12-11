// 3D Agent (Person) with Animation Support

import { useRef, useState, useEffect, useMemo } from 'react';
import { Group, Vector3, MathUtils } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { CharacterType, PersonState, type Gender } from '../engine/ca-types';
import gsap from 'gsap';

interface Agent3DProps {
  id: number;
  position: [number, number, number];
  targetPosition?: [number, number, number];
  gender: Gender;
  characterType: CharacterType;
  state: PersonState;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  showLabel?: boolean;
}

// Color schemes for different character types
const GENDER_COLORS = {
  F: {
    [CharacterType.REGULAR]: '#e91e63',
    [CharacterType.PREGNANT]: '#f48fb1',
    [CharacterType.PARENT_WITH_CHILD]: '#f06292',
    [CharacterType.ELDERLY]: '#ad1457',
    [CharacterType.WHEELCHAIR]: '#c2185b',
  },
  M: {
    [CharacterType.REGULAR]: '#3f51b5',
    [CharacterType.PREGNANT]: '#7986cb',
    [CharacterType.PARENT_WITH_CHILD]: '#5c6bc0',
    [CharacterType.ELDERLY]: '#303f9f',
    [CharacterType.WHEELCHAIR]: '#3949ab',
  },
};

const SKIN_COLORS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#6b4423'];

export function Agent3D({
  id,
  position,
  targetPosition,
  gender,
  characterType,
  state,
  onClick,
  onHover,
  showLabel = false,
}: Agent3DProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [currentPos, setCurrentPos] = useState(new Vector3(...position));
  const [targetRot, setTargetRot] = useState(0);
  
  // Consistent skin color based on agent ID
  const skinColor = useMemo(() => SKIN_COLORS[id % SKIN_COLORS.length], [id]);
  const clothingColor = useMemo(() => 
    GENDER_COLORS[gender][characterType] || GENDER_COLORS[gender][CharacterType.REGULAR],
  [gender, characterType]);

  // Animation state
  const animationRef = useRef({
    legPhase: 0,
    armPhase: 0,
    bobPhase: 0,
  });

  // Smooth movement towards target
  useEffect(() => {
    if (targetPosition && groupRef.current) {
      const target = new Vector3(...targetPosition);
      
      // Calculate rotation to face movement direction
      const direction = target.clone().sub(currentPos);
      if (direction.length() > 0.1) {
        const angle = Math.atan2(direction.x, direction.z);
        setTargetRot(angle);
      }

      // Animate position with GSAP
      gsap.to(currentPos, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          if (groupRef.current) {
            groupRef.current.position.copy(currentPos);
          }
        },
      });
    }
  }, [targetPosition]);

  // Animation loop
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Update position
    groupRef.current.position.copy(currentPos);

    // Smooth rotation
    const currentRot = groupRef.current.rotation.y;
    groupRef.current.rotation.y = MathUtils.lerp(currentRot, targetRot, 0.1);

    // Walking animation
    const isWalking = state === PersonState.WALKING_TO_QUEUE ||
                      state === PersonState.WALKING_TO_STALL ||
                      state === PersonState.WALKING_TO_SINK ||
                      state === PersonState.WALKING_TO_CHANGING_TABLE ||
                      state === PersonState.EXITING;

    if (isWalking) {
      animationRef.current.legPhase += delta * 8;
      animationRef.current.armPhase += delta * 8;
    }

    // Idle bob animation
    animationRef.current.bobPhase += delta * 2;
  });

  // Calculate animation offsets
  const legSwing = Math.sin(animationRef.current.legPhase) * 0.3;
  const armSwing = Math.sin(animationRef.current.armPhase) * 0.2;
  const idleBob = Math.sin(animationRef.current.bobPhase) * 0.02;

  const isWalking = state === PersonState.WALKING_TO_QUEUE ||
                    state === PersonState.WALKING_TO_STALL ||
                    state === PersonState.WALKING_TO_SINK ||
                    state === PersonState.WALKING_TO_CHANGING_TABLE ||
                    state === PersonState.EXITING;

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover?.(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* Body group with idle bob */}
      <group position={[0, idleBob, 0]}>
        {/* HEAD */}
        <mesh position={[0, 1.6, 0]} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>

        {/* HAIR */}
        <mesh position={[0, 1.68, 0]} castShadow>
          <sphereGeometry args={[0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={gender === 'F' ? '#4a3728' : '#2d2d2d'} />
        </mesh>

        {/* TORSO */}
        <mesh position={[0, 1.25, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.35, 8, 16]} />
          <meshStandardMaterial color={clothingColor} />
        </mesh>

        {/* ARMS */}
        <group position={[-0.18, 1.35, 0]} rotation={[isWalking ? armSwing : 0, 0, 0.1]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <capsuleGeometry args={[0.04, 0.25, 4, 8]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>
        <group position={[0.18, 1.35, 0]} rotation={[isWalking ? -armSwing : 0, 0, -0.1]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <capsuleGeometry args={[0.04, 0.25, 4, 8]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>

        {/* HIPS/PELVIS */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.15, 8, 16]} />
          <meshStandardMaterial color={gender === 'F' ? '#5c6bc0' : '#37474f'} />
        </mesh>

        {/* LEGS */}
        <group position={[-0.07, 0.75, 0]} rotation={[isWalking ? legSwing : 0, 0, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.4, 4, 8]} />
            <meshStandardMaterial color={gender === 'F' ? '#5c6bc0' : '#37474f'} />
          </mesh>
          {/* Foot */}
          <mesh position={[0, -0.5, 0.03]} castShadow>
            <boxGeometry args={[0.08, 0.05, 0.12]} />
            <meshStandardMaterial color="#2d2d2d" />
          </mesh>
        </group>
        <group position={[0.07, 0.75, 0]} rotation={[isWalking ? -legSwing : 0, 0, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.4, 4, 8]} />
            <meshStandardMaterial color={gender === 'F' ? '#5c6bc0' : '#37474f'} />
          </mesh>
          {/* Foot */}
          <mesh position={[0, -0.5, 0.03]} castShadow>
            <boxGeometry args={[0.08, 0.05, 0.12]} />
            <meshStandardMaterial color="#2d2d2d" />
          </mesh>
        </group>

        {/* CHARACTER TYPE INDICATORS */}
        {characterType === CharacterType.PREGNANT && (
          <mesh position={[0, 1.15, 0.1]} castShadow>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={clothingColor} />
          </mesh>
        )}

        {characterType === CharacterType.PARENT_WITH_CHILD && (
          <group position={[0.25, 0.6, 0]}>
            {/* Child - smaller figure */}
            <mesh position={[0, 0.25, 0]} castShadow>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color={skinColor} />
            </mesh>
            <mesh position={[0, 0.1, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
              <meshStandardMaterial color="#ffb74d" />
            </mesh>
          </group>
        )}

        {characterType === CharacterType.ELDERLY && (
          // Walking cane
          <mesh position={[0.2, 0.5, 0.1]} rotation={[0.1, 0, 0.2]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
        )}

        {characterType === CharacterType.WHEELCHAIR && (
          // Wheelchair
          <group position={[0, 0.3, 0]}>
            {/* Seat */}
            <mesh position={[0, 0.15, 0]} castShadow>
              <boxGeometry args={[0.35, 0.05, 0.35]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            {/* Back */}
            <mesh position={[0, 0.35, -0.15]} castShadow>
              <boxGeometry args={[0.35, 0.35, 0.05]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            {/* Wheels */}
            <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.03, 24]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.03, 24]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          </group>
        )}
      </group>

      {/* Hover highlight */}
      {hovered && (
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1.8, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
        </mesh>
      )}

      {/* Shadow circle on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>

      {/* Info label (when hovered or showLabel is true) */}
      {(hovered || showLabel) && (
        <Billboard position={[0, 2.1, 0]}>
          <Text
            fontSize={0.15}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {`#${id} ${gender === 'F' ? '♀' : '♂'}`}
          </Text>
          <Text
            position={[0, -0.18, 0]}
            fontSize={0.1}
            color="#ffeb3b"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {getStateLabel(state)}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

function getStateLabel(state: PersonState): string {
  switch (state) {
    case PersonState.WALKING_TO_QUEUE: return 'Walking → Queue';
    case PersonState.IN_QUEUE: return 'Waiting in Queue';
    case PersonState.WALKING_TO_STALL: return 'Walking → Stall';
    case PersonState.IN_STALL: return 'Using Stall';
    case PersonState.WALKING_TO_CHANGING_TABLE: return 'Walking → Changing';
    case PersonState.AT_CHANGING_TABLE: return 'Changing Diaper';
    case PersonState.WALKING_TO_SINK: return 'Walking → Sink';
    case PersonState.AT_SINK: return 'Washing Hands';
    case PersonState.EXITING: return 'Exiting';
    case PersonState.DONE: return 'Done';
    default: return state;
  }
}

// Export a simpler version for placeholder use
export function SimpleAgent({ 
  position, 
  color = '#3f51b5' 
}: { 
  position: [number, number, number]; 
  color?: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.6, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
    </group>
  );
}

