"use client"

import { ContactShadows, RoundedBox } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, type MutableRefObject } from "react"
import * as THREE from "three"

type Vector3Tuple = readonly [number, number, number]
type DocumentKind = "classroom" | "canvas" | "portal" | "pdf" | "photo" | "paper" | "assignment"

interface PaperSpec {
  id: string
  kind: DocumentKind
  tabColor: string
  organizedPosition: Vector3Tuple
  organizedRotation: Vector3Tuple
  scale: number
  delay: number
}

interface AssignmentWorldProps {
  active: boolean
  progressRef: MutableRefObject<number>
}

const SUPPORTING_PAPERS: readonly PaperSpec[] = [
  {
    id: "classroom",
    kind: "classroom",
    tabColor: "#88dce7",
    organizedPosition: [-0.86, 1.62, -0.42],
    organizedRotation: [0.04, 0.1, -0.12],
    scale: 0.62,
    delay: 0.16,
  },
  {
    id: "canvas",
    kind: "canvas",
    tabColor: "#c6a3ef",
    organizedPosition: [-0.54, -1.5, -0.62],
    organizedRotation: [-0.03, 0.12, 0.1],
    scale: 0.58,
    delay: 0.21,
  },
  {
    id: "portal",
    kind: "portal",
    tabColor: "#9ba8b5",
    organizedPosition: [0.7, 2.28, -0.25],
    organizedRotation: [0.02, 0.04, -0.05],
    scale: 0.56,
    delay: 0.26,
  },
  {
    id: "pdf",
    kind: "pdf",
    tabColor: "#d7dadd",
    organizedPosition: [2.4, 2.3, -0.28],
    organizedRotation: [0.02, -0.04, 0.05],
    scale: 0.56,
    delay: 0.31,
  },
  {
    id: "photo",
    kind: "photo",
    tabColor: "#8dd4c0",
    organizedPosition: [4.02, 1.4, -0.5],
    organizedRotation: [0.04, -0.1, 0.11],
    scale: 0.62,
    delay: 0.36,
  },
  {
    id: "paper",
    kind: "paper",
    tabColor: "#cbd0ca",
    organizedPosition: [3.62, -1.5, -0.66],
    organizedRotation: [-0.03, -0.11, -0.1],
    scale: 0.58,
    delay: 0.41,
  },
] as const

const MASTER_PAPER: PaperSpec = {
  id: "assignment",
  kind: "assignment",
  tabColor: "#e8ff38",
  organizedPosition: [1.46, -0.08, 0.72],
  organizedRotation: [0.015, 0, 0],
  scale: 0.98,
  delay: 0.06,
}

function smoothRange(value: number, start: number, end: number) {
  return THREE.MathUtils.smoothstep(value, start, end)
}

function seededNoise(seed: number) {
  const next = Math.sin(seed * 12.9898) * 43758.5453
  return next - Math.floor(next)
}

