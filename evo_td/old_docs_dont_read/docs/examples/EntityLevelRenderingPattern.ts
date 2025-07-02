/**
 * Example: Entity-Level Render Component Registration Pattern
 * Shows how TrainCar would directly add render components to voxels
 */

// In TrainCar.createVoxelAt() method:
private createVoxelAt(x: number, y: number, z: number, carPosition: { x: number; y: number; z: number }): TrainCarVoxel {
    // Create the voxel entity
    const voxelId = `${this.id}_voxel_${x}_${y}_${z}`;
    const voxel = new TrainCarVoxel(voxelId, { x, y, z });
    
    // Add standard components (position, health, etc.)
    const worldPosition = this.calculateVoxelWorldPosition(x, y, z, carPosition);
    const positionComponent = new PositionComponent(worldPosition);
    voxel.addComponent(positionComponent);
    
    const healthComponent = new HealthComponent(100);
    voxel.addComponent(healthComponent);
    
    // Add render component directly to the voxel
    const voxelRenderComponent = new VoxelRenderComponent(scene, { 
        size: 0.4,
        yOffset: 0.4 
    });
    voxel.addComponent(voxelRenderComponent);
    
    // Register with SceneManager - this is where the magic happens
    // SceneManager automatically picks up any GameObject with a RenderComponent
    sceneManager.registerGameObject(voxel);
    
    // Store in our grid
    this._voxels.set(voxelId, voxel);
    this._voxelGrid[x][y][z] = voxel;
    
    return voxel;
}

// In TrainCar.addAttachment() method:
addAttachment(attachment: Attachment, slotId: string): boolean {
    // ... existing attachment logic ...
    
    // Add render component directly to the attachment
    const attachmentRenderComponent = new AttachmentRenderComponent(attachment, {
        scene: scene,
        attachmentType: attachment.getConfig().type
    });
    attachment.addComponent(attachmentRenderComponent);
    
    // Register with SceneManager
    sceneManager.registerGameObject(attachment);
    
    return true;
}

// SceneManager update loop automatically handles all RenderComponents:
class SceneManager {
    update(deltaTime: number): void {
        // Automatically update all GameObjects with RenderComponents
        this.gameObjects.forEach(gameObject => {
            const renderComponent = gameObject.getComponent<RenderComponent>('render');
            if (renderComponent) {
                // RenderComponent automatically updates based on position/health changes
                // No manual coordination needed!
            }
        });
    }
}
