// src/game/entities/Station/StationEntity.ts

import { DecoratedEntity } from '@engine/core/DecoratedEntity';
import { Entity, OnPropertyChange, EveryTick, ClientOnly, ServerOnly } from '@engine/core/ReactiveDecorators';
import { EntitySchema } from '@engine/networking/NetworkTypes';
import { Vector3, Scene, MeshBuilder, StandardMaterial, Color3, ActionManager, ExecuteCodeAction, Animation } from '@babylonjs/core';

/**
 * Station entity - Interactive building with 3D UI through reactive state
 * 
 * Demonstrates:
 * - Entity as its own UI (hover/click states)
 * - Client-authoritative interaction states
 * - Server-authoritative resources
 * - Visual feedback through reactive properties
 */
@Entity('station')
export class StationEntity extends DecoratedEntity {
    // Meshes
    private stationMesh?: any;
    private glowMesh?: any;
    private resourceBar?: any;
    
    // Animation state
    private rotationAnimation?: Animation;
    
    protected getSchema(): EntitySchema {
        return {
            entityType: 'station',
            properties: [
                // Client authoritative - UI state
                { name: 'isHovered', type: 'boolean', defaultValue: false, networkSync: true, authority: 'client' },
                { name: 'isSelected', type: 'boolean', defaultValue: false, networkSync: true, authority: 'client' },
                { name: 'menuOpen', type: 'boolean', defaultValue: false, networkSync: true, authority: 'client' },
                { name: 'selectedMenuOption', type: 'string', defaultValue: '', networkSync: true, authority: 'client' },
                
                // Server authoritative - Game state
                { name: 'resourceCount', type: 'number', defaultValue: 100, networkSync: true, authority: 'server', constraints: { min: 0, max: 1000 } },
                { name: 'resourceType', type: 'enum', defaultValue: 'energy', validValues: ['energy', 'materials', 'data'], networkSync: true, authority: 'server' },
                { name: 'isOperational', type: 'boolean', defaultValue: true, networkSync: true, authority: 'server' },
                { name: 'ownerPlayerId', type: 'string', defaultValue: '', networkSync: true, authority: 'server' },
                
                // Local only
                { name: 'glowIntensity', type: 'number', defaultValue: 0, networkSync: false, authority: 'client', constraints: { min: 0, max: 1 } }
            ]
        };
    }
    
    // ============================================================
    // SHARED: Core setup
    // ============================================================
    
    protected setupSharedBehaviors(): void {
        this.createVisual();
        console.log(`🏭 Station ${this.getNetworkId()} initialized at ${this.formatVector(this.getPosition())}`);
    }
    
    protected createVisual(): void {
        if (!this.scene) return;
        
        // Main station structure
        this.stationMesh = MeshBuilder.CreateCylinder(`station_${this.getNetworkId()}`, {
            height: 3,
            diameterTop: 2,
            diameterBottom: 3
        }, this.scene);
        
        // Material based on resource type
        const material = new StandardMaterial(`station_mat_${this.getNetworkId()}`, this.scene);
        this.updateMaterialForResourceType(material);
        this.stationMesh.material = material;
        
        // Glow mesh for hover effects
        this.glowMesh = MeshBuilder.CreateCylinder(`station_glow_${this.getNetworkId()}`, {
            height: 3.1,
            diameterTop: 2.1,
            diameterBottom: 3.1
        }, this.scene);
        
        const glowMaterial = new StandardMaterial(`station_glow_mat_${this.getNetworkId()}`, this.scene);
        glowMaterial.emissiveColor = new Color3(0, 0.5, 1);
        glowMaterial.alpha = 0;
        this.glowMesh.material = glowMaterial;
        
        // Resource indicator bar
        this.createResourceBar();
        
        // Set main mesh for picking
        this.mesh = this.stationMesh;
        this.mesh.isPickable = true;
        
        // Position everything
        const pos = this.getVectorProperty('position')?.getValue();
        if (pos) {
            this.stationMesh.position.copyFrom(pos);
            this.glowMesh.position.copyFrom(pos);
        }
    }
    
    private createResourceBar(): void {
        if (!this.scene) return;
        
        this.resourceBar = MeshBuilder.CreateBox(`resource_bar_${this.getNetworkId()}`, {
            width: 2,
            height: 0.2,
            depth: 0.2
        }, this.scene);
        
        const barMaterial = new StandardMaterial(`resource_bar_mat_${this.getNetworkId()}`, this.scene);
        barMaterial.emissiveColor = new Color3(0, 1, 0);
        this.resourceBar.material = barMaterial;
        
        // Position above station
        this.resourceBar.parent = this.stationMesh;
        this.resourceBar.position.y = 2;
    }
    
