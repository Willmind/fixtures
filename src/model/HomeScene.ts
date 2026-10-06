import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import {
  defaults,
  dimensionLines,
  modelCenter,
  railings,
  rooms,
  walls,
} from "./plan";
import type { Point } from "./plan";
import { splitWall } from "./geometry";
import { SelectionGesture } from "./SelectionGesture";
import { HomeFixtures } from "./HomeFixtures";
import type { FixtureOptions } from "./HomeFixtures";
import type { BalconyId } from "./arrangements";
import { previewPalette } from "./arrangements";
import { applySurfaceUVs, createTileSurface, floorFinish, wallTileSides } from "./finishes";

export type ViewOptions = FixtureOptions & {
  view: "perspective" | "plan";
  cutaway: boolean;
  wallHeight: number;
  labels: boolean;
  dimensions: boolean;
  grid: boolean;
  selected: string | null;
};

export class HomeScene {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 150);
  private renderer: THREE.WebGLRenderer;
  private labelRenderer = new CSS2DRenderer();
  private controls: OrbitControls;
  private architecture = new THREE.Group();
  private balconyRailings: { roomId: BalconyId; group: THREE.Group }[] = [];
  private labelGroup = new THREE.Group();
  private dimensions = new THREE.Group();
  private fixtures = new HomeFixtures();
  private floors: THREE.Mesh<
    THREE.ExtrudeGeometry,
    THREE.MeshStandardMaterial
  >[] = [];
  private grid: THREE.GridHelper;
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private options: ViewOptions;
  private raycaster = new THREE.Raycaster();
  private hoverFrame = 0;
  private hoverPoint?: { clientX: number; clientY: number };
  private selectionGesture = new SelectionGesture();
  private labels: Map<string, HTMLElement> = new Map();
  private wallMaterial: THREE.MeshStandardMaterial;
  private wallTileMaterial: THREE.MeshStandardMaterial;
  private edgeMaterial: THREE.LineBasicMaterial;
  private frameMaterial: THREE.MeshStandardMaterial;
  private glassMaterial: THREE.MeshStandardMaterial;

  constructor(
    private host: HTMLElement,
    options: ViewOptions,
    private onSelect: (id: string | null) => void,
    private onError: (message: string) => void,
  ) {
    this.options = options;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xeaf0f2, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "毛坯房三维模型：拖动旋转，滚轮缩放，点击地面选择房间",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.tabIndex = 0;
    this.host.appendChild(this.renderer.domElement);
    this.labelRenderer.domElement.className = "scene-labels";
    this.host.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minZoom = 0.45;
    this.controls.maxZoom = 4;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.minPolarAngle = 0.03;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener("change", this.requestRender);
    this.controls.listenToKeyEvents(this.renderer.domElement);

    this.wallMaterial = this.material({
      color: previewPalette.wall,
      roughness: 0.96,
    });
    const wallTiles = createTileSurface("white", true);
    this.wallTileMaterial = this.material({ color: "#ffffff", ...wallTiles });
    this.textures.add(wallTiles.map).add(wallTiles.bumpMap);
    this.frameMaterial = this.material({
      color: "#343b3d",
      roughness: 0.65,
      metalness: 0.25,
    });
    this.glassMaterial = this.material({
      color: "#a8c5cf",
      roughness: 0.2,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: "#737f80",
      transparent: true,
      opacity: 0.2,
    });
    this.materials.add(this.edgeMaterial);

    this.scene.add(new THREE.HemisphereLight(0xeaf5ff, 0xb6aaa0, 2.5));
    const sun = new THREE.DirectionalLight(0xfff6e8, 3.1);
    sun.position.set(-7, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -13;
    sun.shadow.camera.right = 13;
    sun.shadow.camera.top = 13;
    sun.shadow.camera.bottom = -13;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 45;
    sun.shadow.normalBias = 0.03;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      this.material({ color: "#e6ecec", roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.19;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.grid = new THREE.GridHelper(100, 100, 0xc5cfce, 0xd4dcdb);
    this.grid.position.y = -0.18;
    this.scene.add(this.grid);
    this.scene.add(this.architecture, this.labelGroup, this.dimensions, this.fixtures.group);
    this.buildFloors();
    this.buildDimensions();
    this.buildWalls();
    this.applyVisibility();
    this.resetView();

    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.host.ownerDocument.addEventListener("pointermove", this.pointerMove);
    this.host.ownerDocument.addEventListener("pointerup", this.pointerUp);
    this.host.ownerDocument.addEventListener(
      "pointercancel",
      this.pointerCancel,
    );
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.resize();
    host.dataset.rendered = "true";
  }

  private material(parameters: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial(parameters);
    this.materials.add(material);
    return material;
  }

  private position(point: Point, y = 0) {
    return new THREE.Vector3(
      point[0] - modelCenter[0],
      y,
      point[1] - modelCenter[1],
    );
  }

  private box(
    parent: THREE.Group,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material | THREE.Material[],
    outlined = false,
  ) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if ((Array.isArray(material) ? material : [material]).includes(this.wallTileMaterial)) {
      parent.updateWorldMatrix(true, false);
      mesh.updateMatrix();
      applySurfaceUVs(geometry, new THREE.Matrix4().multiplyMatrices(parent.matrixWorld, mesh.matrix));
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (outlined) {
      const lines = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        this.edgeMaterial,
      );
      mesh.add(lines);
    }
    return mesh;
  }

  private buildFloors() {
    const surfaces = { wood: createTileSurface("wood"), white: createTileSurface("white") };
    for (const surface of Object.values(surfaces)) this.textures.add(surface.map).add(surface.bumpMap);
    for (const room of rooms) {
      const shape = new THREE.Shape();
      room.polygon.forEach(([x, z], i) => {
        if (i === 0) shape.moveTo(x - modelCenter[0], -(z - modelCenter[1]));
        else shape.lineTo(x - modelCenter[0], -(z - modelCenter[1]));
      });
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.16,
        bevelEnabled: false,
      });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, -0.16, 0);
      applySurfaceUVs(geometry);
      const color = "#ffffff";
      const material = this.material({ color, ...surfaces[floorFinish(room)] });
      const floor = new THREE.Mesh(geometry, material);
      floor.userData = { roomId: room.id, baseColor: color };
      floor.receiveShadow = true;
      this.floors.push(floor);
      this.scene.add(floor);
      const element = document.createElement("span");
      element.className = "room-label";
      element.textContent = room.name;
      const label = new CSS2DObject(element);
      label.position.copy(this.position(room.label, 0.1));
      this.labelGroup.add(label);
      this.labels.set(room.id, element);
    }
  }

  private clearGeometry(group: THREE.Group) {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line)
        object.geometry.dispose();
    });
    group.clear();
  }

  private buildWalls() {
    this.clearGeometry(this.architecture);
    this.balconyRailings = [];
    const height = this.options.cutaway
      ? defaults.cutHeight
      : this.options.wallHeight;
    for (const wall of walls) {
      const dx = wall.to[0] - wall.from[0];
      const dz = wall.to[1] - wall.from[1];
      const length = Math.hypot(dx, dz);
      const group = new THREE.Group();
      group.name = wall.id;
      group.position.copy(this.position(wall.from));
      group.rotation.y = -Math.atan2(dz, dx);
      this.architecture.add(group);
      const thickness = wall.thickness ?? defaults.wallThickness;
      const tiled = wallTileSides(wall);
      const wallMaterials = [this.wallMaterial, this.wallMaterial, this.wallMaterial, this.wallMaterial,
        tiled.positive ? this.wallTileMaterial : this.wallMaterial,
        tiled.negative ? this.wallTileMaterial : this.wallMaterial];
      for (const piece of splitWall(
        length,
        Math.min(wall.height ?? height, height),
        wall.openings,
      )) {
        this.box(
          group,
          piece.end - piece.start,
          piece.top - piece.bottom,
          thickness,
          (piece.start + piece.end) / 2,
          (piece.top + piece.bottom) / 2,
          0,
          wallMaterials,
          true,
        );
      }
      for (const opening of wall.openings ?? []) {
        if (opening.kind !== "window" || opening.sill >= height) continue;
        const bottom = opening.sill;
        const top = Math.min(opening.top, height);
        const width = opening.end - opening.start;
        const center = (opening.start + opening.end) / 2;
        const visibleHeight = top - bottom;
        this.box(
          group,
          width,
          0.045,
          0.07,
          center,
          bottom + 0.0225,
          0,
          this.frameMaterial,
        );
        if (opening.top <= height)
          this.box(
            group,
            width,
            0.045,
            0.07,
            center,
            top - 0.0225,
            0,
            this.frameMaterial,
          );
        for (const x of [
          opening.start + 0.025,
          opening.end - 0.025,
          ...(width > 1.3 ? [center] : []),
        ]) {
          this.box(
            group,
            0.045,
            visibleHeight,
            0.07,
            x,
            (bottom + top) / 2,
            0,
            this.frameMaterial,
          );
        }
        this.box(
          group,
          width - 0.06,
          Math.max(0.01, visibleHeight - 0.05),
          0.01,
          center,
          (bottom + top) / 2,
          0,
          this.glassMaterial,
        );
      }
    }
    for (const railing of railings) {
      const group = new THREE.Group();
      this.balconyRailings.push({ roomId: railing.roomId, group });
      group.position.copy(this.position(railing.from));
      const dx = railing.to[0] - railing.from[0];
      const dz = railing.to[1] - railing.from[1];
      group.rotation.y = -Math.atan2(dz, dx);
      const length = Math.hypot(dx, dz);
      const h = Math.min(1.1, height);
      this.box(
        group,
        length,
        0.12,
        0.12,
        length / 2,
        0.06,
        0,
        this.wallMaterial,
      );
      this.box(group, length, 0.04, 0.05, length / 2, h, 0, this.frameMaterial);
      // Site photos show glass infill. Heights and post spacing remain schematic.
      this.box(
        group,
        length - 0.04,
        h - 0.2,
        0.015,
        length / 2,
        (h + 0.12) / 2,
        0,
        this.glassMaterial,
      );
      for (
        let x = 0;
        x <= length + 0.01;
        x += length / Math.ceil(length / 1.0)
      ) {
        this.box(
          group,
          0.035,
          h - 0.1,
          0.035,
          x,
          (h + 0.1) / 2,
          0,
          this.frameMaterial,
        );
      }
      this.architecture.add(group);
    }
  }

  private buildDimensions() {
    const material = new THREE.LineBasicMaterial({ color: "#708388" });
    this.materials.add(material);
    for (const dimension of dimensionLines) {
      const points = [
        this.position(dimension.from, 0.015),
        this.position(dimension.to, 0.015),
      ];
      this.dimensions.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          material,
        ),
      );
      for (const endpoint of [dimension.from, dimension.to]) {
        const line = new THREE.BufferGeometry().setFromPoints([
          this.position([endpoint[0], endpoint[1] - 0.15], 0.015),
          this.position([endpoint[0], endpoint[1] + 0.15], 0.015),
        ]);
        this.dimensions.add(new THREE.Line(line, material));
      }
      const element = document.createElement("span");
      element.className = "dimension-label";
      element.textContent = dimension.label;
      const label = new CSS2DObject(element);
      label.position.copy(
        this.position(
          [(dimension.from[0] + dimension.to[0]) / 2, dimension.from[1] + 0.3],
          0.05,
        ),
      );
      this.dimensions.add(label);
    }
  }

  private applyVisibility() {
    this.fixtures.update(this.options);
    for (const { roomId, group } of this.balconyRailings) {
      group.visible = this.options.balconyModes[roomId] === "original";
    }
    this.labelGroup.visible = this.options.labels;
    this.dimensions.visible = this.options.dimensions;
    this.grid.visible = this.options.grid;
    for (const floor of this.floors) {
      const selected = floor.userData.roomId === this.options.selected;
      floor.material.color.set(selected ? "#92b5a5" : floor.userData.baseColor);
      this.labels
        .get(floor.userData.roomId)
        ?.classList.toggle("is-selected", selected);
    }
  }

  update(options: ViewOptions) {
    const previous = this.options;
    this.options = options;
    if (
      previous.cutaway !== options.cutaway ||
      previous.wallHeight !== options.wallHeight
    )
      this.buildWalls();
    this.applyVisibility();
    if (previous.view !== options.view) this.resetView();
    this.host.dataset.view = options.view;
    this.host.dataset.wallHeight = String(
      options.cutaway ? defaults.cutHeight : options.wallHeight,
    );
    this.requestRender();
  }

  resetView = () => {
    // Drain OrbitControls damping before replacing the camera/target, otherwise
    // switching views during a drag's inertia continues moving the new view.
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
    this.controls.target.set(-0.9, 0, 0);
    this.camera.zoom = 1;
    const plan = this.options.view === "plan";
    this.camera.position.set(plan ? -0.9 : 10.1, plan ? 26 : 19, plan ? 0.001 : 21);
    this.controls.minPolarAngle = plan ? 0 : 0.03;
    this.controls.enableRotate = !plan;
    this.controls.mouseButtons.LEFT = plan
      ? THREE.MOUSE.PAN
      : THREE.MOUSE.ROTATE;
    this.controls.touches.ONE = plan ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    this.renderer.domElement.setAttribute(
      "aria-label",
      `毛坯房${plan ? "俯视" : "三维"}模型：拖动${plan ? "平移" : "旋转"}，滚轮缩放，点击地面选择房间，点击门、窗帘或床底抽屉切换开合，也可点击床垫开合整床抽屉`,
    );
    this.camera.lookAt(-0.9, 0, 0);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.requestRender();
  };

  zoom = (factor: number) => {
    this.camera.zoom = THREE.MathUtils.clamp(
      this.camera.zoom * factor,
      0.45,
      4,
    );
    this.camera.updateProjectionMatrix();
    this.requestRender();
  };

  private resize = () => {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height || this.disposed) return;
    const aspect = width / height;
    const halfHeight = Math.max(7.8, 9.2 / aspect);
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
    this.requestRender();
  };

  private requestRender = () => {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(this.render);
  };

  private render = (now: number) => {
    this.frame = 0;
    if (this.disposed) return;
    this.controls.update();
    const curtainsMoving = this.fixtures.animateCurtains(now);
    const doorsMoving = this.fixtures.animateDoors(now);
    const drawersMoving = this.fixtures.animateBedDrawers(now);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    if (curtainsMoving || doorsMoving || drawersMoving) this.requestRender();
  };

  private pointerDown = (event: PointerEvent) => {
    this.selectionGesture.start(event);
    cancelAnimationFrame(this.hoverFrame);
    this.hoverFrame = 0;
    this.renderer.domElement.style.cursor = "grabbing";
  };
  private updateHover = () => {
    this.hoverFrame = 0;
    const hit = this.hoverPoint && this.pickFirst(this.hoverPoint);
    this.renderer.domElement.style.cursor = hit && this.fixtures.isOperable(hit.object) ? "pointer" : "";
  };
  private pointerMove = (event: PointerEvent) => {
    this.selectionGesture.move(event);
    if (event.pointerType === "touch") return;
    if (this.hoverFrame) cancelAnimationFrame(this.hoverFrame);
    this.hoverFrame = 0;
    if (event.buttons) {
      this.hoverPoint = undefined;
      return;
    }
    if (event.target !== this.renderer.domElement) {
      this.hoverPoint = undefined;
      this.renderer.domElement.style.cursor = "";
      return;
    }
    this.hoverPoint = { clientX: event.clientX, clientY: event.clientY };
    this.hoverFrame = requestAnimationFrame(this.updateHover);
  };
  private pointerCancel = (event: PointerEvent) => {
    this.selectionGesture.cancel(event.pointerId);
    this.renderer.domElement.style.cursor = "";
  };
  private pickFirst(event: { clientX: number; clientY: number }) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      return;
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    // Include walls so a click on a wall cannot select an invisible floor behind it.
    // Hidden original railings must not intercept clicks through the new glazing.
    const architecture: THREE.Mesh[] = [];
    this.architecture.traverseVisible((object) => {
      if (object instanceof THREE.Mesh) architecture.push(object);
    });
    const hits = this.raycaster.intersectObjects(
      [...this.floors, ...architecture, ...this.fixtures.selectable],
      false,
    );
    // Operable glass is a hit target; fixed translucent glazing lets taps through
    // to curtains. Solid walls and furniture continue to block objects behind.
    return hits.find(({ object }) => {
      if (!(object instanceof THREE.Mesh)) return false;
      if (this.fixtures.isOperable(object)) return true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      return materials.some((material) => !material.transparent || material.opacity >= 0.5 || material.depthWrite);
    });
  }
  private pointerUp = (event: PointerEvent) => {
    const selected = this.selectionGesture.end(event);
    this.renderer.domElement.style.cursor = "";
    if (!selected) return;
    const first = this.pickFirst(event);
    if (first && this.fixtures.isOperable(first.object) && event.pointerType !== "touch") {
      this.renderer.domElement.style.cursor = "pointer";
    }
    const now = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (first && (this.fixtures.toggleDoor(first.object, now, reducedMotion)
      || this.fixtures.toggleBedDrawer(first.object, now, reducedMotion)
      || this.fixtures.toggleCurtain(first.object, now, reducedMotion))) {
      this.requestRender();
      return;
    }
    this.onSelect(first?.object.userData.roomId ?? null);
  };

  private contextLost = (event: Event) => {
    event.preventDefault();
    this.onError("图形上下文已中断，请刷新页面重新载入模型。");
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.hoverFrame);
    this.resizeObserver.disconnect();
    this.controls.removeEventListener("change", this.requestRender);
    this.controls.dispose();
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.pointerDown,
    );
    this.host.ownerDocument.removeEventListener(
      "pointermove",
      this.pointerMove,
    );
    this.host.ownerDocument.removeEventListener("pointerup", this.pointerUp);
    this.host.ownerDocument.removeEventListener(
      "pointercancel",
      this.pointerCancel,
    );
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line)
        object.geometry.dispose();
      if (object instanceof CSS2DObject) object.element.remove();
    });
    for (const material of this.materials) material.dispose();
    this.fixtures.dispose();
    for (const texture of this.textures) texture.dispose();
    const gridMaterials = Array.isArray(this.grid.material)
      ? this.grid.material
      : [this.grid.material];
    gridMaterials.forEach((material) => material.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
    delete this.host.dataset.rendered;
  }
}
