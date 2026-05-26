import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, QuadraticBezierLine } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

const NUM_EXPERTS = 8;
const RADIUS = 15;

function ExpertsNodes() {
  const moeActiveNodes = useStore(state => state.moeActiveNodes);
  const rosaisAlertActive = useStore(state => state.rosaisAlertActive);
  
  const nodes = useMemo(() => {
    return Array.from({ length: NUM_EXPERTS }, (_, i) => {
      const angle = (i / NUM_EXPERTS) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * RADIUS, Math.sin(angle) * RADIUS, 0);
    });
  }, []);

  const routerPos = new THREE.Vector3(0, 0, 5);

  return (
    <group>
      {/* Router Node */}
      <mesh position={routerPos}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" toneMapped={false} />
      </mesh>
      
      {/* Expert Nodes and Connections */}
      {nodes.map((pos, i) => {
        // Maps 32 mocked nodes to 8 visual nodes
        const isActive = moeActiveNodes.some(n => (n % NUM_EXPERTS) === i);
        const isAlert = isActive && rosaisAlertActive && (i === (moeActiveNodes[0] % NUM_EXPERTS));
        
        const color = isAlert ? '#ef4444' : (isActive ? '#06b6d4' : '#27272a');
        const curveColor = isAlert ? '#ef4444' : '#06b6d4';
        
        return (
          <group key={i}>
            <mesh position={pos}>
               <sphereGeometry args={[1, 32, 32]} />
               <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            
            <QuadraticBezierLine
              start={routerPos}
              end={pos}
              mid={new THREE.Vector3(pos.x * 0.5, pos.y * 0.5, (routerPos.z + pos.z) * 0.5 + 5)}
              color={isActive ? curveColor : '#27272a'}
              lineWidth={isActive ? (isAlert ? 3 : 2) : 1}
              transparent
              opacity={isActive ? 0.8 : 0.2}
              dashed={false}
            />
          </group>
        );
      })}
    </group>
  );
}

export function MoEGraph() {
  return (
    <div className="w-full h-full bg-zinc-950 rounded-xl overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
      <Canvas camera={{ position: [0, 0, 25], fov: 50 }}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={1} />
        <ExpertsNodes />
        <OrbitControls enablePan={true} maxDistance={40} minDistance={10} />
        <EffectComposer>
          <Bloom luminanceThreshold={0.1} mipmapBlur intensity={2.0} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
