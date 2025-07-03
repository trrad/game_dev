/**
 * RenderResourceManager - Centralized system for managing rendering resources
 * Provides pooling, instancing, and efficient resource management
 */

import { 
    Scene, 
    Mesh, 
    Material, 
    Texture, 
    StandardMaterial, 
    InstancedMesh,
    AbstractMesh
} from '@babylonjs/core';
import { Logger, LogCategory } from '../utils/Logger';

/**
 * RenderResourceManager handles the pooling and reuse of rendering resources
 * to optimize performance and memory usage.
 */
export class RenderResourceManager {
    private static _meshTemplates: Map<string, Mesh> = new Map();
    private static _materials: Map<string, Material> = new Map();
    private static _textures: Map<string, Texture> = new Map();
    
    // Tracking for resource usage
    private static _meshUsage: Map<string, number> = new Map();
    private static _materialUsage: Map<string, number> = new Map();
    private static _textureUsage: Map<string, number> = new Map();
    
    /**
     * Register a mesh to be used as a template for instancing
     * @param key Unique identifier for the mesh
     * @param mesh The mesh template
     */
    static registerMeshTemplate(key: string, mesh: Mesh): void {
        if (this._meshTemplates.has(key)) {
            Logger.log(LogCategory.ERROR, 
                `Overwriting existing mesh template: ${key}`);
            const oldMesh = this._meshTemplates.get(key);
            if (oldMesh && !oldMesh.isDisposed) {
                oldMesh.dispose();
            }
        }
        
        // Store the template
        this._meshTemplates.set(key, mesh);
        this._meshUsage.set(key, 0);
        
        Logger.log(LogCategory.SYSTEM, 
            `Registered mesh template: ${key}`);
    }
    
    /**
     * Create an instance of a registered mesh template
     * @param key Template identifier
     * @param name Name for the new instance
     * @returns InstancedMesh or null if template not found
     */
    static createMeshInstance(key: string, name: string): InstancedMesh | null {
        const template = this._meshTemplates.get(key);
        if (!template) {
            Logger.log(LogCategory.ERROR, 
                `Cannot create instance: Mesh template not found: ${key}`);
            return null;
        }
        
        // Create the instance
        const instance = template.createInstance(name);
        
        // Track usage
        const usage = this._meshUsage.get(key) || 0;
        this._meshUsage.set(key, usage + 1);
        
        Logger.log(LogCategory.SYSTEM, 
            `Created mesh instance of ${key}: ${name}`);
            
        return instance;
    }
    
    /**
     * Get a material, creating it if it doesn't exist
     * @param key Unique material identifier
     * @param creator Function that creates the material if needed
     * @returns The requested material
     */
    static getMaterial<T extends Material>(key: string, creator: () => T): T {
        if (!this._materials.has(key)) {
            // Create and store new material
            const material = creator();
            this._materials.set(key, material);
            this._materialUsage.set(key, 0);
            
            Logger.log(LogCategory.SYSTEM, 
                `Created new material: ${key}`);
        }
        
        // Track usage
        const usage = this._materialUsage.get(key) || 0;
        this._materialUsage.set(key, usage + 1);
        
        // Return the material
        return this._materials.get(key) as T;
    }
    
    /**
     * Get a standard material with specific properties
     * @param key Unique material identifier
     * @param options Configuration options
     * @param scene Babylon scene
     * @returns Standard material instance
     */
    static getStandardMaterial(
        key: string, 
        options: {
            diffuseColor?: { r: number, g: number, b: number },
            specularColor?: { r: number, g: number, b: number },
            diffuseTexture?: string,
            emissiveColor?: { r: number, g: number, b: number },
            alpha?: number
        },
        scene: Scene
    ): StandardMaterial {
        return this.getMaterial(key, () => {
            const material = new StandardMaterial(key, scene);
            
            if (options.diffuseColor) {
                material.diffuseColor.set(
                    options.diffuseColor.r,
                    options.diffuseColor.g,
                    options.diffuseColor.b
                );
            }
            
            if (options.specularColor) {
                material.specularColor.set(
                    options.specularColor.r,
                    options.specularColor.g,
                    options.specularColor.b
                );
            }
            
            if (options.emissiveColor) {
                material.emissiveColor.set(
                    options.emissiveColor.r,
                    options.emissiveColor.g,
                    options.emissiveColor.b
                );
            }
            
            if (options.diffuseTexture) {
                material.diffuseTexture = this.getTexture(options.diffuseTexture, scene);
            }
            
            if (options.alpha !== undefined) {
                material.alpha = options.alpha;
            }
            
            return material;
        });
    }
    
