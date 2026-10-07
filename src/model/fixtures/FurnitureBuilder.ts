import * as THREE from "three";
import { defaults } from "../plan.ts";
import { furnitureSize, diningFurniture, bedroomAirConditioners, livingAirConditioner } from "../arrangements.ts";
import { sofaBody, sofaSupport } from "../furniture.ts";
import type { FixtureBuilderContext } from "./context.ts";

type BuilderContext = Pick<FixtureBuilderContext, "at" | "box" | "part" | "pipe" | "tagRoom"> & {
  materials: Pick<FixtureBuilderContext["materials"], "support" | "sofa" | "cushion" | "wood" | "ceramic" | "steel" | "dark" | "white" | "mirror" | "backdrop" | "chairMesh">;
};


/** Static furniture geometry. Placement remains in arrangements.ts. */
export class FurnitureBuilder {
  private readonly ctx: BuilderContext;
  constructor(ctx: BuilderContext) { this.ctx = ctx; }
  buildSofa(group: THREE.Group) {
    const { width, depth, height } = furnitureSize.sofa;
    this.ctx.part(group, sofaSupport, this.ctx.materials.support);
    this.ctx.part(group, sofaBody, this.ctx.materials.sofa);
    this.ctx.box(group, [width, height - 0.2, 0.2],
      [0, (height + 0.2) / 2, -depth / 2 + 0.1], this.ctx.materials.sofa, 0.06);
    for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) {
      this.ctx.box(group, [0.2, 0.36, depth], [x, 0.43, 0], this.ctx.materials.sofa, 0.05);
    }
    for (const x of [-0.5, 0.5]) {
      this.ctx.box(group, [0.96, 0.16, 0.65], [x, 0.43, 0.1], this.ctx.materials.cushion, 0.05);
      this.ctx.box(group, [0.95, 0.34, 0.12], [x, 0.62, -0.23], this.ctx.materials.cushion, 0.04);
    }
  }

  buildCoffeeTable(group: THREE.Group) {
    const { width, depth, height } = furnitureSize.coffeeTable;
    group.name = "living-light-walnut-coffee-table";
    const topThickness = 0.035;
    this.ctx.box(group, [width, topThickness, depth], [0, height - topThickness / 2, 0], this.ctx.materials.wood, 0.016);
    const legHeight = height - topThickness;
    for (const x of [-width / 2 + 0.10, width / 2 - 0.10]) {
      for (const z of [-depth / 2 + 0.10, depth / 2 - 0.10]) {
        this.ctx.box(group, [0.055, legHeight, 0.055], [x, legHeight / 2, z], this.ctx.materials.wood, 0.006);
      }
    }
    this.ctx.box(group, [width - 0.15, 0.022, depth - 0.16], [0, 0.12, 0], this.ctx.materials.wood, 0.009);
  }

  buildToilet(group: THREE.Group) {
    this.ctx.box(group, [0.27, 0.25, 0.37], [0, 0.125, 0.04], this.ctx.materials.ceramic, 0.06);
    this.ctx.box(group, [0.40, 0.73, 0.19], [0, 0.365, -0.24], this.ctx.materials.ceramic, 0.045);
    this.ctx.box(group, [0.075, 0.012, 0.04], [0, 0.735, -0.24], this.ctx.materials.steel, 0.005);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), this.ctx.materials.ceramic);
    bowl.scale.set(0.22, 0.15, 0.30);
    bowl.position.set(0, 0.31, 0.07);
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    group.add(bowl);
    const opening = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), this.ctx.materials.ceramic);
    opening.rotation.x = -Math.PI / 2;
    opening.scale.y = 1.35;
    opening.position.set(0, 0.463, 0.07);
    group.add(opening);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 32), this.ctx.materials.ceramic);
    seat.rotation.x = -Math.PI / 2;
    seat.scale.y = 1.35;
    seat.position.set(0, 0.467, 0.07);
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);
  }

  buildDining(furnishings: THREE.Group) {
    const { width, depth, center, chairs } = diningFurniture;
    const group = this.ctx.at(furnishings, center);
    group.name = "dining-table-with-four-chairs";
    this.ctx.box(group, [width, 0.075, depth], [0, 0.7375, 0], this.ctx.materials.wood, 0.035);
    for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) {
      for (const z of [-depth / 2 + 0.1, depth / 2 - 0.1]) {
        this.ctx.box(group, [0.06, 0.70, 0.06], [x, 0.35, z], this.ctx.materials.wood, 0.015);
      }
    }
    for (const placement of chairs) {
      const chair = new THREE.Group();
      chair.position.set(placement.x, 0, placement.z);
      chair.rotation.y = placement.rotation;
      group.add(chair);
      for (const x of [-0.17, 0.17]) {
        for (const z of [-0.17, 0.17]) {
          this.ctx.box(chair, [0.045, 0.425, 0.045], [x, 0.2125, z], this.ctx.materials.wood);
        }
      }
      this.ctx.box(chair, [0.44, 0.08, 0.44], [0, 0.46, 0], this.ctx.materials.wood, 0.035);
      for (const x of [-0.17, 0.17]) {
        this.ctx.box(chair, [0.045, 0.38, 0.045], [x, 0.615, -0.185], this.ctx.materials.wood);
      }
      this.ctx.box(chair, [0.44, 0.26, 0.065], [0, 0.755, -0.185], this.ctx.materials.wood, 0.025);
    }
    this.ctx.tagRoom(group, "living");
  }

  buildOfficeChair(group: THREE.Group) {
    for (let index = 0; index < 5; index++) {
      const spoke = new THREE.Group();
      spoke.rotation.y = index * Math.PI * 2 / 5;
      group.add(spoke);
      this.ctx.box(spoke, [0.30, 0.035, 0.045], [0.14, 0.12, 0], this.ctx.materials.support, 0.012);
      this.ctx.box(spoke, [0.028, 0.08, 0.045], [0.28, 0.08, 0], this.ctx.materials.support, 0.008);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.035, 16), this.ctx.materials.dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0.28, 0.04, 0);
      wheel.castShadow = true;
      spoke.add(wheel);
    }
    const lift = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.032, 0.27, 16), this.ctx.materials.steel);
    lift.position.y = 0.255;
    group.add(lift);
    this.ctx.box(group, [0.22, 0.045, 0.22], [0, 0.405, 0], this.ctx.materials.support, 0.01);
    this.ctx.box(group, [0.48, 0.075, 0.47], [0, 0.4575, 0.015], this.ctx.materials.dark, 0.035);
    this.ctx.pipe(group, [[0, 0.39, -0.1], [0, 0.56, -0.23], [0, 0.77, -0.265]], 0.025);
    const back = new THREE.Group();
    back.position.set(0, 0.78, -0.24);
    back.rotation.x = -0.12;
    group.add(back);
    for (const x of [-0.23, 0.23]) this.ctx.box(back, [0.035, 0.52, 0.035], [x, 0, 0], this.ctx.materials.support, 0.016);
    for (const y of [-0.25, 0.25]) this.ctx.box(back, [0.46, 0.035, 0.035], [0, y, 0], this.ctx.materials.support, 0.016);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.49), this.ctx.materials.chairMesh);
    mesh.position.z = 0.004;
    mesh.castShadow = mesh.receiveShadow = true;
    back.add(mesh);
    this.ctx.box(back, [0.34, 0.075, 0.055], [0, -0.15, 0.035], this.ctx.materials.dark, 0.025);
    this.ctx.box(back, [0.045, 0.20, 0.04], [0, 0.32, -0.015], this.ctx.materials.support, 0.015);
    this.ctx.box(back, [0.28, 0.14, 0.085], [0, 0.42, 0], this.ctx.materials.dark, 0.04);
    for (const x of [-0.25, 0.25]) {
      // One continuous profile joins the arm pad to its support. The foot
      // extends into the rounded seat edge instead of only touching its top.
      const profile = new THREE.Shape();
      profile.moveTo(-0.006, 0.435);
      profile.lineTo(0.036, 0.435);
      profile.lineTo(0.036, 0.602);
      profile.quadraticCurveTo(0.036, 0.632, 0.066, 0.632);
      profile.lineTo(0.182, 0.632);
      profile.quadraticCurveTo(0.2, 0.632, 0.2, 0.65);
      profile.quadraticCurveTo(0.2, 0.668, 0.182, 0.668);
      profile.lineTo(-0.062, 0.668);
      profile.quadraticCurveTo(-0.08, 0.668, -0.08, 0.65);
      profile.quadraticCurveTo(-0.08, 0.632, -0.062, 0.632);
      profile.lineTo(-0.036, 0.632);
      profile.quadraticCurveTo(-0.006, 0.632, -0.006, 0.602);
      profile.closePath();
      const geometry = new THREE.ExtrudeGeometry(profile, {
        depth: 0.052, steps: 1, curveSegments: 6,
        bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3,
      });
      geometry.translate(0, 0, -0.026);
      geometry.rotateY(-Math.PI / 2);
      const armrest = new THREE.Mesh(geometry, this.ctx.materials.dark);
      armrest.position.x = x;
      armrest.castShadow = armrest.receiveShadow = true;
      group.add(armrest);
    }
  }

  buildAirConditioners(furnishings: THREE.Group) {
    const units: { unit: THREE.Group; backdrop: THREE.Mesh }[] = [];
    for (const placement of bedroomAirConditioners) {
      const group = this.ctx.at(furnishings, placement.center, placement.rotation);
      group.name = `${placement.roomId}-wall-air-conditioner`;
      const unit = new THREE.Group();
      group.add(unit);
      this.ctx.box(unit, [0.86, 0.29, 0.21], [0, 0, 0], this.ctx.materials.white, 0.055);
      this.ctx.box(unit, [0.69, 0.055, 0.015], [0, -0.075, 0.103], this.ctx.materials.dark, 0.015);
      this.ctx.box(unit, [0.67, 0.013, 0.035], [0, -0.08, 0.117], this.ctx.materials.white, 0.005);
      this.ctx.box(unit, [0.04, 0.017, 0.005], [0.29, 0.025, 0.108], this.ctx.materials.mirror);
      const backdrop = this.ctx.box(group, [0.99, 1, defaults.wallThickness],
        [0, 0, -0.205], this.ctx.materials.backdrop);
      units.push({ unit, backdrop });
      this.ctx.tagRoom(group, placement.roomId);
    }
    const tower = this.ctx.at(furnishings, livingAirConditioner.center, livingAirConditioner.rotation);
    tower.name = "living-floor-air-conditioner";
    for (const [radius, height, y, material] of [
      [0.20, 0.08, 0.04, this.ctx.materials.support],
      [0.17, 1.7, 0.92, this.ctx.materials.white],
    ] as const) {
      const part = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), material);
      part.position.y = y;
      part.castShadow = true;
      part.receiveShadow = true;
      tower.add(part);
    }
    this.ctx.box(tower, [0.18, 0.95, 0.03], [0, 1.00, 0.155], this.ctx.materials.dark, 0.04);
    for (let index = 0; index < 10; index++) {
      this.ctx.box(tower, [0.15, 0.012, 0.022], [0, 0.65 + index * 0.075, 0.177], this.ctx.materials.white);
    }
    this.ctx.box(tower, [0.07, 0.04, 0.012], [0, 1.57, 0.165], this.ctx.materials.dark, 0.015);
    this.ctx.tagRoom(tower, "living");
    return units;
  }
}
