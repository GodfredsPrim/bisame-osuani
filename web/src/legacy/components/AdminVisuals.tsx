import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const AdminVisuals: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    camera.position.z = 5;

    // --- Group for Tilt Effect ---
    const group = new THREE.Group();
    scene.add(group);

    // --- Wireframe Globe ---
    const geometry = new THREE.IcosahedronGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    const globe = new THREE.Mesh(geometry, material);
    group.add(globe);

    // --- Outer Highlights ---
    const highlightGeo = new THREE.IcosahedronGeometry(2.1, 1);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      wireframe: true,
      transparent: true,
      opacity: 0.05
    });
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    group.add(highlight);

    // --- Particle Field ---
    const particlesCount = 1000;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 15;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.3
    });
    const points = new THREE.Points(particlesGeo, particlesMat);
    scene.add(points);

    // --- Mouse Interaction ---
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) - 0.5;
      mouseY = (event.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    const animate = () => {
      requestAnimationFrame(animate);

      globe.rotation.y += 0.002;
      highlight.rotation.y -= 0.001;
      
      // Gentle tilt based on mouse
      group.rotation.x += (mouseY * 0.5 - group.rotation.x) * 0.05;
      group.rotation.y += (mouseX * 0.5 - group.rotation.y) * 0.05;

      points.rotation.y += 0.0005;

      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup ---
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      highlightGeo.dispose();
      highlightMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: -1, 
        background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        pointerEvents: 'none'
      }} 
    />
  );
};
