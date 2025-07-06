// Minimal ECS App: Node/Event System Test with Movement
import { SceneManager } from "./engine/scene/SceneManager";
import { GameNodeObject } from "./engine/core/GameNodeObject";
import { RenderComponent } from "./engine/components/RenderComponent";
import { NodeComponent } from "./engine/components/NodeComponent";
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

import { EventStack, EventCategory } from "./engine/core/EventStack";
import { EventLogUI } from "./game/ui/EventLogUI";
import { UIManager } from "./game/ui/UIManager";

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

// Improved RenderComponent that properly parents to NodeComponent
class TestSphereRenderComponent extends RenderComponent {
    private color: string;
    
    constructor(scene: Scene, color: string = "#44aaff") {
        super(scene, {});
        this.color = color;
    }
    
    protected createVisual(): void {
        this.mesh = MeshBuilder.CreateSphere("test_sphere", { diameter: 1 }, this.scene);
        
        // Parent mesh to NodeComponent's transform
        const nodeComponent = this._gameObject?.getComponent<NodeComponent>('Node');
        if (nodeComponent) {
            this.mesh.parent = nodeComponent.getTransformNode();
        }
        
        const mat = new StandardMaterial("test_sphere_mat", this.scene);
        mat.diffuseColor = Color3.FromHexString(this.color);
        this.mesh.material = mat;
    }
    
    protected updateVisual(): void {
        // No manual updates needed - hierarchy handles it
    }
    
    protected updatePosition(): void {
        // Override to prevent base class position updates
    }
}

// Test entity with movement logic
class TestEntity extends GameNodeObject {
    constructor(name: string, scene: Scene, parentNode?: any, color?: string) {
        super("test-entity", scene, parentNode);
        if (this.node && typeof this.node.getTransformNode === "function") {
            this.node.getTransformNode().name = name;
        }
        const render = new TestSphereRenderComponent(scene, color);
        this.addComponent(render);
    }
}

function populateTestEntities(sceneManager: SceneManager, rootNode: any) {
    // Create hierarchy
    const parent = new TestEntity("parent", sceneManager.scene, rootNode, "#ff0000"); // Red
    const child = new TestEntity("child", sceneManager.scene, parent.node, "#00ff00"); // Green
    const grandchild = new TestEntity("grandchild", sceneManager.scene, child.node, "#0000ff"); // Blue
    
    // Set initial positions (child offset from parent, grandchild offset from child)
    parent.node.setLocalPosition(0, 0, 0);
    child.node.setLocalPosition(2, 0, 0);  // 2 units to the right
    grandchild.node.setLocalPosition(0, 1, 0);  // 1 unit up
    
    // Movement parameters
    const startPos = new Vector3(-5, 0, 0);
    const endPos = new Vector3(5, 0, 0);
    let movingToEnd = true;
    let lerpTime = 0;
    const moveSpeed = 0.2; // 20% per second
    
    // Set up event listeners
    rootNode.addEventListener("destination:reached", (evt: any) => {
        console.log("[Root] Captured destination reached event:", evt.payload);
    }, { capture: true });
    
    parent.node.addEventListener("destination:reached", (evt: any) => {
        console.log("[Parent] Received destination reached from child:", evt.payload);
        // Parent could react to child reaching destination
    });
    
    child.node.addEventListener("destination:reached", (evt: any) => {
        console.log("[Child] Destination reached event (should not see during bubble)");
    });
    
    // Animation loop
    sceneManager.scene.registerBeforeRender(() => {
        // Update lerp time
        lerpTime += moveSpeed * 0.016; // ~60fps
        
        // Check if reached destination
        if (lerpTime >= 1.0) {
            lerpTime = 1.0;
            
            // Emit event from child when parent reaches destination
            child.node.emit("destination:reached", {
                category: EventCategory.SYSTEM,
                message: `Child node reached destination (${movingToEnd ? "end" : "start"})`,
                source: "child",
                parentPosition: parent.node.getWorldPosition(),
                destination: movingToEnd ? "end" : "start",
                timestamp: Date.now()
            });
            
            // Reverse direction
            lerpTime = 0;
            movingToEnd = !movingToEnd;
        }
        
        // Calculate parent position
        const currentPos = movingToEnd ? 
            Vector3.Lerp(startPos, endPos, lerpTime) : 
            Vector3.Lerp(endPos, startPos, lerpTime);
        
        // Move parent (children follow automatically)
        parent.node.setLocalPosition(currentPos.x, currentPos.y, currentPos.z);
        
        // Optional: Add some rotation to make it more interesting
        parent.node.setLocalRotation(0, lerpTime * Math.PI * 2, 0);
        
        // Optional: Make grandchild orbit around child
        const orbitAngle = Date.now() * 0.002;
        grandchild.node.setLocalPosition(
            Math.cos(orbitAngle) * 1.5,
            1,
            Math.sin(orbitAngle) * 1.5
        );
    });
    
    // Debug info
    console.log("Scene initialized:");
    console.log("- Parent (red sphere) moves between x=-5 and x=5");
    console.log("- Child (green sphere) is offset 2 units right from parent");
    console.log("- Grandchild (blue sphere) orbits around child");
    console.log("- Child emits 'destination:reached' event when parent reaches endpoints");
}

// Entry point
(async () => {
    const { canvas, sceneManager, rootNode } = setupGameCanvasAndScene();

    // Debug: Log the scene object before creating EventStack
    console.log('sceneManager.scene:', sceneManager.scene);

    // Set up EventStack and subscribe to root node
    const eventStack = new EventStack(sceneManager.scene);
    eventStack.subscribeToSceneRoot(rootNode);

    // Set up UIManager as a child of root node
    const uiManager = new UIManager(sceneManager.scene, rootNode);
    await uiManager.createUI();
    uiManager.listenForLogEvents(rootNode);

    // Make UI accessible from console for debugging (optional)
    (window as any).uiManager = uiManager;
    (window as any).eventStack = eventStack;

    // Populate test ECS entities
    populateTestEntities(sceneManager, rootNode);
})();