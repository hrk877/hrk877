"use client"

import { useLoader } from "@react-three/fiber"
import { useTexture } from "@react-three/drei"
import { OBJLoader } from "three-stdlib"
import { useMemo, forwardRef } from "react"
import * as THREE from "three"

// Forward ref to allow passing mesh ref from physics body if needed
export const Banana = forwardRef<THREE.Group, any>((props, ref) => {
    const obj = useLoader(OBJLoader, "/banana.obj")
    const texture = useTexture("/banana.jpg")

    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = true

    useMemo(() => {
        if (obj) {
            obj.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh
                    mesh.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        color: new THREE.Color("#ffffff"),
                        roughness: 0.6,
                        metalness: 0.0,
                        side: THREE.DoubleSide
                    })
                    mesh.castShadow = true
                    mesh.receiveShadow = true
                    // Fix for mobile/scaling issues: Disable culling to ensure visibility
                    mesh.frustumCulled = false
                    // Ensure geometry is ready
                    if (mesh.geometry) {
                        mesh.geometry.computeVertexNormals()
                    }
                }
            })
        }
    }, [obj, texture])

    // Clone the object to allow multiple instances
    const clone = useMemo(() => obj.clone(), [obj])

    return (
        <primitive
            ref={ref}
            object={clone}
            {...props}
        // Scale matches the original logic, adjusted for physics if needed
        // Original had scale={25}, let's keep it but we might need to adjust physics body size
        />
    )
})

Banana.displayName = "Banana"
