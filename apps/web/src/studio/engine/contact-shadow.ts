// Soft contact shadows.
// The scene is rendered from below with a depth material into a small
// target, then blurred in two passes, then shown on a plane on the
// ground. Parts close to the ground come out darkest, so each object is
// grounded in the scene. The technique follows the three.js contact
// shadow example (MIT licence) and uses the blur shaders shipped with
// three.js.

import * as THREE from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import type { ContactShadowSettings } from "@listing-photos-generator/mockup-engine/studio";

export class ContactShadow {
  readonly group = new THREE.Group();
  private readonly settings: ContactShadowSettings;
  private readonly renderTarget: THREE.WebGLRenderTarget;
  private readonly renderTargetBlur: THREE.WebGLRenderTarget;
  private readonly plane: THREE.Mesh;
  private readonly blurPlane: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly depthMaterial: THREE.MeshDepthMaterial;
  private readonly horizontalBlur: THREE.ShaderMaterial;
  private readonly verticalBlur: THREE.ShaderMaterial;

  constructor(settings: ContactShadowSettings, resolution: number) {
    this.settings = settings;
    const size = settings.planeSizeMetres;
    this.group.name = "contact_shadow";

    this.renderTarget = new THREE.WebGLRenderTarget(resolution, resolution);
    this.renderTarget.texture.generateMipmaps = false;
    this.renderTargetBlur = new THREE.WebGLRenderTarget(resolution, resolution);
    this.renderTargetBlur.texture.generateMipmaps = false;

    const geometry = new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
      opacity: settings.opacity,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.plane = new THREE.Mesh(geometry, material);
    this.plane.renderOrder = 1;
    // The camera looks up, so the image is mirrored. Flip it back.
    this.plane.scale.y = -1;
    // Just above the ground, so the shadow never fights the desk surface.
    this.plane.position.y = 0.0001;
    this.group.add(this.plane);

    this.blurPlane = new THREE.Mesh(geometry);
    this.blurPlane.visible = false;
    this.group.add(this.blurPlane);

    this.camera = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, settings.heightMetres);
    this.camera.rotation.x = Math.PI / 2;
    // A little below the ground, so a thin object lying on the ground,
    // such as a sheet of paper, is inside the view and casts a shadow.
    this.camera.position.y = -0.0005;
    this.group.add(this.camera);

    this.depthMaterial = new THREE.MeshDepthMaterial();
    // Both sides: a sheet of paper faces up, away from the shadow camera.
    this.depthMaterial.side = THREE.DoubleSide;
    this.depthMaterial.depthTest = false;
    this.depthMaterial.depthWrite = false;
    this.depthMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
        "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) );",
      );
    };

    this.horizontalBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    this.horizontalBlur.depthTest = false;
    this.verticalBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    this.verticalBlur.depthTest = false;
  }

  private blur(renderer: THREE.WebGLRenderer, amount: number): void {
    this.blurPlane.visible = true;
    this.blurPlane.material = this.horizontalBlur;
    this.horizontalBlur.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.horizontalBlur.uniforms.h.value = amount;
    renderer.setRenderTarget(this.renderTargetBlur);
    renderer.render(this.blurPlane, this.camera);

    this.blurPlane.material = this.verticalBlur;
    this.verticalBlur.uniforms.tDiffuse.value = this.renderTargetBlur.texture;
    this.verticalBlur.uniforms.v.value = amount;
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.blurPlane, this.camera);
    this.blurPlane.visible = false;
  }

  /**
   * Draw the shadow texture. Call once after the scene is set up, and
   * again whenever a model moves. Objects listed in hide (the ground) are
   * left out, so they do not shadow themselves.
   */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, hide: THREE.Object3D[]): void {
    if (!this.settings.enabled) {
      this.plane.visible = false;
      return;
    }
    scene.updateMatrixWorld(true);
    const hidden = [this.plane, ...hide].filter((object) => object.visible);
    for (const object of hidden) object.visible = false;

    const previousBackground = scene.background;
    const previousOverride = scene.overrideMaterial;
    const previousTarget = renderer.getRenderTarget();
    const previousClearAlpha = renderer.getClearAlpha();
    const previousClearColour = renderer.getClearColor(new THREE.Color());
    const previousAutoClear = renderer.autoClear;

    scene.background = null;
    scene.overrideMaterial = this.depthMaterial;
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(scene, this.camera);
    scene.overrideMaterial = previousOverride;

    // Two passes: a wide one for softness, a narrow one to smooth it.
    this.blur(renderer, this.settings.blur);
    this.blur(renderer, this.settings.blur * 0.4);

    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousClearColour, previousClearAlpha);
    renderer.autoClear = previousAutoClear;
    scene.background = previousBackground;
    for (const object of hidden) object.visible = true;
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.renderTargetBlur.dispose();
    this.plane.geometry.dispose();
    (this.plane.material as THREE.Material).dispose();
    this.depthMaterial.dispose();
    this.horizontalBlur.dispose();
    this.verticalBlur.dispose();
  }
}
