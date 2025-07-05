// Minimal ECS App: Node/Event System Test
import { SceneManager } from "./engine/scene/SceneManager";
import { GameNodeObject } from "./engine/core/GameNodeObject";
import { RenderComponent } from "./engine/components/RenderComponent";
import { Scene, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";

function setupGameCanvasAndScene(id = "gameCanvas") {
    let canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = id;
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.display = "block";
        document.body.appendChild(canvas);
    }
    const sceneManager = new SceneManager(canvas);
    sceneManager.handleResize();
    sceneManager.start();
    const rootNode = sceneManager.getRootNode();
    return { canvas, sceneManager, rootNode };
}

function populateTestEntities(sceneManager: SceneManager, rootNode: any) {
    // RenderComponent subclass for a colored sphere
    class TestSphereRenderComponent extends RenderComponent {
        private color: string;
        constructor(scene: Scene, color: string = "#44aaff") {
            super(scene, {});
            this.color = color;
        }
        protected createVisual(): void {
            this.mesh = MeshBuilder.CreateSphere("test_sphere", { diameter: 1 }, this.scene);
            this.mesh.position.set(0, 0, 0);
            // Parent the mesh to the ECS node's transform
            this.mesh.parent = (this._gameObject as any).node.getTransformNode();
            const mat = new StandardMaterial("test_sphere_mat", this.scene);
            mat.diffuseColor = Color3.FromHexString(this.color);
            this.mesh.material = mat;
        }
        protected updateVisual(): void {
            // No-op for now
        }
    }

    // Create test entities (GameNodeObject)
    class TestEntity extends GameNodeObject {
        constructor(name: string, scene: Scene, parentNode?: any, color?: string) {
            super("test-entity", scene, parentNode);
            // Ensure node is initialized before accessing its transform node
            if (this.node && typeof this.node.getTransformNode === "function") {
                this.node.getTransformNode().name = name;
            } else { console.log('test entity node not available')}
            const render = new TestSphereRenderComponent(scene, color);
            this.addComponent(render);
        }
    }

    const parent = new TestEntity("parent", sceneManager.scene, rootNode, "#44aaff"); // set color to rgb(38, 204, 80) which is a light blue
    const child = new TestEntity("child", sceneManager.scene, parent.node, "#aaff44"); // set color to #aaff44 which is a light green
    const grandchild = new TestEntity("grandchild", sceneManager.scene, child.node, "#ff44aa"); // set color to #ff44aa which is a light red

    // Log node names and world positions
    console.log("[Debug] Parent node:", parent.node.getTransformNode().name, parent.node.getWorldPosition());
    console.log("[Debug] Child node:", child.node.getTransformNode().name, child.node.getWorldPosition());
    console.log("[Debug] Grandchild node:", grandchild.node.getTransformNode().name, grandchild.node.getWorldPosition());

    // Set positions
    parent.node.setLocalPosition(0, 0, 0);
    child.node.setLocalPosition(2, 0, 0);
    grandchild.node.setLocalPosition(1, 1, 0);

    // Log again after setting positions
    console.log("[Debug] Parent node (after set):", parent.node.getTransformNode().name, parent.node.getWorldPosition());
    console.log("[Debug] Child node (after set):", child.node.getTransformNode().name, child.node.getWorldPosition());
    console.log("[Debug] Grandchild node (after set):", grandchild.node.getTransformNode().name, grandchild.node.getWorldPosition());

    // Add event listeners at different levels
    rootNode.addEventListener("test:event", (evt) => {
        console.log("[Root] Event phase:", evt.phase, "type:", evt.type, "payload:", evt.payload);
    }, { capture: true });

    parent.node.addEventListener("test:event", (evt) => {
        console.log("[Parent] Event phase:", evt.phase, "type:", evt.type, "payload:", evt.payload);
    });

    child.node.addEventListener("test:event", (evt) => {
        console.log("[Child] Event phase:", evt.phase, "type:", evt.type, "payload:", evt.payload);
    });

    grandchild.node.addEventListener("test:event", (evt) => {
        console.log("[Grandchild] Event phase:", evt.phase, "type:", evt.type, "payload:", evt.payload);
    });

    // Emit event from grandchild (should propagate up, log all phases)
    setTimeout(() => {
        grandchild.node.emit("test:event", { message: "Hello from grandchild!" });
    }, 1000);

    // Emit event from parent (should propagate up)
    setTimeout(() => {
        parent.node.emit("test:event", { message: "Hello from parent!" });
    }, 2000);
}

// Entry point for node/event system test
window.addEventListener("DOMContentLoaded", () => {
    const { canvas, sceneManager, rootNode } = setupGameCanvasAndScene();
    populateTestEntities(sceneManager, rootNode);
});
