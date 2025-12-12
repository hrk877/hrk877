"use client"

import { useLoader } from "@react-three/fiber"
import { Float, Center, useTexture } from "@react-three/drei"
import { OBJLoader } from "three-stdlib"
import { useMemo } from "react"
import * as THREE from "three"

export function BananaModel(props: any) {
    // 1. Load Object (ignore MTL for now to force our own material)
    const obj = useLoader(OBJLoader, "/banana.obj")

    // 2. Load Texture Manually
    const texture = useTexture("/banana.jpg")
    texture.colorSpace = THREE.SRGBColorSpace
    // OBJ texture coordinates (UVs) often flip Y vs standard images
    // If it looks upside down, toggle this.
    texture.flipY = true

    // 3. Force apply texture and better material
    useMemo(() => {
        if (obj) {
            obj.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh
                    // Completely replace the material
                    mesh.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        color: new THREE.Color("#ffffff"), // Pure white base
                        roughness: 0.6,
                        metalness: 0.0,
                        side: THREE.DoubleSide // Ensure we see backfaces if any
                    })
                    mesh.castShadow = true
                    mesh.receiveShadow = true
                }
            })
        }
    }, [obj, texture])

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Center>
                <primitive
                    object={obj}
                    {...props}
                    scale={25}
                    rotation={[0, Math.PI, 0]}
                />
            </Center>
        </Float>
    )
}