    // ============================================================
    // SHARED: Property observers
    // ============================================================
    
    @OnPropertyChange('isHovered')
    protected onHoverChanged(isHovered: boolean): void {
        // Update glow effect
        const glowIntensity = this.getNumericProperty('glowIntensity');
        glowIntensity?.set(isHovered ? 0.3 : 0, 'hover_state');
    }
    
    @OnPropertyChange('isSelected')
    protected onSelectedChanged(isSelected: boolean): void {
        // Stronger glow when selected
        const glowIntensity = this.getNumericProperty('glowIntensity');
        const baseGlow = this.getBooleanProperty('isHovered')?.getValue() ? 0.3 : 0;
        glowIntensity?.set(isSelected ? 0.6 : baseGlow, 'select_state');
        
        // Start/stop rotation animation
        if (isSelected) {
            this.startRotationAnimation();
        } else {
            this.stopRotationAnimation();
        }
    }
    
    @OnPropertyChange('menuOpen')
    protected onMenuStateChanged(isOpen: boolean): void {
        console.log(`📋 Station ${this.getNetworkId()} menu: ${isOpen ? 'OPEN' : 'CLOSED'}`);
        
        if (isOpen) {
            // In a full implementation, this would spawn 3D menu elements
            this.showMenu3D();
        } else {
            this.hideMenu3D();
        }
    }
    
    @OnPropertyChange('resourceCount')
    protected onResourcesChanged(newCount: number, oldCount: number): void {
        this.updateResourceBar(newCount);
        
        // Check operational status
        if (newCount === 0 && oldCount > 0) {
            this.getBooleanProperty('isOperational')?.set(false, 'depleted');
        }
    }
    
    @OnPropertyChange('resourceType')
    protected onResourceTypeChanged(newType: string): void {
        if (this.stationMesh?.material) {
            this.updateMaterialForResourceType(this.stationMesh.material);
        }
    }
    
    @OnPropertyChange('glowIntensity')
    protected onGlowIntensityChanged(intensity: number): void {
        if (this.glowMesh?.material) {
            (this.glowMesh.material as StandardMaterial).alpha = intensity;
        }
    }
    
    // ============================================================
    // CLIENT: Interaction handling
    // ============================================================
    