function createPaperTexture(kind: DocumentKind) {
  const width = 768
  const height = 1024
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  canvas.width = width
  canvas.height = height

  if (!context) return new THREE.CanvasTexture(canvas)

  const base = kind === "photo" ? "#f2f1e9" : kind === "assignment" ? "#fffdf6" : "#f7f7f0"
  context.fillStyle = base
  context.fillRect(0, 0, width, height)

  for (let index = 0; index < 420; index += 1) {
    const x = seededNoise(index + kind.length * 11) * width
    const y = seededNoise(index * 1.7 + kind.length * 19) * height
    const alpha = 0.008 + seededNoise(index * 2.3) * 0.01
    context.fillStyle = `rgba(45, 52, 58, ${alpha})`
    context.fillRect(x, y, 1, 0.65)
  }

  const line = "rgba(79, 91, 99, 0.16)"
  const ink = "rgba(30, 40, 54, 0.66)"
  const quietInk = "rgba(67, 79, 87, 0.28)"
  const violet = "rgba(145, 99, 214, 0.72)"
  const cyan = "rgba(80, 184, 198, 0.66)"
  const yellow = "rgba(232, 255, 56, 0.9)"

  context.fillStyle = kind === "assignment" ? yellow : kind === "canvas" ? violet : cyan
  context.fillRect(72, 68, kind === "assignment" ? 238 : 166, 18)

  context.fillStyle = ink
  context.fillRect(72, 126, 390, 22)
  context.fillStyle = quietInk
  context.fillRect(72, 170, 528, 10)
  context.fillRect(72, 194, 444, 10)

  if (kind === "photo") {
    context.fillStyle = "#c8d7d4"
    context.fillRect(72, 252, 624, 382)
    context.fillStyle = "rgba(255, 255, 255, 0.74)"
    context.beginPath()
    context.arc(564, 344, 42, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = "#8ca8a4"
    context.beginPath()
    context.moveTo(72, 634)
    context.lineTo(288, 414)
    context.lineTo(420, 548)
    context.lineTo(518, 456)
    context.lineTo(696, 634)
    context.closePath()
    context.fill()
  } else if (kind === "portal") {
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        context.strokeStyle = line
        context.lineWidth = 4
        context.strokeRect(72 + column * 318, 252 + row * 158, 282, 124)
        context.fillStyle = row === 0 && column === 0 ? cyan : quietInk
        context.fillRect(92 + column * 318, 276 + row * 158, 112, 9)
      }
    }
  } else if (kind === "pdf") {
    context.strokeStyle = line
    context.lineWidth = 4
    context.strokeRect(72, 250, 624, 484)
    context.fillStyle = "rgba(88, 102, 112, 0.12)"
    context.fillRect(100, 284, 196, 184)
    for (let row = 0; row < 7; row += 1) {
      context.fillStyle = row === 2 ? yellow : quietInk
      context.fillRect(330, 294 + row * 44, 314 - row * 16, row === 2 ? 14 : 8)
    }
  } else if (kind === "classroom" || kind === "canvas") {
    for (let row = 0; row < 4; row += 1) {
      context.fillStyle = "rgba(88, 102, 112, 0.08)"
      context.fillRect(72, 250 + row * 134, 624, 102)
      context.fillStyle = row === 0 ? (kind === "canvas" ? violet : cyan) : quietInk
      context.fillRect(96, 278 + row * 134, 16, 16)
      context.fillRect(136, 282 + row * 134, 328 - row * 24, 9)
    }
  } else {
    context.strokeStyle = "rgba(90, 130, 150, 0.18)"
    context.lineWidth = 2
    for (let row = 0; row < 13; row += 1) {
      const y = 264 + row * 50
      context.beginPath()
      context.moveTo(72, y)
      context.lineTo(696, y)
      context.stroke()
    }
    if (kind === "assignment") {
      context.fillStyle = yellow
      context.fillRect(72, 414, 452, 20)
      context.fillStyle = ink
      context.fillRect(72, 472, 510, 12)
      context.fillStyle = quietInk
      context.fillRect(72, 520, 566, 9)
      context.fillRect(72, 570, 496, 9)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function createPaperGeometry(width: number, height: number, seed: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 28, 36)
  const positions = geometry.attributes.position

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const normalizedX = x / (width / 2)
    const normalizedY = y / (height / 2)
    const edgeCurl = Math.pow(Math.abs(normalizedX), 3.2) * 0.03
    const topLift = Math.pow(Math.max(0, normalizedY), 3) * 0.018
    const fiberWave = Math.sin((normalizedX + seed) * 3.4) * Math.cos((normalizedY - seed) * 2.7) * 0.0025
    positions.setZ(index, edgeCurl + topLift + fiberWave)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function PaperLayer({
  spec,
  index,
  progressRef,
  master = false,
}: {
  spec: PaperSpec
  index: number
  progressRef: MutableRefObject<number>
  master?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const highlighterRef = useRef<THREE.MeshBasicMaterial>(null)
  const texture = useMemo(() => createPaperTexture(spec.kind), [spec.kind])
  const geometry = useMemo(
    () => createPaperGeometry(master ? 2.82 : 2.48, master ? 3.76 : 3.34, index + 1),
    [index, master],
  )

  useEffect(() => {
    return () => {
      texture.dispose()
      geometry.dispose()
    }
  }, [geometry, texture])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const worldProgress = progressRef.current
    const riseStart = master ? 0.04 : 0.12 + index * 0.025
    const riseEnd = master ? 0.42 : 0.42 + index * 0.025
    const spreadStart = master ? 0.18 : 0.36 + index * 0.025
    const spreadEnd = master ? 0.66 : 0.82 + index * 0.018
    const rise = smoothRange(worldProgress, riseStart, riseEnd)
    const spread = smoothRange(worldProgress, spreadStart, spreadEnd)
    const stackX = 1.56
    const stackY = -2.34 + index * 0.012
    const stackZ = 0.14 - index * 0.018
    const stagingX = 1.5 + (master ? 0 : (index - 2.5) * 0.018)
    const stagingY = master ? -0.08 : -0.18 + index * 0.03
    const stagingZ = master ? 0.52 : -0.02 - index * 0.025
    const spreadLift = Math.sin(spread * Math.PI) * (master ? 0.24 : 0.54)

    const risingX = THREE.MathUtils.lerp(stackX, stagingX, rise)
    const risingY = THREE.MathUtils.lerp(stackY, stagingY, rise)
    const risingZ = THREE.MathUtils.lerp(stackZ, stagingZ, rise)

    group.position.set(
      THREE.MathUtils.lerp(risingX, spec.organizedPosition[0], spread),
      THREE.MathUtils.lerp(risingY, spec.organizedPosition[1], spread) + spreadLift,
      THREE.MathUtils.lerp(risingZ, spec.organizedPosition[2], spread),
    )

    const risingRotationX = THREE.MathUtils.lerp(-Math.PI / 2, master ? 0.02 : 0.045, rise)
    group.rotation.set(
      THREE.MathUtils.lerp(risingRotationX, spec.organizedRotation[0], spread),
      THREE.MathUtils.lerp(0, spec.organizedRotation[1], spread),
      THREE.MathUtils.lerp(index % 2 === 0 ? -0.012 : 0.012, spec.organizedRotation[2], spread),
    )

    const raisedScale = master ? 0.98 : 0.78
    const scale = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(master ? 0.98 : 0.9, raisedScale, rise),
      spec.scale,
      spread,
    )
    group.scale.setScalar(scale)

    if (highlighterRef.current) {
      highlighterRef.current.opacity = smoothRange(progressRef.current, 0.8, 0.96)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={texture}
          color="#ffffff"
          roughness={0.88}
          metalness={0}
          clearcoat={0.035}
          clearcoatRoughness={0.8}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-index * 0.08}
        />
      </mesh>

      <RoundedBox
        args={[master ? 0.74 : 0.58, master ? 0.19 : 0.16, 0.045]}
        radius={0.045}
        smoothness={4}
        position={[master ? -0.77 : -0.66, master ? 1.66 : 1.47, 0.04]}
      >
        <meshPhysicalMaterial color={spec.tabColor} roughness={0.68} clearcoat={0.08} />
      </RoundedBox>

      {master ? (
        <mesh position={[0.1, 0.32, 0.052]}>
          <planeGeometry args={[1.76, 0.13]} />
          <meshBasicMaterial ref={highlighterRef} color="#e8ff38" transparent opacity={0} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  )
}

function WorldCamera({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const lookAt = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }) => {
    const progress = smoothRange(progressRef.current, 0, 0.72)
    const finalSettle = smoothRange(progressRef.current, 0.66, 1)
    camera.position.set(
      THREE.MathUtils.lerp(-0.32, 0, progress) + finalSettle * 0.78,
      THREE.MathUtils.lerp(3.7, 0.35, progress),
      THREE.MathUtils.lerp(9.6, 10.7, progress),
    )
    lookAt.set(finalSettle * 0.78, THREE.MathUtils.lerp(-1.62, 0, progress), 0)
    camera.lookAt(lookAt)
  })

  return null
}

function AssignmentScene({ progressRef, active }: { progressRef: MutableRefObject<number>; active: boolean }) {
  const worldRef = useRef<THREE.Group>(null)

  useFrame(({ pointer }, delta) => {
    const world = worldRef.current
    if (!world) return
    world.rotation.y = THREE.MathUtils.damp(world.rotation.y, pointer.x * 0.026, 4.5, delta)
    world.rotation.x = THREE.MathUtils.damp(world.rotation.x, -pointer.y * 0.012, 4.5, delta)
  })

  return (
    <>
      <color attach="background" args={["#05070e"]} />
      <hemisphereLight args={["#d9f6ff", "#101322", 1.35]} />
      <ambientLight intensity={0.44} />
      <directionalLight
        castShadow
        position={[3.8, 7.4, 6.4]}
        intensity={3.8}
        color="#fffdf4"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[-4.8, 0.8, 4.2]} intensity={14} distance={13} color="#8553c8" />
      <pointLight position={[5.4, -0.6, 3.6]} intensity={11} distance={12} color="#69c8d8" />
      <WorldCamera progressRef={progressRef} />

      <group ref={worldRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.55, 0]} receiveShadow>
          <planeGeometry args={[26, 15]} />
          <meshPhysicalMaterial color="#0b111a" roughness={0.62} metalness={0.12} clearcoat={0.08} />
        </mesh>

        {SUPPORTING_PAPERS.map((paper, index) => (
          <PaperLayer key={paper.id} spec={paper} index={index} progressRef={progressRef} />
        ))}
        <PaperLayer spec={MASTER_PAPER} index={SUPPORTING_PAPERS.length} progressRef={progressRef} master />

        <ContactShadows
          position={[0, -2.5, 0]}
          opacity={0.46}
          scale={17}
          blur={2.7}
          far={7}
          resolution={512}
          color="#000000"
          frames={active ? Infinity : 1}
        />
      </group>
    </>
  )
}

export function AssignmentWorld({ active, progressRef }: AssignmentWorldProps) {
  return (
    <Canvas
      aria-hidden="true"
      camera={{ fov: 43, position: [0, 3.7, 9.6], near: 0.1, far: 40 }}
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "demand"}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      performance={{ min: 0.7 }}
      shadows
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <AssignmentScene progressRef={progressRef} active={active} />
    </Canvas>
  )
}
