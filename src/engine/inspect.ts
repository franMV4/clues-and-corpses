// Modo inspección: el objeto aislado en un segundo canvas, girable, con lupa real (render target) y luz UV.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class Inspector {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  controls: OrbitControls;
  obj: THREE.Object3D | null = null;
  pivot = new THREE.Group();
  lens = false;
  uv = false;
  onLupa?: () => void;
  private lensRT = new THREE.WebGLRenderTarget(512, 512, { samples: 4 });
  private lensScene = new THREE.Scene();
  private lensCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  private lensQuad: THREE.Mesh;
  private lensR = 110;
  private lensZoom = 2.6;
  private ptr = { x: -999, y: -999 };
  private ray = new THREE.Raycaster();
  private lupaT = 0;
  private lights: { key: THREE.DirectionalLight; rim: THREE.DirectionalLight; amb: THREE.HemisphereLight; uv: THREE.PointLight };
  private flipT = -1;
  private flipFrom = 0;
  private clock = new THREE.Clock();
  private running = false;
  ring: HTMLDivElement;

  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    this.camera.layers.enable(1);
    const key = new THREE.DirectionalLight('#ffe2b8', 1.9); key.position.set(2, 3, 2.5);
    const rim = new THREE.DirectionalLight('#9fb6ff', 1.6); rim.position.set(-3, 1.5, -2.5);
    const amb = new THREE.HemisphereLight('#fff4e0', '#2a2018', 0.6);
    const uv = new THREE.PointLight('#7b3cff', 0, 6); uv.position.set(0.5, 1.2, 2);
    this.lights = { key, rim, amb, uv };
    this.scene.add(key, rim, amb, uv, this.pivot);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.8;
    this.lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { map: { value: this.lensRT.texture } },
      transparent: true, depthTest: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform sampler2D map; varying vec2 vUv;
        void main(){ vec2 c = vUv - .5; float r = length(c) * 2.;
          if (r > 1.) discard;
          vec2 uv = .5 + c * (1. - .18 * r * r);              // ligera distorsión de lente en el borde
          vec4 col = texture2D(map, uv);
          col.rgb *= 1. - .35 * smoothstep(.75, 1., r);         // viñeta del cristal
          col.rgb += .06 * smoothstep(.2, .0, length(c - vec2(-.18, .2)));  // brillo
          gl_FragColor = vec4(col.rgb, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    this.lensScene.add(this.lensQuad);
    this.ring = document.createElement('div');
    this.ring.className = 'lens-ring';
    canvas.parentElement?.appendChild(this.ring);
    canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); this.ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    canvas.addEventListener('pointerleave', () => { this.ptr = { x: -999, y: -999 }; });
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.lensR = Math.max(80, Math.min(130, r.width * 0.12));
  }

  open(src: THREE.Object3D) {
    this.close();
    const o = src.clone(true);
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.copy(src.getWorldScale(new THREE.Vector3()));
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o, true);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const s = 1.4 / Math.max(size.x, size.y, size.z, 0.001);
    o.scale.multiplyScalar(s);
    o.position.copy(center.multiplyScalar(-s));
    // objetos planos (papeles, siluetas) se presentan de cara
    if (size.y < Math.max(size.x, size.z) * 0.12) { this.pivot.rotation.x = Math.PI / 2.6; } else this.pivot.rotation.x = 0;
    this.pivot.rotation.y = 0;
    this.pivot.add(o);
    this.obj = o;
    o.traverse(c => { if (c.userData.uv) c.visible = false; });
    this.camera.position.set(0, 0.35, 3.1);
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 1.4; this.controls.maxDistance = 4.5;
    this.controls.update();
    this.setUV(false);
    this.lens = false;
    this.ring.classList.remove('on');
    this.resize();
    this.running = true;
    this.clock.getDelta();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  close() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    if (this.obj) this.pivot.remove(this.obj);
    this.obj = null;
    this.ring.classList.remove('on');
  }

  setUV(on: boolean) {
    this.uv = on;
    this.lights.key.intensity = on ? 0.05 : 1.9;
    this.lights.rim.intensity = on ? 0.1 : 1.6;
    this.lights.amb.intensity = on ? 0.05 : 0.6;
    this.lights.uv.intensity = on ? 18 : 0;
    this.scene.environmentIntensity = on ? 0.03 : 0.55;
    this.obj?.traverse(c => { if (c.userData.uv) c.visible = on; });
  }

  setLens(on: boolean) { this.lens = on; this.lupaT = 0; this.ring.classList.toggle('on', on); this.canvas.classList.toggle('lensing', on); }

  flip() { this.flipT = 0; this.flipFrom = this.pivot.rotation.y; }

  private frame() {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.controls.update();
    if (this.flipT >= 0) {
      this.flipT = Math.min(1, this.flipT + dt / 0.9);
      const k = this.flipT < 0.5 ? 4 * this.flipT ** 3 : 1 - Math.pow(-2 * this.flipT + 2, 3) / 2;
      this.pivot.rotation.y = this.flipFrom + Math.PI * k;
      if (this.flipT >= 1) this.flipT = -1;
    }
    const r = this.renderer;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    r.autoClear = true;
    r.render(this.scene, this.camera);
    if (this.lens && this.ptr.x > -500) {
      const R = this.lensR, z = this.lensZoom;
      const cam = this.camera.clone();
      cam.setViewOffset(w, h, this.ptr.x - R / z, this.ptr.y - R / z, (2 * R) / z, (2 * R) / z);
      cam.updateProjectionMatrix();
      r.setRenderTarget(this.lensRT);
      r.clear();
      r.render(this.scene, cam);
      r.setRenderTarget(null);
      this.lensCam.right = w; this.lensCam.top = h; this.lensCam.updateProjectionMatrix();
      this.lensQuad.scale.set(2 * R, 2 * R, 1);
      this.lensQuad.position.set(this.ptr.x, h - this.ptr.y, 0);
      r.autoClear = false;
      r.clearDepth();
      r.render(this.lensScene, this.lensCam);
      this.ring.style.transform = `translate(${this.ptr.x}px, ${this.ptr.y}px)`;
      this.ring.style.width = this.ring.style.height = `${2 * R + 18}px`;
      // ¿la lupa está encima del objeto?
      this.ray.setFromCamera(new THREE.Vector2((this.ptr.x / w) * 2 - 1, -(this.ptr.y / h) * 2 + 1), this.camera);
      const over = this.obj && this.ray.intersectObject(this.obj, true).length > 0;
      this.lupaT = over ? this.lupaT + dt : Math.max(0, this.lupaT - dt * 2);
      this.ring.style.setProperty('--p', String(Math.min(1, this.lupaT / 0.9)));
      if (this.lupaT > 0.9) { this.lupaT = 0; this.onLupa?.(); }
    }
  }
}