    @ClientOnly
    protected setupClientBehaviors(): void {
        if (!this.mesh || !this.scene) return;
        
        this.mesh.actionManager = new ActionManager(this.scene);
        
        // Hover events
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPointerOverTrigger,
                () => {
                    this.getBooleanProperty('isHovered')?.set(true, 'mouse_enter');
                }
            )
        );
        
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPointerOutTrigger,
                () => {
                    this.getBooleanProperty('isHovered')?.set(false, 'mouse_exit');
                }
            )
        );
        
        // Click events
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickTrigger,
                () => {
                    const isSelected = this.getBooleanProperty('isSelected');
                    isSelected?.toggle('left_click');
                }
            )
        );
        
        // Right-click for menu
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnRightPickTrigger,
                () => {
                    const menuOpen = this.getBooleanProperty('menuOpen');
                    menuOpen?.toggle('right_click');
                }
            )
        );
        
        console.log(`🖱️ Station ${this.getNetworkId()} interaction handlers ready`);
    }
    
    @ClientOnly
    private showMenu3D(): void {
        // In a full implementation, create 3D menu elements
        // For now, just log
        console.log(`📋 Showing 3D menu for station ${this.getNetworkId()}`);
        
        // Example: Create floating menu options
        const options = ['Transfer Resources', 'Upgrade Station', 'View Stats'];
        options.forEach((option, index) => {
            this.createMenuOption(option, index);
        });
    }
    
    @ClientOnly
    private createMenuOption(text: string, index: number): void {
        if (!this.scene) return;
        
        // Create a simple box as menu option
        const option = MeshBuilder.CreateBox(`menu_option_${index}`, {
            width: 3,
            height: 0.5,
            depth: 0.1
        }, this.scene);
        
        option.parent = this.stationMesh;
        option.position.y = 3 + (index * 0.6);
        option.position.z = -2;
        
        // Make it clickable
        option.isPickable = true;
        option.actionManager = new ActionManager(this.scene);
        
        option.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickTrigger,
                () => {
                    this.getProperty('selectedMenuOption')?.set(text, 'menu_click');
                    this.getBooleanProperty('menuOpen')?.set(false, 'option_selected');
                }
            )
        );
        
        // Store for cleanup
        option.metadata = { isMenuItem: true };
    }
    
    @ClientOnly
    private hideMenu3D(): void {
        if (!this.scene) return;
        
        // Clean up menu items
        this.scene.meshes
            .filter(mesh => mesh.metadata?.isMenuItem && mesh.parent === this.stationMesh)
            .forEach(mesh => mesh.dispose());
    }
    
    @ClientOnly
    private startRotationAnimation(): void {
        if (!this.stationMesh || this.rotationAnimation) return;
        
        this.rotationAnimation = Animation.CreateAndStartAnimation(
            'stationRotation',
            this.stationMesh,
            'rotation.y',
            30, // FPS
            60, // Total frames (2 seconds)
            0,
            Math.PI * 2,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
    }
    
    @ClientOnly
    private stopRotationAnimation(): void {
        if (this.rotationAnimation) {
            this.rotationAnimation.stop();
            this.rotationAnimation = undefined;
            
            // Reset rotation
            if (this.stationMesh) {
                this.stationMesh.rotation.y = 0;
            }
        }
    }
    
    // ============================================================
    // SERVER: Resource management
    // ============================================================
    
    @ServerOnly
    protected setupServerBehaviors(): void {
        console.log(`💰 Station ${this.getNetworkId()} resource management enabled`);
    }
    
    @ServerOnly
    @EveryTick('gameLogic')
    private updateResourceGeneration(): void {
        const resources = this.getNumericProperty('resourceCount');
        const operational = this.getBooleanProperty('isOperational');
        
        if (resources && operational?.getValue()) {
            // Generate 1 resource per second
            const generationRate = 1 / 20; // Per gameLogic tick
            resources.addValue(generationRate, 'generation');
        }
    }
    
    @ServerOnly
    public transferResources(amount: number, toStation: StationEntity): boolean {
        const resources = this.getNumericProperty('resourceCount');
        if (!resources || resources.getValue() < amount) {
            return false;
        }
        
        const targetResources = toStation.getNumericProperty('resourceCount');
        if (!targetResources) {
            return false;
        }
        
        // Transfer
        resources.subtractValue(amount, 'transfer_out');
        targetResources.addValue(amount, 'transfer_in');
        
        console.log(`📦 Transferred ${amount} resources from ${this.getNetworkId()} to ${toStation.getNetworkId()}`);
        return true;
    }
    
    // ============================================================
    // SHARED: Visual updates
    // ============================================================
    
    private updateResourceBar(resourceCount: number): void {
        if (!this.resourceBar) return;
        
        // Scale bar based on resources (0-1000)
        const scale = resourceCount / 1000;
        this.resourceBar.scaling.x = Math.max(0.1, scale);
        
        // Color based on amount
        const material = this.resourceBar.material as StandardMaterial;
        if (material) {
            if (resourceCount < 100) {
                material.emissiveColor = new Color3(1, 0, 0); // Red
            } else if (resourceCount < 500) {
                material.emissiveColor = new Color3(1, 1, 0); // Yellow
            } else {
                material.emissiveColor = new Color3(0, 1, 0); // Green
            }
        }
    }
    
    private updateMaterialForResourceType(material: StandardMaterial): void {
        const resourceType = this.getEnumProperty('resourceType')?.getValue();
        
        switch (resourceType) {
            case 'energy':
                material.diffuseColor = new Color3(0.2, 0.6, 1); // Blue
                material.emissiveColor = new Color3(0, 0.2, 0.5);
                break;
            case 'materials':
                material.diffuseColor = new Color3(0.8, 0.6, 0.2); // Orange
                material.emissiveColor = new Color3(0.3, 0.2, 0);
                break;
            case 'data':
                material.diffuseColor = new Color3(0.6, 0.2, 0.8); // Purple
                material.emissiveColor = new Color3(0.2, 0, 0.3);
                break;
        }
    }
    
    private formatVector(v: Vector3): string {
        return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
    }
    
    // ============================================================
    // LIFECYCLE
    // ============================================================
    
    dispose(): void {
        // Clean up meshes
        [this.stationMesh, this.glowMesh, this.resourceBar].forEach(mesh => {
            if (mesh && !mesh.isDisposed()) {
                mesh.dispose();
            }
        });
        
        // Clean up any menu items
        this.hideMenu3D();
        
        super.dispose();
    }
}