    /**
     * Get a texture, loading it if it doesn't exist
     * @param url Texture URL or identifier
     * @param scene Babylon scene
     * @returns Texture instance
     */
    static getTexture(url: string, scene: Scene): Texture {
        if (!this._textures.has(url)) {
            // Create and store new texture
            const texture = new Texture(url, scene);
            this._textures.set(url, texture);
            this._textureUsage.set(url, 0);
            
            Logger.log(LogCategory.SYSTEM, 
                `Created new texture: ${url}`);
        }
        
        // Track usage
        const usage = this._textureUsage.get(url) || 0;
        this._textureUsage.set(url, usage + 1);
        
        // Return the texture
        return this._textures.get(url)!;
    }
    
    /**
     * Release a resource (decrement usage count)
     * @param type Resource type
     * @param key Resource identifier
     */
    static releaseResource(
        type: 'mesh' | 'material' | 'texture', 
        key: string
    ): void {
        let usageMap: Map<string, number>;
        
        switch (type) {
            case 'mesh':
                usageMap = this._meshUsage;
                break;
            case 'material':
                usageMap = this._materialUsage;
                break;
            case 'texture':
                usageMap = this._textureUsage;
                break;
            default:
                return;
        }
        
        const usage = usageMap.get(key) || 0;
        if (usage > 0) {
            usageMap.set(key, usage - 1);
        }
    }
    
    /**
     * Dispose unused resources to free memory
     * @param threshold Minimum usage count to keep resources (default 0)
     */
    static disposeUnused(threshold: number = 0): void {
        Logger.log(LogCategory.PERFORMANCE, 
            'Disposing unused render resources', { threshold });
            
        // Dispose unused meshes
        for (const [key, usage] of this._meshUsage.entries()) {
            if (usage <= threshold) {
                const mesh = this._meshTemplates.get(key);
                if (mesh && !mesh.isDisposed()) {
                    mesh.dispose();
                    this._meshTemplates.delete(key);
                    this._meshUsage.delete(key);
                    
                    Logger.log(LogCategory.SYSTEM, 
                        `Disposed unused mesh template: ${key}`);
                }
            }
        }
        
        // Dispose unused materials
        for (const [key, usage] of this._materialUsage.entries()) {
            if (usage <= threshold) {
                const material = this._materials.get(key);
                if (material) {
                    material.dispose();
                    this._materials.delete(key);
                    this._materialUsage.delete(key);
                    
                    Logger.log(LogCategory.SYSTEM, 
                        `Disposed unused material: ${key}`);
                }
            }
        }
        
        // Dispose unused textures
        for (const [key, usage] of this._textureUsage.entries()) {
            if (usage <= threshold) {
                const texture = this._textures.get(key);
                if (texture) {
                    texture.dispose();
                    this._textures.delete(key);
                    this._textureUsage.delete(key);
                    
                    Logger.log(LogCategory.SYSTEM, 
                        `Disposed unused texture: ${key}`);
                }
            }
        }
    }
    
    /**
     * Get resource usage statistics
     */
    static getResourceStats(): {
        meshes: { total: number, used: number },
        materials: { total: number, used: number },
        textures: { total: number, used: number }
    } {
        const countUsed = (map: Map<string, number>) => 
            Array.from(map.values()).filter(count => count > 0).length;
            
        return {
            meshes: {
                total: this._meshTemplates.size,
                used: countUsed(this._meshUsage)
            },
            materials: {
                total: this._materials.size,
                used: countUsed(this._materialUsage)
            },
            textures: {
                total: this._textures.size,
                used: countUsed(this._textureUsage)
            }
        };
    }
}
