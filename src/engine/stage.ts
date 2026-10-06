// Escenario principal: renderer + postprocesado, cámara por nodos, mirar arrastrando, selección con contorno y marcadores DOM.
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode, OutlineEffect, BlendFunction, KernelSize } from 'postprocessing';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { NodeDef, World } from '../types';

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), ZERO2 = new THREE.Vector2();
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// ponytail: «calidad» automática por tipo de puntero y núcleos, luego se afina por FPS (resolución dinámica)
const mobile = matchMedia('(pointer: coarse)').matches;
const low = mobile || (navigator.hardwareConcurrency ?? 8) <= 4;
const SLOTS = low ? 5 : 8;
const maxDpr = Math.min(devicePixelRatio, mobile ? 1.5 : 1.75), minDpr = 0.6;

// Tope de brillo por píxel. Una luz fuerte sobre una superficie pulida desborda el búfer de media precisión
// (Inf/NaN) y el bloom lo extiende hasta dejar la pantalla en negro al girar la cámara.
THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('gl_FragColor = vec4( outgoingLight',
  'if ( any( isnan( outgoingLight ) ) ) outgoingLight = vec3( 0.0 );\noutgoingLight = clamp( outgoingLight, 0.0, 64.0 );\ngl_FragColor = vec4( outgoingLight');

export class Stage {
  renderer: THREE.WebGLRenderer;
  camera = new THREE.PerspectiveCamera(55, 1, 0.05, 500);
  composer?: EffectComposer;
  outline?: OutlineEffect;
  world?: World;
  nodes: Record<string, NodeDef> = {};
  current?: NodeDef;
  paused = false;
  markers = document.createElement('div');
  glintsOn = false;

  onClue?: (id: string) => void;
  onNode?: (id: string) => void;
  canClick: (id: string) => boolean = () => true;
  isDone: (id: string) => boolean = () => false;
  markerLabel: (n: NodeDef) => string = n => n.label;

