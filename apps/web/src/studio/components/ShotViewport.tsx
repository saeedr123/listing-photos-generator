"use client";

// Live 3D preview of one shot, with a free orbit camera.
// The scene comes from the same builder the export render uses, and the
// background and text come from the same painters, so the preview and
// the export do not drift apart.

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  BackgroundSpec,
  BatchItemText,
  LightingPreset,
  ModelRegistryEntry,
  ShotCamera,
  ShotDefinition,
  StyleKit,
  TextureAsset,
} from "@listing-photos-generator/mockup-engine/studio";
import { loadEnvironment } from "../engine/environment";
import { studioAssetUrl, type DesignPageImage } from "../engine/loaders";
import { paintBackground, paintTextOverlay } from "../engine/painters";
import { configureRenderer } from "../engine/render-shot";
import { buildShotContent } from "../engine/scene-builder";

export interface ShotViewportProps {
  shot: ShotDefinition;
  background: BackgroundSpec;
  text: BatchItemText | null;
  kit: StyleKit | null;
  models: ModelRegistryEntry[];
  lighting: LightingPreset;
  textures: TextureAsset[];
  pages: DesignPageImage[];
  camera: ShotCamera;
  colourOverrides?: Record<number, string | null>;
  onCameraChange?: (camera: ShotCamera) => void;
  onWarnings?: (warnings: string[]) => void;
}

function SceneContent(props: ShotViewportProps) {
  const { gl, scene, camera, invalidate } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const onCameraChangeRef = useRef(props.onCameraChange);
  onCameraChangeRef.current = props.onCameraChange;
  const onWarningsRef = useRef(props.onWarnings);
  onWarningsRef.current = props.onWarnings;

  // Orbit controls: free orbit, zoom and pan around the shot target.
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = false;
    controls.minDistance = 0.08;
    controls.maxDistance = 6;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    const onChange = () => invalidate();
    const onEnd = () => {
      const perspective = camera as THREE.PerspectiveCamera;
      onCameraChangeRef.current?.({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        fovDeg: perspective.fov,
      });
    };
    controls.addEventListener("change", onChange);
    controls.addEventListener("end", onEnd);
    controlsRef.current = controls;
    return () => {
      controls.removeEventListener("change", onChange);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl, invalidate]);

  // Apply the camera whenever the shot camera or a preset changes.
  const cameraKey = JSON.stringify(props.camera);
  useEffect(() => {
    const spec = JSON.parse(cameraKey) as ShotCamera;
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.position.set(spec.position[0], spec.position[1], spec.position[2]);
    perspective.fov = spec.fovDeg;
    perspective.near = 0.01;
    perspective.far = 50;
    perspective.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(spec.target[0], spec.target[1], spec.target[2]);
      controlsRef.current.update();
    } else {
      perspective.lookAt(spec.target[0], spec.target[1], spec.target[2]);
    }
    invalidate();
  }, [camera, cameraKey, invalidate]);

  // Build the shot content. Rebuilt when the shot, the design, the
  // colours or the background change.
  const { shot, background, models, textures, pages, lighting, colourOverrides } = props;
  const buildKey = JSON.stringify([shot, background, colourOverrides ?? null, lighting, models.map((m) => [m.id, m.version, m.surfaces, m.colourOptions, m.modelFile]), pages.map((p) => p.id)]);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | null = null;
    configureRenderer(gl, lighting);
    (async () => {
      const [built, environment] = await Promise.all([
        buildShotContent({
          shot,
          background,
          models,
          textures,
          pages,
          colourOverrides,
          limits: { maxTextureSizePx: gl.capabilities.maxTextureSize, maxAnisotropy: gl.capabilities.getMaxAnisotropy() },
          shadowResolution: 512,
        }),
        loadEnvironment(gl, lighting, studioAssetUrl),
      ]);
      if (cancelled) {
        built.dispose();
        return;
      }
      scene.environment = environment;
      scene.environmentIntensity = lighting.environmentIntensity;
      scene.add(built.content);
      built.prepare(gl, scene);
      dispose = () => built.dispose();
      onWarningsRef.current?.([...built.warnings, ...built.surfaces.flatMap((s) => s.warnings)]);
      invalidate();
    })().catch((error: unknown) => {
      onWarningsRef.current?.([error instanceof Error ? error.message : "The preview could not be built."]);
    });
    return () => {
      cancelled = true;
      if (dispose) dispose();
      invalidate();
    };
    // buildKey stands in for the objects it is built from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildKey, gl, scene, invalidate]);

  return null;
}

function usePaintedCanvas(paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void, key: string) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const paintRef = useRef(paint);
  paintRef.current = paint;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      paintRef.current(ctx, canvas.width, canvas.height);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [key]);
  return ref;
}

export function ShotViewport(props: ShotViewportProps) {
  const { shot, background, text, kit } = props;
  const backgroundRef = usePaintedCanvas((ctx, width, height) => paintBackground(ctx, width, height, background), JSON.stringify(background));
  const overlayRef = usePaintedCanvas(
    (ctx, width, height) => {
      if (text && kit) paintTextOverlay(ctx, width, height, text, shot.textLayout, kit);
    },
    JSON.stringify([text, kit, shot.textLayout]),
  );
  return (
    <div className="relative w-full overflow-hidden rounded border border-slate-300" style={{ aspectRatio: `${shot.aspect.w} / ${shot.aspect.h}` }} data-testid="shot-viewport">
      <canvas ref={backgroundRef} className="absolute inset-0 h-full w-full" />
      <Canvas
        className="absolute inset-0"
        style={{ position: "absolute", inset: 0 }}
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}
        camera={{ fov: props.camera.fovDeg, near: 0.01, far: 50, position: props.camera.position }}
      >
        <SceneContent {...props} />
      </Canvas>
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
