import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

function InstancedMemoryVectors() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const memoryVectors = useStore(state => state.memoryVectors);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Create a color map for distinct cluster_ids
  const clusterColors = useMemo(() => {
    return new Map<string, THREE.Color>();
  }, []);

  const getClusterColor = (clusterId: string, decayStatus: boolean) => {
    if (decayStatus) {
      return new THREE.Color('#3f3f46'); // zinc-700
    }
    
    if (!clusterColors.has(clusterId)) {
      const color = new THREE.Color();
      // Generate a distinct color based on clusterId string hash or random for simulation
      const hash = Array.from(clusterId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      color.setHSL((hash % 360) / 360, 0.8, 0.6);
      clusterColors.set(clusterId, color);
    }
    return clusterColors.get(clusterId)!;
  };

  useEffect(() => {
    if (meshRef.current && memoryVectors.length > 0) {
      // Update instances based on actual memoryVectors
      let count = memoryVectors.length;
      if (count > 10000) count = 10000; // Cap to avoid massive reallocations if unlimited
      
      meshRef.current.count = count;

      for (let i = 0; i < count; i++) {
        const vec = memoryVectors[i];
        if (!vec) continue;
        
        dummy.position.set(vec.x ?? 0, vec.y ?? 0, vec.z ?? 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        
        const color = getClusterColor(vec.cluster_id || 'default', vec.decay_status || false);
        meshRef.current.setColorAt(i, color);
      }
      
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [memoryVectors, dummy]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 10000]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export function HippocampalScatterPlot() {
  return (
    <div className="w-full h-full bg-zinc-950 rounded-xl overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]">
      <Canvas camera={{ position: [0, 0, 40], fov: 60 }}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.5} />
        <InstancedMemoryVectors />
        <OrbitControls enablePan={true} maxDistance={60} minDistance={10} />
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
