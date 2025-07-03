/**
 * SceneNodeDebugger
 * Visualizes the scene graph hierarchy and node transforms for debugging.
 */
import { Logger, LogCategory } from '../utils/Logger';
import { NodeComponent } from '../components/NodeComponent';
import { Scene } from '@babylonjs/core';
import { MeshBuilder, Mesh, Vector3, Color3, StandardMaterial } from '@babylonjs/core';

export class SceneNodeDebugger {
    private scene: Scene;
    private rootNode: NodeComponent;
    private debugMeshes: Mesh[] = [];

    constructor(scene: Scene, rootNode: NodeComponent) {
        this.scene = scene;
        this.rootNode = rootNode;
        Logger.log(LogCategory.DEBUG, 'SceneNodeDebugger initialized', { scene, rootNode });
    }

    /**
     * Visualize the scene graph hierarchy by drawing lines or meshes.
     */
    public visualize(): void {
        this.clear();
        this.traverseAndVisualize(this.rootNode);
        Logger.log(LogCategory.DEBUG, 'Scene graph visualized');
    }

    private traverseAndVisualize(node: NodeComponent): void {
        // Draw a small sphere at the node's world position
        const pos = node.getWorldPosition();
        const sphere = MeshBuilder.CreateSphere('debugSphere', { diameter: 0.2 }, this.scene);
        sphere.position = new Vector3(pos.x, pos.y, pos.z);
        const mat = new StandardMaterial('debugMat', this.scene);
        mat.diffuseColor = Color3.Yellow();
        sphere.material = mat;
        this.debugMeshes.push(sphere);

        // Draw lines to children
        for (const child of node.getChildren()) {
            const childPos = child.getWorldPosition();
            const line = MeshBuilder.CreateLines('debugLine', {
                points: [
                    new Vector3(pos.x, pos.y, pos.z),
                    new Vector3(childPos.x, childPos.y, childPos.z)
                ]
            }, this.scene);
            line.color = Color3.Green();
            this.debugMeshes.push(line);
            this.traverseAndVisualize(child);
        }
    }

    /**
     * Remove all debug meshes from the scene.
     */
    public clear(): void {
        for (const mesh of this.debugMeshes) {
            mesh.dispose();
        }
        this.debugMeshes = [];
        Logger.log(LogCategory.DEBUG, 'SceneNodeDebugger cleared');
    }
}