  private base = new THREE.Quaternion();
  private yaw = 0; private pitch = 0; private tYaw = 0; private tPitch = 0;
  private fov = 55; private tFov = 55;
  private par = new THREE.Vector2(); private tPar = new THREE.Vector2();
  private travel: null | { from: THREE.Vector3; to: THREE.Vector3; q0: THREE.Quaternion; q1: THREE.Quaternion; t: number; dur: number; node: NodeDef } = null;
  private ray = new THREE.Raycaster();
  private ptr = new THREE.Vector2(9, 9);
  private ptrPx = { x: 0, y: 0 };
  private drag: null | { x: number; y: number; moved: number; id: number } = null;
  private pinch = new Map<number, { x: number; y: number }>();
  private pinchD = 0;
  hover: string | null = null;
  private clueList: THREE.Object3D[] = [];
  private centers: Record<string, THREE.Vector3> = {};
  private clock = new THREE.Clock();
  private t = 0;
  private fade = document.getElementById('fade')!;
  private env: THREE.Texture | null = null;
  private markerEls = new Map<string, HTMLButtonElement>();
  private glintEls = new Map<string, HTMLDivElement>();
  // luces puntuales reales del caso y los pocos «huecos» fijos que de verdad se pintan
  private lamps: THREE.PointLight[] = [];
  private slots: THREE.PointLight[] = [];
  private lit: (THREE.PointLight | undefined)[] = [];
  private dpr = low ? Math.min(1, maxDpr) : maxDpr;
  private perf = { t: 0, n: 0, good: 0 };
  private tmpQ = new THREE.Quaternion(); private tmpQ2 = new THREE.Quaternion(); private tmpV = new THREE.Vector3();

  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // ponytail: sombras estáticas (se pintan una vez al cargar); un mundo con piezas móviles pide liveShadows
    this.renderer.shadowMap.autoUpdate = false;
    this.camera.layers.enable(1);
    this.ray.layers.set(0);
    this.markers.className = 'markers';
    document.body.appendChild(this.markers);
    addEventListener('resize', () => this.resize());
    this.bindInput();
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    // en vertical abrimos el campo para que quepa la escena
    this.tFov = this.fov = w < h ? 72 : 55;
    this.camera.updateProjectionMatrix();
  }

  setWorld(world: World, nodes: NodeDef[], start: string) {
    this.clearWorld();
    this.world = world;
    // reflejos suaves para metales y cristal (sin entorno, el latón se ve negro)
    this.env ??= new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    world.scene.environment ??= this.env;
    if (world.envIntensity !== undefined) world.scene.environmentIntensity = world.envIntensity;
    else world.scene.environmentIntensity = 0.22;
    this.prepare(world);
    this.nodes = Object.fromEntries(nodes.map(n => [n.id, n]));
    this.clueList = Object.values(world.clues);
    for (const [id, o] of Object.entries(world.clues)) {
      o.traverse(c => { c.userData.clueId = id; });
      o.updateWorldMatrix(true, true);
      this.centers[id] = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    }
    const comp = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: Math.min(low ? 2 : 4, this.renderer.capabilities.maxSamples) });
    comp.addPass(new RenderPass(world.scene, this.camera));
    // el contorno solo sirve al pasar el ratón: en táctil no hay hover y sería un pase de más
    this.outline = mobile ? undefined : new OutlineEffect(world.scene, this.camera, {
      blendFunction: BlendFunction.SCREEN, edgeStrength: 4, pulseSpeed: 0.35,
      visibleEdgeColor: 0xe0b878, hiddenEdgeColor: 0x3a2a12, blur: true, kernelSize: KernelSize.VERY_SMALL, xRay: false,
    });
    const bloom = new BloomEffect({ intensity: world.bloom ?? 0.9, luminanceThreshold: 0.72, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.7 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    const vig = new VignetteEffect({ offset: 0.3, darkness: 0.68 });
    comp.addPass(new EffectPass(this.camera, ...[bloom, tone, this.outline, vig].filter(e => !!e)));
    this.renderer.toneMappingExposure = world.exposure ?? 1;
    this.composer = comp;
    this.resize();
    this.goto(start, true);
    // Compilar todos los shaders y subir texturas ya, tras el «cargando», y no a tirones al girar la cámara.
    // Contra el búfer del posprocesado: pintar ahí usa otra variante de shader que pintar en pantalla.
    this.renderer.setRenderTarget(comp.inputBuffer);
    this.renderer.compile(world.scene, this.camera);
    this.renderer.setRenderTarget(null);
    world.scene.traverse(o => {
      const m = (o as THREE.Mesh).material;
      for (const mt of Array.isArray(m) ? m : m ? [m] : []) for (const v of Object.values(mt)) if (v instanceof THREE.Texture) this.renderer.initTexture(v);
    });
    // un fotograma de calentamiento: compila el posprocesado y pinta los mapas de sombra
    this.renderer.shadowMap.needsUpdate = true;
    this.syncLamps();
    comp.render(0);
  }

  /** Ajustes de rendimiento sobre la escena ya construida. */
  private prepare(world: World) {
    const scene = world.scene;
    this.lamps = []; this.slots = []; this.lit = [];
    scene.traverse(o => {
      const l = o as THREE.PointLight;
      if (l.isPointLight && !l.castShadow) this.lamps.push(l);
      // la lluvia y el polvo no se pueden pulsar: fuera del rayo (son miles de segmentos)
      if ((o as THREE.Points).isPoints || (o as THREE.Line).isLine) o.raycast = () => {};
      const m = (o as THREE.Mesh).material;
      // la refracción real repinta la escena entera otra vez cada fotograma; en gama baja, cristal simple
      if (low) for (const mt of Array.isArray(m) ? m : m ? [m] : []) {
        const ph = mt as THREE.MeshPhysicalMaterial;
        if (ph.isMeshPhysicalMaterial && ph.transmission > 0) { ph.transparent = true; ph.opacity = Math.min(ph.opacity, 1 - ph.transmission * 0.6); ph.transmission = 0; }
      }
    });
    // Cada luz puntual cuesta en cada píxel aunque esté en otra habitación. Se pintan solo SLOTS a la vez:
    // las reales se ocultan y unos huecos fijos copian las más influyentes junto a la cámara (el nº de luces
    // no cambia nunca, así que tampoco se recompilan shaders al moverse).
    if (this.lamps.length > SLOTS) {
      for (const l of this.lamps) l.visible = false;
      for (let i = 0; i < SLOTS; i++) { const p = new THREE.PointLight(0, 0); this.slots.push(p); scene.add(p); }
    } else this.lamps = [];
  }

  private pickLamps(at: THREE.Vector3) {
    if (!this.slots.length) return;
    const wp = new THREE.Vector3();
    this.lit = this.lamps
      // los huecos cuestan lo mismo llenos que vacíos: se llenan siempre, por influencia aproximada en la cámara
      .map(l => ({ l, k: l.intensity / Math.max(l.getWorldPosition(wp).distanceTo(at), 1) ** 2 }))
      .sort((a, b) => b.k - a.k).slice(0, SLOTS).map(x => x.l);
  }

  private syncLamps() {
    this.slots.forEach((s, i) => {
      const l = this.lit[i];
      if (!l) { s.intensity = 0; return; }
      l.getWorldPosition(s.position);
      s.color.copy(l.color); s.intensity = l.intensity; s.distance = l.distance; s.decay = l.decay;
    });
  }

  /** Baja o sube la resolución según los FPS reales; cambia poco y con margen para no ir a saltos. */
  private adapt(dt: number) {
    const p = this.perf;
    p.t += dt; p.n++;
    if (p.t < 2) return;
    const avg = p.t / p.n;
    p.t = 0; p.n = 0;
    let next = this.dpr;
    if (avg > 1 / 40 && this.composer?.multisampling) { this.composer.multisampling = 0; p.good = 0; return; } // lo primero que sobra: el antialias
    if (avg > 1 / 40 && this.dpr > minDpr) { next = Math.max(minDpr, this.dpr * 0.8); p.good = 0; }
    else if (avg < 1 / 55 && this.dpr < maxDpr && ++p.good >= 3) { next = Math.min(maxDpr, this.dpr * 1.15); p.good = 0; }
    if (Math.abs(next - this.dpr) < 0.01) return;
    this.dpr = next;
    this.renderer.setPixelRatio(next);
    this.resize();
  }

  clearWorld() {
    this.composer?.dispose();
    this.composer = undefined;
    this.world?.scene.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mt of mats) { for (const v of Object.values(mt)) if (v instanceof THREE.Texture && v !== this.env) v.dispose(); mt.dispose(); }
    });
    this.world = undefined;
    this.lamps = []; this.slots = []; this.lit = [];
    this.current = undefined;
    this.travel = null;
    this.markers.replaceChildren();
    this.markerEls.clear(); this.glintEls.clear();
    this.centers = {};
    this.hover = null;
  }

  /** Viaja a un nodo. Misma área: travelling suave. Otra área: fundido a negro. */
  goto(id: string, instant = false) {
    const n = this.nodes[id];
    if (!n || this.travel) return;
    const from = this.current;
    const q1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(...n.pos), new THREE.Vector3(...n.look), new THREE.Vector3(0, 1, 0)));
    const arrive = () => {
      this.current = n;
      this.pickLamps(this.tmpV.set(...n.pos));
      this.base.copy(q1);
      this.yaw = this.tYaw = this.pitch = this.tPitch = 0;
      this.rebuildMarkers();
      this.world?.onNode?.(n.id);
      this.onNode?.(n.id);
    };
    if (instant || !from) {
      this.camera.position.set(...n.pos);
      this.camera.quaternion.copy(q1);
      arrive();
      return;
    }
    this.markers.replaceChildren(); this.markerEls.clear(); this.glintEls.clear();
    const q0 = this.camera.quaternion.clone();
    if (from.area === n.area && !reduced) {
      // durante el travelling, las luces del punto medio del recorrido
      this.pickLamps(this.tmpV.set(...n.pos).add(this.camera.position).multiplyScalar(0.5));
      this.travel = { from: this.camera.position.clone(), to: new THREE.Vector3(...n.pos), q0, q1, t: 0, dur: 1.15, node: n };
      this.travelDone = arrive;
    } else {
      // un paso hacia la puerta, fundido, y aparecer en la otra estancia
      const dir = new THREE.Vector3(...(from.exits?.[n.id] ?? n.marker)).sub(this.camera.position).normalize().multiplyScalar(0.6);
      this.travel = { from: this.camera.position.clone(), to: this.camera.position.clone().add(dir), q0, q1: q0.clone(), t: 0, dur: 0.45, node: n };
      this.fade.classList.add('on');
      this.travelDone = () => {
        this.camera.position.set(...n.pos);
        this.camera.quaternion.copy(q1);
        arrive();
        setTimeout(() => this.fade.classList.remove('on'), 80);
      };
    }
  }
  private travelDone: () => void = () => {};

  private bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch.size === 2) { const [a, b] = [...this.pinch.values()]; this.pinchD = Math.hypot(a.x - b.x, a.y - b.y); this.drag = null; return; }
      this.drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
      c.setPointerCapture(e.pointerId);
      this.setPtr(e);
    });
    c.addEventListener('pointermove', e => {
      this.setPtr(e);
      if (this.pinch.has(e.pointerId)) this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch.size === 2) {
        const [a, b] = [...this.pinch.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.zoom((this.pinchD - d) * 0.08); this.pinchD = d;
        return;
      }
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      this.drag.moved += Math.abs(dx) + Math.abs(dy);
      this.drag.x = e.clientX; this.drag.y = e.clientY;
      const k = e.pointerType === 'touch' ? 0.006 : 0.0035;
      this.tYaw = THREE.MathUtils.clamp(this.tYaw + dx * k, -1.15, 1.15);
      this.tPitch = THREE.MathUtils.clamp(this.tPitch + dy * k, -0.55, 0.5);
      c.classList.toggle('dragging', this.drag.moved > 6);
    });
    const up = (e: PointerEvent) => {
      this.pinch.delete(e.pointerId);
      c.classList.remove('dragging');
      if (this.drag && this.drag.id === e.pointerId && this.drag.moved < 8) {
        this.setPtr(e);
        const id = this.pick();
        if (id && !this.travel) this.onClue?.(id);
      }
      this.drag = null;
      if (e.pointerType === 'touch') this.ptr.set(9, 9);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { this.ptr.set(9, 9); });
    c.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY * 0.02); }, { passive: false });
    addEventListener('keydown', e => { if (e.code === 'Space' && !isTyping(e)) { e.preventDefault(); this.glintsOn = true; } });
    addEventListener('keyup', e => { if (e.code === 'Space') this.glintsOn = false; });
  }

  private zoom(d: number) { this.tFov = THREE.MathUtils.clamp(this.tFov + d, 28, this.fov); }

  private setPtr(e: PointerEvent) {
    this.ptrPx = { x: e.clientX, y: e.clientY };
    this.ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.tPar.set(this.ptr.x, this.ptr.y);
  }

  /** Lo primero que toca el rayo; solo cuenta si es una pista clicable en este nodo. */
  pick(): string | null {
    if (!this.world || this.ptr.x > 2) return null;
    this.ray.setFromCamera(this.ptr, this.camera);
    const hit = this.ray.intersectObjects(this.world.scene.children, true)[0];
    if (!hit || hit.distance > 9) return null;
    const id = hit.object.userData.clueId as string | undefined;
    return id && this.canClick(id) ? id : null;
  }

  private rebuildMarkers() {
    this.markers.replaceChildren(); this.markerEls.clear(); this.glintEls.clear();
    if (!this.current) return;
    for (const l of this.current.links) {
      const n = this.nodes[l];
      const b = document.createElement('button');
      b.className = 'marker';
      b.innerHTML = `<span class="ring"></span><span class="lbl">${this.markerLabel(n)}</span>`;
      b.onclick = () => this.goto(l);
      this.markers.appendChild(b);
      this.markerEls.set(l, b);
    }
    for (const id of Object.keys(this.centers)) {
      if (!this.canClick(id)) continue;
      const d = document.createElement('div');
      d.className = 'glint';
      this.markers.appendChild(d);
      this.glintEls.set(id, d);
    }
  }

  private project(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, front: p.z < 1 && p.z > -1 };
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.t += dt;
    if (!this.world || !this.composer) return;
    if (this.paused || !innerWidth) return;
    this.world.update?.(this.t, dt);

    if (this.travel) {
      const tr = this.travel;
      tr.t += dt / tr.dur;
      const k = ease(Math.min(tr.t, 1));
      this.camera.position.lerpVectors(tr.from, tr.to, k);
      this.camera.quaternion.slerpQuaternions(tr.q0, tr.q1, k);
      if (tr.t >= 1) { this.travel = null; this.travelDone(); }
    } else if (this.current) {
      const lerp = 1 - Math.pow(0.0009, dt);
      this.yaw += (this.tYaw - this.yaw) * lerp;
      this.pitch += (this.tPitch - this.pitch) * lerp;
      this.par.lerp(this.tPar.x > 2 ? ZERO2 : this.tPar, 1 - Math.pow(0.05, dt));
      const sway = reduced ? 0 : 1;
      this.camera.quaternion.copy(this.base)
        .multiply(this.tmpQ.setFromAxisAngle(Y, -this.yaw - this.par.x * 0.035 * sway + Math.sin(this.t * 0.31) * 0.004 * sway))
        .multiply(this.tmpQ2.setFromAxisAngle(X, -this.pitch + this.par.y * 0.025 * sway + Math.sin(this.t * 0.47) * 0.003 * sway));
      const p = this.current.pos;
      this.camera.position.set(p[0], p[1] + Math.sin(this.t * 0.6) * 0.006 * sway, p[2]);
    }
    if (Math.abs(this.camera.fov - this.tFov) > 0.01) { this.camera.fov += (this.tFov - this.camera.fov) * (1 - Math.pow(0.002, dt)); this.camera.updateProjectionMatrix(); }

    // hover
    const id = this.travel || this.drag?.moved ? null : this.pick();
    if (id !== this.hover) {
      this.hover = id;
      this.outline?.selection.clear();
      if (id) this.world.clues[id].traverse(o => { if ((o as THREE.Mesh).isMesh && o.layers.isEnabled(0)) this.outline?.selection.add(o); });
      this.canvas.classList.toggle('lupa', !!id);
    }

    // marcadores y destellos
    if (!this.travel) {
      for (const [l, el] of this.markerEls) {
        const pr = this.project(new THREE.Vector3(...(this.current!.exits?.[l] ?? this.nodes[l].marker)));
        const vis = pr.front && pr.x > 30 && pr.x < innerWidth - 30 && pr.y > 60 && pr.y < innerHeight - 90;
        el.classList.toggle('off', !vis);
        if (vis) el.style.transform = `translate(${pr.x}px, ${pr.y}px)`;
      }
      for (const [cid, el] of this.glintEls) {
        const pr = this.project(this.centers[cid]);
        const vis = this.glintsOn && pr.front;
        el.classList.toggle('on', vis);
        el.classList.toggle('done', this.isDone(cid));
        if (vis) el.style.transform = `translate(${pr.x}px, ${pr.y}px)`;
      }
    }
    this.syncLamps();
    if (this.world.liveShadows) this.renderer.shadowMap.needsUpdate = true;
    this.composer.render(dt);
    this.adapt(dt);
  }

  /** Captura del frame actual (para miniaturas de la portada, etc.). */
  renderOnce() { this.composer?.render(0); }
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON');
}