/** Renderer pequeño para miniaturas de pistas y retratos de sospechosos. */
export class Snap {
  private r: THREE.WebGLRenderer;
  private cache = new Map<string, string>();
  constructor() {
    const c = document.createElement('canvas');
    this.r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.r.toneMapping = THREE.AgXToneMapping;
    this.r.toneMappingExposure = 1.2;
  }

  object(key: string, src: THREE.Object3D, size = 256) {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight('#fff6e8', '#3b2c20', 1.4));
    const d = new THREE.DirectionalLight('#ffe6c0', 2.4); d.position.set(2, 4, 3); s.add(d);
    const o = src.clone(true);
    o.position.set(0, 0, 0); o.rotation.set(0, src.rotation.y * 0.3, 0);
    o.traverse(c => { if (c.userData.uv) c.visible = false; });
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o, true);
    const sz = box.getSize(new THREE.Vector3()), ct = box.getCenter(new THREE.Vector3());
    const flat = sz.y < Math.max(sz.x, sz.z) * 0.12;
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    const rad = Math.max(sz.x, sz.y, sz.z) * 0.6;
    const dir = flat ? new THREE.Vector3(0, 1, 0.35) : new THREE.Vector3(0.55, 0.45, 1);
    cam.position.copy(ct).add(dir.normalize().multiplyScalar(rad / Math.tan((15 * Math.PI) / 180) * 1.05));
    cam.lookAt(ct);
    s.add(o);
    this.r.setSize(size, size, false);
    this.r.setClearColor(0x000000, 0);
    this.r.render(s, cam);
    const url = this.r.domElement.toDataURL('image/png');
    this.cache.set(key, url);
    return url;
  }

  /** Retrato de ficha policial con efecto de grabado (tramado a línea). */
  portrait(key: string, bust: THREE.Object3D, w = 300, h = 380) {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const s = new THREE.Scene();
    const k = new THREE.DirectionalLight('#ffffff', 2.6); k.position.set(-1.8, 1.6, 2.2); s.add(k);
    const f = new THREE.DirectionalLight('#ffffff', 0.35); f.position.set(2, 0.5, 1.5); s.add(f);
    const rim = new THREE.DirectionalLight('#ffffff', 2.4); rim.position.set(1, 1.5, -2.5); s.add(rim);
    s.add(new THREE.AmbientLight('#ffffff', 0.12));
    s.add(bust);
    const cam = new THREE.PerspectiveCamera(24, w / h, 0.1, 20);
    cam.position.set(0.55, 0.92, 3.1); cam.lookAt(0, 0.68, 0);
    this.r.setSize(w, h, false);
    this.r.setClearColor(0xffffff, 1);
    this.r.render(s, cam);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const g = out.getContext('2d')!;
    g.drawImage(this.r.domElement, 0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), px = img.data;
    const paper = [232, 222, 200], ink = [28, 22, 18];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
      const dark = 1 - lum;
      // tres tramas de líneas: diagonal, contradiagonal y horizontal, según lo oscuro
      const l1 = Math.abs(((x + y * 0.55) % 5) - 2.5) / 2.5;
      const l2 = Math.abs(((x - y * 0.8 + 400) % 6) - 3) / 3;
      const l3 = Math.abs((y % 4) - 2) / 2;
      let a = 0;
      if (l1 < dark * 1.05) a = 1;
      if (dark > 0.45 && l2 < (dark - 0.45) * 1.6) a = 1;
      if (dark > 0.75 && l3 < (dark - 0.75) * 2.5) a = 1;
      const edge = lum > 0.985 ? 0 : a;
      for (let c = 0; c < 3; c++) px[i + c] = paper[c] + (ink[c] - paper[c]) * edge * 0.92;
      px[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const url = out.toDataURL('image/png');
    this.cache.set(key, url);
    return url;
  }
}
