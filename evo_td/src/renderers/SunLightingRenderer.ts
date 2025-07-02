/**
 * Sun & Time-of-Day Lighting Renderer
 * 
 * Extracted from app.ts - handles dynamic sun positioning and lighting based on game time
 * TODO: Integrate this into ecs-app.ts to replace static lighting in LightRenderer
 * 
 * Features to implement:
 * - Dynamic sun position based on time of day (5 AM - 7 PM cycle)
 * - Smooth color transitions (golden hour, midday white, sunset)
 * - Ambient light intensity changes
 * - Scene clear color transitions for atmosphere
 * - Interpolated lighting for smooth 60fps updates
 */

import {
    DirectionalLight,
    HemisphericLight,
    Vector3,
    Color3,
    Color4,
    Scene
} from "@babylonjs/core";

export interface TimeOfDayConfig {
    sunRiseHour: number;        // Default: 5 AM
    sunSetHour: number;         // Default: 7 PM  
    maxSunIntensity: number;    // Default: 1.2
    nightAmbientIntensity: number;  // Default: 0.15
    dayAmbientIntensity: number;    // Default: 0.3
    enableInterpolation: boolean;   // Default: true for smooth transitions
}

export class SunLightingRenderer {
    private sunLight: DirectionalLight;
    private ambientLight: HemisphericLight;
    private scene: Scene;
    private config: TimeOfDayConfig;
    
    // Interpolation state for smooth lighting transitions
    private prevSunDirection: Vector3 | null = null;
    private currSunDirection: Vector3 | null = null;
    private prevSunIntensity: number = 0;
    private currSunIntensity: number = 0;
    private prevSunColor: Color3 | null = null;
    private currSunColor: Color3 | null = null;

    constructor(scene: Scene, config: Partial<TimeOfDayConfig> = {}) {
        this.scene = scene;
        this.config = {
            sunRiseHour: 5,
            sunSetHour: 19,
            maxSunIntensity: 1.2,
            nightAmbientIntensity: 0.15,
            dayAmbientIntensity: 0.3,
            enableInterpolation: true,
            ...config
        };
        
        this.initializeLights();
    }

