// webpack.server.config.js

const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    mode: 'development',
    target: 'node', // Important for server build
    entry: './src/demo/server.ts',
    
    output: {
        filename: 'server.bundle.js',
        path: path.resolve(__dirname, 'dist/server'),
        clean: true
    },
    
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            '@engine': path.resolve(__dirname, 'src/engine'),
            '@game': path.resolve(__dirname, 'src/game')
        }
    },
    
    plugins: [
        // Define build target for decorator stripping
        new webpack.DefinePlugin({
            'process.env.BUILD_TARGET': JSON.stringify('server'),
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
        }),
        
        // Ignore Babylon.js warnings about canvas/window in Node
        new webpack.IgnorePlugin({
            resourceRegExp: /^(canvas|window)$/
        })
    ],
    
    // Don't bundle node_modules for server
    externals: [nodeExternals({
        // But DO bundle @babylonjs for NullEngine
        allowlist: [/@babylonjs/]
    })],
    
    optimization: {
        usedExports: true, // Enable tree shaking
        
        // In production, this will eliminate dead code
        minimize: process.env.NODE_ENV === 'production',
        
        // Server doesn't need chunk splitting
        splitChunks: false
    },
    
    // Node-specific settings
    node: {
        __dirname: false,
        __filename: false
    },
    
    // Development optimizations
    devtool: 'inline-source-map',
    
    stats: {
        assets: true,
        chunks: true,
        modules: false,
        entrypoints: true,
        errors: true,
        warnings: true,
        // Suppress "Critical dependency" warnings from dynamic requires
        warningsFilter: /Critical dependency/
    }
};