// Mock implementation of BabylonJS types and classes used in tests
export class Vector3 {
    constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
    add(otherVector: Vector3): Vector3 {
        return new Vector3(this.x + otherVector.x, this.y + otherVector.y, this.z + otherVector.z);
    }
    subtract(otherVector: Vector3): Vector3 {
        return new Vector3(this.x - otherVector.x, this.y - otherVector.y, this.z - otherVector.z);
    }
    multiply(scalar: number): Vector3 {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }
    normalize(): Vector3 {
        const len = this.length();
        if (len === 0) return new Vector3();
        return this.multiply(1 / len);
    }
    
    // Method to set all components at once
    set(x: number, y: number, z: number): Vector3 {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    
    // Method to set all components to the same value
    setAll(value: number): Vector3 {
        this.x = this.y = this.z = value;
        return this;
    }
    
    static Lerp(start: Vector3, end: Vector3, amount: number): Vector3 {
        const x = start.x + (end.x - start.x) * amount;
        const y = start.y + (end.y - start.y) * amount;
        const z = start.z + (end.z - start.z) * amount;
        return new Vector3(x, y, z);
    }
    
    static Distance(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

export class Color3 {
    constructor(public r: number = 0, public g: number = 0, public b: number = 0) {}
    
    static Black(): Color3 {
        return new Color3(0, 0, 0);
    }
    
    static White(): Color3 {
        return new Color3(1, 1, 1);
    }
    
    static Red(): Color3 {
        return new Color3(1, 0, 0);
    }
    
    static Green(): Color3 {
        return new Color3(0, 1, 0);
    }
    
    static Blue(): Color3 {
        return new Color3(0, 0, 1);
    }
    
    static Lerp(start: Color3, end: Color3, amount: number): Color3 {
        const r = start.r + (end.r - start.r) * amount;
        const g = start.g + (end.g - start.g) * amount;
        const b = start.b + (end.b - start.b) * amount;
        return new Color3(r, g, b);
    }
}

export class Color4 extends Color3 {
    constructor(r: number = 0, g: number = 0, b: number = 0, public a: number = 1) {
        super(r, g, b);
    }
}

export class Scene {
    public meshes: AbstractMesh[] = [];
    public materials: Material[] = [];
    public lights: Light[] = [];
    public activeCamera: Camera | null = null;
    public clearColor = new Color4(0.2, 0.2, 0.3, 1.0);
    
    constructor(public engine: Engine) {
        engine.scenes.push(this);
    }
    
    render(): boolean {
        return true;
    }
    
    getEngine(): Engine {
        return this.engine;
    }
    
    dispose(): void {
        const index = this.engine.scenes.indexOf(this);
        if (index !== -1) {
            this.engine.scenes.splice(index, 1);
        }
    }
    
    registerBeforeRender(_func: () => void): void {
        // Mock implementation
    }
}

export class Engine {
    public readonly scenes: Scene[] = [];
    private _canvas: HTMLCanvasElement;
    private lastFrameTime: number = 0;
    
    constructor(canvas?: HTMLCanvasElement | null) {
        // Allow null canvas for testing
        this._canvas = canvas || document.createElement('canvas');
    }
    
    getRenderingCanvas(): HTMLCanvasElement {
        return this._canvas;
    }
    
    getDeltaTime(): number {
        return 16; // Fixed 16ms delta for tests
    }
    
    runRenderLoop(_callback: () => void): void {
        // Mock implementation
    }
    
    resize(): void {
        // Mock implementation
    }
}

export class AbstractMesh {
    public position: Vector3;
    public rotation: Vector3;
    public scaling: Vector3;
    public parent: AbstractMesh | null = null;
    public isVisible = true;
    public isPickable = true;
    public material: Material | null = null;
    
    constructor(public name: string, public scene?: Scene) {
        // Create new instances to avoid reference issues
        this.position = new Vector3(0, 0, 0);
        this.rotation = new Vector3(0, 0, 0);
        this.scaling = new Vector3(1, 1, 1);
        
        if (scene) {
            scene.meshes.push(this);
        }
    }
    
    // Helper method to update position
    setPosition(x: number, y: number, z: number): void {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
    }
    
    // Helper method to update rotation
    setRotation(x: number, y: number, z: number): void {
        this.rotation.x = x;
        this.rotation.y = y;
        this.rotation.z = z;
    }
    
    dispose(): void {
        if (this.scene) {
            const index = this.scene.meshes.indexOf(this);
            if (index !== -1) {
                this.scene.meshes.splice(index, 1);
            }
        }
    }
}

export class Mesh extends AbstractMesh {
    constructor(name: string, scene?: Scene) {
        super(name, scene);
    }
}

export class MeshBuilder {
    static CreateBox(name: string, _options: any, scene?: Scene): Mesh {
        return new Mesh(name, scene);
    }
    
    static CreateSphere(name: string, _options: any, scene?: Scene): Mesh {
        return new Mesh(name, scene);
    }
    
    static CreateGround(name: string, _options: any, scene?: Scene): Mesh {
        return new Mesh(name, scene);
    }
    
    static CreateLines(name: string, _options: any, scene?: Scene): Mesh {
        return new Mesh(name, scene);
    }
}

export class Material {
    public diffuseColor: Color3 = new Color3(1, 1, 1);
    public specularColor: Color3 = new Color3(1, 1, 1);
    public emissiveColor: Color3 = new Color3(0, 0, 0);
    public alpha: number = 1;
    public wireframe: boolean = false;
    
    constructor(public name: string, public scene?: Scene) {
        if (scene) {
            scene.materials.push(this);
        }
    }
    
    dispose(): void {
        if (this.scene) {
            const index = this.scene.materials.indexOf(this);
            if (index !== -1) {
                this.scene.materials.splice(index, 1);
            }
        }
    }
}

export class StandardMaterial extends Material {
    constructor(name: string, scene?: Scene) {
        super(name, scene);
    }
}

export class Light {
    public intensity = 1;
    public diffuse = new Color3(1, 1, 1);
    public specular = new Color3(1, 1, 1);
    
    constructor(public name: string, public scene?: Scene) {
        if (scene) {
            scene.lights.push(this);
        }
    }
    
    dispose(): void {
        if (this.scene) {
            const index = this.scene.lights.indexOf(this);
            if (index !== -1) {
                this.scene.lights.splice(index, 1);
            }
        }
    }
}

export class DirectionalLight extends Light {
    constructor(name: string, public direction: Vector3, scene?: Scene) {
        super(name, scene);
    }
}

export class HemisphericLight extends Light {
    constructor(name: string, public direction: Vector3, scene?: Scene) {
        super(name, scene);
    }
}

export class PointLight extends Light {
    public range = 100;
    
    constructor(name: string, public position: Vector3, scene?: Scene) {
        super(name, scene);
    }
}

export class SpotLight extends Light {
    public angle = Math.PI / 4;
    public exponent = 2;
    
    constructor(name: string, public position: Vector3, public direction: Vector3, scene?: Scene) {
        super(name, scene);
    }
}

export class Camera {
    public position = new Vector3(0, 0, 0);
    public target = new Vector3(0, 0, 1);
    
    constructor(public name: string, scene?: Scene) {
        if (scene) {
            scene.activeCamera = this;
        }
    }
    
    attachControl(_element: HTMLElement, _noPreventDefault?: boolean): void {
        // Mock implementation
    }
}

export class ArcRotateCamera extends Camera {
    constructor(name: string, public alpha: number, public beta: number, public radius: number, public target: Vector3, scene?: Scene) {
        super(name, scene);
        this.position = new Vector3(
            radius * Math.cos(alpha) * Math.sin(beta),
            radius * Math.cos(beta),
            radius * Math.sin(alpha) * Math.sin(beta)
        );
    }
}
