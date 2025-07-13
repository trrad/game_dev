// webpack.client.config.js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    mode: 'development',
    entry: './src/demo/client.ts',
    
    output: {
        filename: 'client.bundle.js',
        path: path.resolve(__dirname, 'dist/client'),
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
            'process.env.BUILD_TARGET': JSON.stringify('client'),
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
        }),
        
        // Generate HTML file
        new HtmlWebpackPlugin({
            template: './src/demo/index.html',
            title: 'Reactive Multiplayer Demo - Client'
        })
    ],
    
    optimization: {
        usedExports: true, // Enable tree shaking
        
        // In production, this will eliminate dead code
        minimize: process.env.NODE_ENV === 'production',
        
        // Split runtime into separate chunk
        runtimeChunk: 'single',
        
        // Split vendor code
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    priority: -10,
                    chunks: 'all'
                },
                babylonjs: {
                    test: /[\\/]node_modules[\\/]@babylonjs[\\/]/,
                    name: 'babylon',
                    priority: -5,
                    chunks: 'all'
                }
            }
        }
    },
    
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist/client')
        },
        compress: true,
        port: 9000,
        hot: true,
        open: true
    },
    
    // Development optimizations
    devtool: 'inline-source-map',
    
    stats: {
        assets: true,
        chunks: true,
        modules: false,
        entrypoints: true,
        errors: true,
        warnings: true
    }
};