    private initializeLights(): void {
        // Create ambient light for general illumination
        this.ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), this.scene);
        this.ambientLight.intensity = this.config.dayAmbientIntensity;
        
        // Create sun light - directional light that moves based on time
        this.sunLight = new DirectionalLight("sunLight", new Vector3(-1, -1, 0), this.scene);
        this.sunLight.intensity = 1.0;
        this.sunLight.diffuse = new Color3(1, 0.95, 0.8); // Warm sunlight
    }

    /**
     * Update sun lighting based on game time
     * Call this every game tick with current hours and minutes
     */
    public updateSunLighting(hours: number, minutes: number): void {
        const totalMinutes = hours * 60 + minutes;
        const dayProgress = totalMinutes / (24 * 60); // 0 to 1 for full day
        
        let sunIntensity = 0;
        let sunAngle = 0;
        let sunColor = new Color3(1, 0.95, 0.8); // Default warm daylight
        
        if (hours >= this.config.sunRiseHour && hours < this.config.sunSetHour) {
            // Daytime - sun is up
            const dayHours = this.config.sunSetHour - this.config.sunRiseHour;
            const dayProgress = (totalMinutes - this.config.sunRiseHour * 60) / (dayHours * 60);
            
            // Sun angle: starts low (sunrise), goes high (noon), ends low (sunset)
            sunAngle = Math.sin(dayProgress * Math.PI) * Math.PI / 3; // 0 to 60 degrees
            
            // Sun intensity: peaks at noon
            sunIntensity = Math.sin(dayProgress * Math.PI) * this.config.maxSunIntensity;
            
            // Extended golden hour periods for smoother transitions
            if (dayProgress < 0.35 || dayProgress > 0.65) {
                // Extended sunrise/sunset - warmer, redder light
                const goldenIntensity = dayProgress < 0.35 ? 
                    (dayProgress / 0.35) : // Fade in during sunrise
                    ((1 - dayProgress) / 0.35); // Fade out during sunset
                
                sunColor = Color3.Lerp(
                    new Color3(1, 0.8, 0.5), // Lighter golden
                    new Color3(1, 0.5, 0.2), // Deeper golden/red
                    Math.max(0, Math.min(1, goldenIntensity * 2))
                );
                sunIntensity *= (0.4 + goldenIntensity * 0.6); // Gradual intensity change
            } else {
                // Midday - cooler, whiter light with smooth transition
                const middayProgress = Math.abs(dayProgress - 0.5) / 0.15; // How close to noon
                sunColor = Color3.Lerp(
                    new Color3(1, 0.8, 0.5), // Golden
                    new Color3(1, 0.95, 0.9), // White
                    1 - middayProgress
                );
            }
        } else {
            // Nighttime - sun is down
            sunIntensity = 0;
            sunAngle = -Math.PI / 6; // Below horizon
        }
        
        // Update sun direction based on angle
        const sunDirection = new Vector3(
            Math.cos(dayProgress * Math.PI * 2 - Math.PI), // East to West movement
            -Math.sin(sunAngle), // Height based on time of day
            Math.sin(dayProgress * Math.PI * 2 - Math.PI) * 0.3 // Slight north-south variation
        ).normalize();
        
        this.sunLight.direction = sunDirection;
        this.sunLight.intensity = sunIntensity;
        this.sunLight.diffuse = sunColor;
        
        // Store previous and current sun state for interpolation
        if (this.config.enableInterpolation) {
            this.prevSunDirection = this.currSunDirection || sunDirection.clone();
            this.currSunDirection = sunDirection.clone();
            this.prevSunIntensity = this.currSunIntensity || sunIntensity;
            this.currSunIntensity = sunIntensity;
            this.prevSunColor = this.currSunColor || sunColor.clone();
            this.currSunColor = sunColor.clone();
        }

        // Update ambient light based on time
        this.updateAmbientLighting(hours, totalMinutes);
        
        // Update scene clear color for atmosphere
        this.updateSceneAtmosphere(hours, totalMinutes);
    }

    private updateAmbientLighting(hours: number, totalMinutes: number): void {
        if (hours < this.config.sunRiseHour || hours >= this.config.sunSetHour) {
            this.ambientLight.intensity = this.config.nightAmbientIntensity;
        } else {
            // Smooth transition during sunrise/sunset
            const dayHours = this.config.sunSetHour - this.config.sunRiseHour;
            const dayProgress = (totalMinutes - this.config.sunRiseHour * 60) / (dayHours * 60);
            if (dayProgress < 0.2 || dayProgress > 0.8) {
                this.ambientLight.intensity = 0.2; // Slightly dimmer during golden hours
            } else {
                this.ambientLight.intensity = this.config.dayAmbientIntensity;
            }
        }
    }

    private updateSceneAtmosphere(hours: number, totalMinutes: number): void {
        if (hours < this.config.sunRiseHour || hours >= this.config.sunSetHour) {
            // Night - darker blue
            this.scene.clearColor = new Color4(0.05, 0.1, 0.2, 1);
        } else {
            const dayHours = this.config.sunSetHour - this.config.sunRiseHour;
            const dayProgressNormalized = (totalMinutes - this.config.sunRiseHour * 60) / (dayHours * 60);
            
            if (dayProgressNormalized < 0.25 || dayProgressNormalized > 0.75) {
                // Extended sunrise/sunset - warmer colors
                const intensity = dayProgressNormalized < 0.25 ? 
                    dayProgressNormalized / 0.25 : 
                    (1 - dayProgressNormalized) / 0.25;
                this.scene.clearColor = Color4.Lerp(
                    new Color4(0.3, 0.15, 0.4, 1), // Purple/orange sunrise/sunset
                    new Color4(0.4, 0.3, 0.5, 1),  // Lighter transition
                    intensity
                );
            } else {
                // Day - normal light blue
                this.scene.clearColor = new Color4(0.2, 0.4, 0.6, 1);
            }
        }
    }

    /**
     * Call this in render loop for smooth interpolated lighting (60fps)
     * @param tickAlpha - interpolation factor (0-1) between game ticks
     */
    public interpolateLighting(tickAlpha: number): void {
        if (!this.config.enableInterpolation) return;
        
        if (this.prevSunDirection && this.currSunDirection && this.prevSunColor && this.currSunColor) {
            // Interpolate sun direction
            this.sunLight.direction = Vector3.Lerp(this.prevSunDirection, this.currSunDirection, tickAlpha);
            
            // Interpolate sun intensity
            this.sunLight.intensity = this.prevSunIntensity + (this.currSunIntensity - this.prevSunIntensity) * tickAlpha;
            
            // Interpolate sun color
            this.sunLight.diffuse = Color3.Lerp(this.prevSunColor, this.currSunColor, tickAlpha);
        }
    }

    /**
     * Get current sun information for debugging
     */
    public getSunInfo(): { intensity: number, direction: Vector3, color: Color3 } {
        return {
            intensity: this.sunLight.intensity,
            direction: this.sunLight.direction.clone(),
            color: this.sunLight.diffuse.clone()
        };
    }

    public dispose(): void {
        if (this.sunLight) {
            this.sunLight.dispose();
        }
        if (this.ambientLight) {
            this.ambientLight.dispose();
        }
    }
}
