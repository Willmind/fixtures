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
import { MeshPickIndex } from "./MeshPickIndex";
import { RenderProfiler } from "./RenderProfiler";
import { animateFixtures, toggleFixture } from "./fixtures/interactions";
import { fixtureAppearanceChanged, viewOptionsChanged } from "./options";
import { OnDemandFrames } from "./OnDemandFrames";
import { ShadowUpdates } from "./ShadowUpdates";
import type { ViewOptions } from "./options";
export type { ViewOptions } from "./options";
import type { BalconyId } from "./arrangements";
import { bathroomFittings, previewPalette } from "./arrangements";
import { squatFloorHole } from "./squatToilet";
import { applySurfaceUVs, createTileSurface, floorFinish, wallTileSides } from "./finishes";
import { drainageZones, drainageElevation, floorDrainSize, floorElevation } from "./drainage";
import { createDrainageFloor } from "./drainageGeometry";
import { bayWindowFor, bayPortal, createBayWindow } from "./bayWindows";

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
  private drainageOverlay = new THREE.Group();
  private fixtures = new HomeFixtures();
  private floors: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  >[] = [];
  private squatFloorCover?: THREE.Mesh;
  private grid: THREE.GridHelper;
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private resizeObserver: ResizeObserver;
  private themeObserver: MutationObserver;
  private renderLoop: OnDemandFrames;
  private shadows = new ShadowUpdates();
  private disposed = false;
  private cameraInteracting = false;
  private fixturesAnimating = false;
  private options: ViewOptions;
  private raycaster = new THREE.Raycaster();
  private pickIndex = new MeshPickIndex();
  private profiler?: RenderProfiler;
  private hoverFrame = 0;
  private hoverPoint?: { clientX: number; clientY: number };
  private selectionGesture = new SelectionGesture();
  private roomLabelGesture = new SelectionGesture(10);
  private activeRoomLabel?: { element: HTMLButtonElement; roomId: string; pointerId: number };
  private labels: Map<string, HTMLElement> = new Map();
  private roomOutlines = new Map<string, THREE.LineLoop>();
  private wallMaterial: THREE.MeshStandardMaterial;
  private wallTileMaterial: THREE.MeshStandardMaterial;
  private skirtingMaterial: THREE.MeshStandardMaterial;
  private edgeMaterial: THREE.LineBasicMaterial;
  private frameMaterial: THREE.MeshStandardMaterial;
  private glassMaterial: THREE.MeshStandardMaterial;
  private skyLight = new THREE.HemisphereLight(0xeaf5ff, 0xb6aaa0, 2.5);
  private sun = new THREE.DirectionalLight(0xfff6e8, 3.1);
  private groundMaterial: THREE.MeshStandardMaterial;

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
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "毛坯房三维模型：拖动旋转，滚轮缩放，点击房间名称选择房间，点击物品进行操作",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.tabIndex = 0;
    this.host.appendChild(this.renderer.domElement);
    this.renderLoop = new OnDemandFrames(this.render, {
      request: (callback) => requestAnimationFrame(callback),
      cancel: (id) => cancelAnimationFrame(id),
    }, !this.host.ownerDocument.hidden);
    this.labelRenderer.domElement.className = "scene-labels";
    this.labelRenderer.domElement.addEventListener("click", this.roomLabelClick);
    this.labelRenderer.domElement.addEventListener("pointerdown", this.roomLabelPointerDown);
    this.labelRenderer.domElement.addEventListener("pointermove", this.roomLabelPointerMove);
    this.labelRenderer.domElement.addEventListener("pointerup", this.roomLabelPointerUp);
    this.labelRenderer.domElement.addEventListener("pointercancel", this.roomLabelPointerCancel);
    this.labelRenderer.domElement.addEventListener("lostpointercapture", this.roomLabelPointerCancel);
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
    this.controls.addEventListener("start", this.cameraInteractionStart);
    this.controls.addEventListener("end", this.cameraInteractionEnd);
    this.controls.listenToKeyEvents(this.renderer.domElement);

    this.wallMaterial = this.material({
      color: previewPalette.wall,
      roughness: 0.96,
    });
    const wallTiles = createTileSurface("white", true);
    this.wallTileMaterial = this.material({ color: "#ffffff", ...wallTiles });
    this.skirtingMaterial = this.material({ color: "#fafafa", roughness: 0.55 });
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

    this.scene.add(this.skyLight);
    const sun = this.sun;
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

    this.groundMaterial = this.material({ color: "#e6ecec", roughness: 1 });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      this.groundMaterial,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.19;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.grid = new THREE.GridHelper(100, 100, 0xc5cfce, 0xd4dcdb);
    this.grid.position.y = -0.18;
    if (new URLSearchParams(window.location.search).get("debug") === "performance") {
      this.profiler = new RenderProfiler();
      window.__fixturesPerformance = this.profiler;
      // Include shadow/mirror passes in the counters, not just the final main pass.
      this.renderer.info.autoReset = false;
    }
    this.scene.add(this.grid);
    this.scene.add(this.architecture, this.labelGroup, this.dimensions, this.fixtures.group);
    this.buildFloors();
    this.buildDrainage();
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
    this.host.ownerDocument.addEventListener("visibilitychange", this.visibilityChanged);
    this.themeObserver = new MutationObserver(() => {
      this.applyCanvasTheme();
      this.fixtures.invalidateReflections();
      this.requestRender();
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
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
    const outlineMaterial = new THREE.LineBasicMaterial({ color: "#007aff", toneMapped: false, depthWrite: false });
    this.materials.add(outlineMaterial);
    for (const surface of Object.values(surfaces)) this.textures.add(surface.map).add(surface.bumpMap);
    for (const room of rooms) {
      const zones = drainageZones.filter(({ roomId }) => roomId === room.id);
      const shape = new THREE.Shape();
      room.polygon.forEach(([x, z], i) => {
        if (i === 0) shape.moveTo(x - modelCenter[0], -(z - modelCenter[1]));
        else shape.lineTo(x - modelCenter[0], -(z - modelCenter[1]));
      });
      shape.closePath();
      const squat = bathroomFittings.find((fitting) => fitting.roomId === room.id && fitting.toilet.kind === "squat");
      const hole = squat && squatFloorHole(squat.toilet.center, squat.toilet.rotation);
      if (hole) shape.holes.push(hole);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: zones.length ? 0.08 : 0.16,
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
      for (const zone of zones) {
        const hasSquat = squat && squat.toilet.center[1] > zone.bounds.north && squat.toilet.center[1] < zone.bounds.south;
        const top = new THREE.Mesh(createDrainageFloor(zone, hasSquat && hole ? [hole] : []), material);
        top.name = `${zone.id}-sloped-floor`;
        top.userData = { roomId: room.id, baseColor: color };
        top.receiveShadow = true;
        this.floors.push(top);
        this.scene.add(top);
      }
      if (hole) {
        // Restore a continuous tiled floor when furniture is hidden in shell view.
        const coverGeometry = new THREE.ExtrudeGeometry(new THREE.Shape(hole.getPoints()), {
          depth: 0.16, bevelEnabled: false,
        });
        coverGeometry.rotateX(-Math.PI / 2); coverGeometry.translate(0, -0.16, 0);
        const points = coverGeometry.getAttribute("position");
        for (let i = 0; i < points.count; i++) {
          points.setY(i, points.getY(i) + floorElevation(room.id,
            [points.getX(i) + modelCenter[0], points.getZ(i) + modelCenter[1]]));
        }
        coverGeometry.computeVertexNormals();
        applySurfaceUVs(coverGeometry);
        const cover = new THREE.Mesh(coverGeometry, material);
        cover.userData = { roomId: room.id, baseColor: color };
        cover.receiveShadow = true;
        this.floors.push(cover);
        this.scene.add(cover);
        this.squatFloorCover = cover;
      }
      // Inset the boundary past the wall thickness so it remains visible on
      // the floor, without tinting the tiles or drawing through furniture.
      const vertices = room.polygon.map(([x, z], i, points) => {
        const previous = points[(i + points.length - 1) % points.length];
        const next = points[(i + 1) % points.length];
        const incoming = new THREE.Vector2(x - previous[0], z - previous[1]).normalize();
        const outgoing = new THREE.Vector2(next[0] - x, next[1] - z).normalize();
        const inset = 0.14 / (1 + incoming.dot(outgoing));
        return this.position([x - (incoming.y + outgoing.y) * inset,
          z + (incoming.x + outgoing.x) * inset], 0.018);
      });
      const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices), outlineMaterial);
      outline.name = `${room.id}-selection-outline`;
      outline.visible = false;
      this.scene.add(outline);
      this.roomOutlines.set(room.id, outline);
      const element = document.createElement("button");
      element.type = "button";
      element.className = "room-label";
      element.textContent = room.name;
      element.dataset.roomId = room.id;
      element.setAttribute("aria-label", `选择${room.name}`);
      element.setAttribute("aria-pressed", "false");
      const label = new CSS2DObject(element);
      label.position.copy(this.position(room.label, 0.1));
      this.labelGroup.add(label);
      this.labels.set(room.id, element);
    }
  }

  private buildDrainage() {
    const metal = this.material({ color: "#899397", roughness: 0.35, metalness: 0.65 });
    const recess = this.material({ color: "#222b30", roughness: 0.9 });
    const arrowColor = 0x0099d8;
    for (const zone of drainageZones) {
      const drain = new THREE.Group();
      drain.name = `${zone.id}-floor-drain${zone.candidate ? "-candidate" : ""}`;
      drain.position.copy(this.position(zone.drain, drainageElevation(zone, zone.drain)));
      this.scene.add(drain);
      const size = floorDrainSize;
      this.box(drain, size - 0.016, 0.004, size - 0.016, 0, -0.008, 0, recess);
      for (const side of [-1, 1]) {
        this.box(drain, size, 0.004, 0.012, 0, 0.001, side * (size / 2 - 0.006), metal);
        this.box(drain, 0.012, 0.004, size - 0.024, side * (size / 2 - 0.006), 0.001, 0, metal);
      }
      for (let i = 0; i < 8; i++) {
        this.box(drain, size - 0.024, 0.003, 0.006, 0, 0.0005, -0.056 + i * 0.016, metal);
      }
      const { west, east, north, south } = zone.bounds;
      for (const point of [[west + 0.28, south - 0.25], [east - 0.28, north + 0.25], [(west + east) / 2, (north + south) / 2]] as Point[]) {
        const from = this.position(point, drainageElevation(zone, point) + 0.025);
        const to = this.position(zone.drain, drainageElevation(zone, zone.drain) + 0.025);
        const direction = to.clone().sub(from), distance = direction.length();
        if (distance < 0.3) continue;
        const arrow = new THREE.ArrowHelper(direction.normalize(), from, Math.min(0.50, distance - 0.12), arrowColor, 0.085, 0.05);
        arrow.userData.roomId = zone.roomId;
        this.drainageOverlay.add(arrow);
      }
      const text = document.createElement("span");
      text.className = "drainage-label";
      text.textContent = `${zone.label} · ${(zone.slope * 100).toFixed(zone.slope === 0.015 ? 1 : 0)}%`;
      const label = new CSS2DObject(text);
      label.position.copy(this.position([zone.drain[0], zone.drain[1] - 0.18], 0.10));
      label.userData.roomId = zone.roomId;
      this.drainageOverlay.add(label);
    }
    this.scene.add(this.drainageOverlay);
  }

  private clearGeometry(group: THREE.Group) {
    group.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Mesh || object instanceof THREE.Line)
        object.geometry.dispose();
    });
    group.clear();
  }

  private buildWalls() {
    this.pickIndex.invalidate();
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
      const bay = bayWindowFor(wall.id);
      const tiled = wallTileSides(wall);
      const wallMaterials = [this.wallMaterial, this.wallMaterial, this.wallMaterial, this.wallMaterial,
        tiled.positive ? this.wallTileMaterial : this.wallMaterial,
        tiled.negative ? this.wallTileMaterial : this.wallMaterial];
      for (const piece of splitWall(
        length,
        Math.min(wall.height ?? height, height),
        bay ? wall.openings?.map((opening) => opening.kind === "window" ? bayPortal(bay, opening) : opening) : wall.openings,
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
        if (piece.bottom === 0) {
          const midpoint = (piece.start + piece.end) / 2;
          for (const side of [-1, 1]) {
            // Put the strip only on room-facing surfaces, and use the same
            // wall pieces so it stops at doors but continues below windows.
            const offset = thickness / 2 + 0.02;
            const x = wall.from[0] + dx / length * midpoint - side * dz / length * offset;
            const z = wall.from[1] + dz / length * midpoint + side * dx / length * offset;
            const insideRoom = rooms.some((room) => {
              let inside = false;
              for (let i = 0, j = room.polygon.length - 1; i < room.polygon.length; j = i++) {
                const [xi, zi] = room.polygon[i], [xj, zj] = room.polygon[j];
                if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
              }
              return inside;
            });
            if (!insideRoom) continue;
            const skirtingHeight = Math.min(0.08, piece.top);
            const strip = this.box(group, piece.end - piece.start, skirtingHeight, 0.012,
              midpoint, skirtingHeight / 2, side * (thickness / 2 + 0.007), this.skirtingMaterial);
            strip.name = `${wall.id}-white-skirting-${side}`;
          }
        }
      }
      // Operable window frames and panes are owned by HomeFixtures so their
      // motion survives wall rebuilding when toggling cutaway or wall height.
      if (bay) group.add(createBayWindow(wall, bay, height, {
        wall: this.wallMaterial, sill: this.skirtingMaterial, railing: this.frameMaterial,
      }));
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

  private applyCanvasTheme() {
    const night = this.options.lightingMode === "night";
    const dark = night || document.documentElement.dataset.theme === "dark";
    this.groundMaterial.color.set(night ? "#202737" : dark ? "#323840" : "#e6ecec");
    const materials = Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material];
    for (const material of materials) {
      material.color.set(dark ? "#718095" : "#ffffff");
      material.transparent = true;
      material.opacity = dark ? 0.25 : 0.45;
      material.depthWrite = false;
      material.toneMapped = false;
    }
  }

  private applyVisibility() {
    this.fixtures.update(this.options);
    const night = this.options.lightingMode === "night";
    this.skyLight.color.set(night ? "#a8bcf0" : "#eaf5ff");
    this.skyLight.groundColor.set(night ? "#504c61" : "#b6aaa0");
    this.skyLight.intensity = night ? (this.options.view === "plan" ? 0.85 : 0.35) : 2.5;
    this.sun.color.set(night ? "#a0b6ed" : "#fff6e8");
    this.sun.intensity = night ? 0.18 : 3.1;
    this.sun.castShadow = !night;
    this.applyCanvasTheme();
    const pixelRatio = Math.min(window.devicePixelRatio, night ? 1.25 : 2);
    if (this.renderer.getPixelRatio() !== pixelRatio) this.renderer.setPixelRatio(pixelRatio);
    this.host.dataset.lighting = this.options.lightingMode;
    if (this.squatFloorCover) this.squatFloorCover.visible = this.options.layout === "empty";
    for (const { roomId, group } of this.balconyRailings) {
      group.visible = this.options.balconyModes[roomId] === "original";
    }
    this.labelGroup.visible = this.options.labels;
    this.dimensions.visible = this.options.dimensions;
    this.grid.visible = this.options.grid;
    this.drainageOverlay.visible = this.options.drainage;
    for (const object of this.drainageOverlay.children) {
      object.visible = !this.options.selected || object.userData.roomId === this.options.selected;
    }
    for (const [roomId, label] of this.labels) {
      const selected = roomId === this.options.selected;
      label.classList.toggle("is-selected", selected);
      label.setAttribute("aria-pressed", String(selected));
      this.roomOutlines.get(roomId)!.visible = selected;
    }
  }

  update(options: ViewOptions) {
    const previous = this.options;
    if (!viewOptionsChanged(previous, options)) return;
    this.options = options;
    const wallsChanged = previous.cutaway !== options.cutaway || previous.wallHeight !== options.wallHeight;
    this.profiler?.noteUpdate(wallsChanged);
    if (wallsChanged) this.buildWalls();
    this.applyVisibility();
    if (fixtureAppearanceChanged(previous, options)) this.shadows.invalidate();
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
      `毛坯房${plan ? "俯视" : "三维"}模型：拖动${plan ? "平移" : "旋转"}，滚轮缩放，点击房间名称选择房间，点击物品进行操作`,
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
    this.renderLoop.request();
  };

  private visibilityChanged = () => {
    const visible = !this.host.ownerDocument.hidden;
    if (!visible) {
      cancelAnimationFrame(this.hoverFrame);
      this.hoverFrame = 0;
      this.hoverPoint = undefined;
      this.cameraInteracting = false;
      this.renderer.domElement.style.cursor = "";
    } else {
      this.fixtures.invalidateReflections();
    }
    this.renderLoop.setVisible(visible);
  };

  private cameraInteractionStart = () => {
    this.cameraInteracting = true;
    this.requestRender();
  };
  private cameraInteractionEnd = () => {
    this.cameraInteracting = false;
    this.requestRender();
  };

  private render = (now: number) => {
    if (this.disposed) return;
    const started = this.profiler ? performance.now() : 0;
    const renderFrame = this.renderer.info.render.frame;
    if (this.profiler) this.renderer.info.reset();
    const cameraMoved = this.controls.update();
    const fixturesMoving = animateFixtures(this.fixtures, now);
    // A finished door/drawer must appear in its final position even if it
    // stopped inside the reflection throttle interval.
    if (this.fixturesAnimating && !fixturesMoving) this.fixtures.invalidateReflections();
    this.fixturesAnimating = fixturesMoving;
    this.renderer.shadowMap.needsUpdate = this.shadows.consume(fixturesMoving);
    this.fixtures.prepareReflections(now, this.cameraInteracting || cameraMoved);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    if (this.profiler) {
      const { render, memory, programs } = this.renderer.info;
      this.profiler.record({
        frameWorkMs: performance.now() - started, drawCalls: render.calls,
        triangles: render.triangles, renderPasses: render.frame - renderFrame,
        geometries: memory.geometries, textures: memory.textures, programs: programs?.length ?? 0,
        lighting: this.options.lightingMode, moving: this.cameraInteracting || cameraMoved || fixturesMoving,
      });
    }
    if (fixturesMoving || this.fixtures.reflectionsPending) this.requestRender();
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
    if (this.host.ownerDocument.hidden) return;
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
    const hits = this.raycaster.intersectObjects(
      this.pickIndex.visibleMeshes([...this.floors, this.architecture, this.fixtures.group]), false,
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
    if (!selected || event.target !== this.renderer.domElement) return;
    const first = this.pickFirst(event);
    if (first && this.fixtures.isOperable(first.object) && event.pointerType !== "touch") {
      this.renderer.domElement.style.cursor = "pointer";
    }
    const now = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (first && toggleFixture(this.fixtures, first.object, now, reducedMotion)) {
      this.shadows.invalidate();
      this.fixtures.invalidateReflections();
      this.requestRender();
      return;
    }
  };

  private roomLabelClick = (event: MouseEvent) => {
    // Pointer activation happens on release; retain native keyboard/AT clicks
    // without letting the subsequent browser click toggle the room twice.
    if (event.detail > 0 || (event instanceof PointerEvent && event.pointerType)) return;
    if (!this.options.labels || !(event.target instanceof Element)) return;
    const label = event.target.closest<HTMLButtonElement>("button.room-label[data-room-id]");
    const roomId = label?.dataset.roomId;
    if (!label || !this.labelRenderer.domElement.contains(label) || !rooms.some(({ id }) => id === roomId)) return;
    this.activateRoomLabel(roomId!);
  };

  private activateRoomLabel(roomId: string) {
    const selected = this.options.selected === roomId ? null : roomId;
    // Immediate feedback also keeps quick successive taps from reading the
    // previous selection while React is committing the updated URL/state.
    this.options = { ...this.options, selected };
    for (const [id, label] of this.labels) {
      label.classList.toggle("is-selected", id === selected);
      label.setAttribute("aria-pressed", String(id === selected));
      this.roomOutlines.get(id)!.visible = id === selected;
    }
    this.requestRender();
    this.onSelect(selected);
  }

  private roomLabelPointerDown = (event: PointerEvent) => {
    if (this.activeRoomLabel) {
      // A second finger cancels activation instead of selecting another room.
      this.roomLabelPointerCancel({ pointerId: this.activeRoomLabel.pointerId } as PointerEvent);
      return;
    }
    if (!this.options.labels || event.button !== 0 || !event.isPrimary || !(event.target instanceof Element)) return;
    const label = event.target.closest<HTMLButtonElement>("button.room-label[data-room-id]");
    const roomId = label?.dataset.roomId;
    if (!label || !roomId || !this.labels.has(roomId)) return;
    this.roomLabelGesture.start(event);
    this.activeRoomLabel = { element: label, roomId, pointerId: event.pointerId };
    // Follow the originally pressed button even if damping moves its screen
    // position between press and release.
    label.setPointerCapture(event.pointerId);
  };

  private roomLabelPointerMove = (event: PointerEvent) => {
    this.roomLabelGesture.move(event);
  };

  private roomLabelPointerUp = (event: PointerEvent) => {
    const active = this.activeRoomLabel;
    if (!active || active.pointerId !== event.pointerId) return;
    const activate = this.roomLabelGesture.end(event);
    this.activeRoomLabel = undefined;
    if (active.element.hasPointerCapture(event.pointerId)) active.element.releasePointerCapture(event.pointerId);
    if (activate && this.options.labels) this.activateRoomLabel(active.roomId);
  };

  private roomLabelPointerCancel = (event: PointerEvent) => {
    const active = this.activeRoomLabel;
    if (!active || active.pointerId !== event.pointerId) return;
    this.roomLabelGesture.cancel(event.pointerId);
    this.activeRoomLabel = undefined;
    if (active.element.hasPointerCapture(event.pointerId)) active.element.releasePointerCapture(event.pointerId);
  };

  private contextLost = (event: Event) => {
    event.preventDefault();
    this.renderLoop.dispose();
    cancelAnimationFrame(this.hoverFrame);
    this.hoverFrame = 0;
    this.onError("图形上下文已中断，请刷新页面重新载入模型。");
  };

  dispose() {
    this.disposed = true;
    this.renderLoop.dispose();
    cancelAnimationFrame(this.hoverFrame);
    this.resizeObserver.disconnect();
    this.themeObserver.disconnect();
    this.host.ownerDocument.removeEventListener("visibilitychange", this.visibilityChanged);
    this.controls.removeEventListener("change", this.requestRender);
    this.controls.removeEventListener("start", this.cameraInteractionStart);
    this.controls.removeEventListener("end", this.cameraInteractionEnd);
    this.controls.dispose();
    this.labelRenderer.domElement.removeEventListener("click", this.roomLabelClick);
    this.labelRenderer.domElement.removeEventListener("pointerdown", this.roomLabelPointerDown);
    this.labelRenderer.domElement.removeEventListener("pointermove", this.roomLabelPointerMove);
    this.labelRenderer.domElement.removeEventListener("pointerup", this.roomLabelPointerUp);
    this.labelRenderer.domElement.removeEventListener("pointercancel", this.roomLabelPointerCancel);
    this.labelRenderer.domElement.removeEventListener("lostpointercapture", this.roomLabelPointerCancel);
    if (this.activeRoomLabel) this.roomLabelPointerCancel({ pointerId: this.activeRoomLabel.pointerId } as PointerEvent);
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
    const geometries = new Set<THREE.BufferGeometry>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Mesh || object instanceof THREE.Line)
        geometries.add(object.geometry);
      if (object instanceof CSS2DObject) object.element.remove();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.fixtures.dispose();
    this.pickIndex.invalidate();
    if (this.profiler && window.__fixturesPerformance === this.profiler) delete window.__fixturesPerformance;
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
