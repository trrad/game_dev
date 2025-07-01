/**
 * CSS Loader Utility
 * Dynamically loads CSS files and manages stylesheets
 */

export class CSSLoader {
    private loadedStyles: Set<string> = new Set();
    private static instance: CSSLoader | null = null;

    /**
     * Get singleton instance
     */
    public static getInstance(): CSSLoader {
        if (!CSSLoader.instance) {
            CSSLoader.instance = new CSSLoader();
        }
        return CSSLoader.instance;
    }

    /**
     * Static method to inject CSS directly into the page
     */
    public static injectCSS(css: string, id?: string): void {
        const style = document.createElement('style');
        style.type = 'text/css';
        if (id) {
            style.id = id;
            // Remove existing style with same ID
            const existing = document.getElementById(id);
            if (existing) {
                existing.remove();
            }
        }
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * Load a CSS file from the assets/ui directory
     */
    public async loadCSS(filename: string): Promise<void> {
        if (this.loadedStyles.has(filename)) {
            return; // Already loaded
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = `./src/ui/assets/${filename}`;
        
        return new Promise((resolve, reject) => {
            link.onload = () => {
                this.loadedStyles.add(filename);
                resolve();
            };
            link.onerror = () => {
                reject(new Error(`Failed to load CSS: ${filename}`));
            };
            document.head.appendChild(link);
        });
    }

    /**
     * Load multiple CSS files
     */
    public async loadMultipleCSS(filenames: string[]): Promise<void> {
        const promises = filenames.map(filename => this.loadCSS(filename));
        await Promise.all(promises);
    }

    /**
     * Remove a loaded CSS file
     */
    public unloadCSS(filename: string): void {
        const links = document.querySelectorAll(`link[href="./src/ui/assets/${filename}"]`);
        links.forEach(link => link.remove());
        this.loadedStyles.delete(filename);
    }

    /**
     * Get list of loaded styles
     */
    public getLoadedStyles(): string[] {
        return Array.from(this.loadedStyles);
    }

    /**
     * Dispose all loaded styles
     */
    public dispose(): void {
        this.loadedStyles.forEach(filename => this.unloadCSS(filename));
        this.loadedStyles.clear();
    }
}
