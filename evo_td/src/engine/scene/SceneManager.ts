import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight } from "@babylonjs/core";
import { NodeComponent } from "../components/NodeComponent";

/**
 * SceneManager: Thin bridge for Babylon.js scene/camera management.
 * - Sets up Babylon.js engine, scene, camera, and lighting.
 * - Exposes the root NodeComponent for parenting entities.
 * - No entity registration, no manual position/rotation updates.
 */
export class SceneManager {
    public readonly engine: Engine;
    public readonly scene: Scene;
    public readonly camera: ArcRotateCamera;
    public readonly rootNode: NodeComponent;

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);

        // Camera setup
        this.camera = new ArcRotateCamera(
            "mainCamera",
            Math.PI / 2,
            Math.PI / 3,
            20,
            new Vector3(0, 0, 0),
            this.scene
        );
        this.camera.attachControl(canvas, true);

        // Lighting
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
        hemiLight.intensity = 0.7;
        const dirLight = new DirectionalLight("dirLight", new Vector3(0.5, -1, 1), this.scene);
        dirLight.intensity = 0.5;

        // Root node for scene graph parenting
        this.rootNode = new NodeComponent(this.scene);
    }

    /**
     * Start the render loop
     */
    start() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    /**
     * Resize the engine on window resize
     */
    handleResize() {
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    /**
     * Get the root NodeComponent for parenting
     */
    getRootNode(): NodeComponent {
        return this.rootNode;
    }
}
