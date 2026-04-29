declare module "three" {
  export class CanvasTexture {
    constructor(image: HTMLCanvasElement);
  }

  export class SpriteMaterial {
    constructor(parameters: { map: CanvasTexture; depthWrite?: boolean; transparent?: boolean });
  }

  export class Sprite {
    constructor(material?: SpriteMaterial);
    scale: { set: (x: number, y: number, z: number) => void };
    position: { set: (x: number, y: number, z: number) => void };
    clone: () => Sprite;
  }
}
