import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

// We will have an InstancedMesh where we update colors and opacities.
const COUNT = 10000;

function InstancedPoints() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Create dummy data
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const color = new THREE.Color();
    
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      color.setHSL(0.7 + Math.random() * 0.1, 0.8, 0.5); // Purples
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, colors };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < COUNT; i++) {
        dummy.position.set(positions[i*3], positions[i*3+1], positions[i*3+2]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, new THREE.Color(colors[i*3], colors[i*3+1], colors[i*3+2]));
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [positions, colors, dummy]);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate the whole constellation slowly
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.02;
      
      // Simulate decay randomly
      if (meshRef.current.instanceColor && Math.random() > 0.9) {
          const idx = Math.floor(Math.random() * COUNT);
          const color = new THREE.Color();
          // Darken
          meshRef.current.getColorAt(idx, color);
          color.lerp(new THREE.Color(0, 0, 0), 0.1);
          meshRef.current.setColorAt(idx, color);
          meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export function HippocampalConstellation() {
  return (
    <div className="w-full h-full bg-zinc-950 rounded-xl overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]">
      <Canvas camera={{ position: [0, 0, 40], fov: 60 }}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.5} />
        <InstancedPoints />
        <OrbitControls enablePan={true} maxDistance={60} minDistance={10} />
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
