const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const webpack = require('webpack');

class MyPlugin {
    apply(compiler) {
        compiler.hooks.normalModuleFactory.tap('aibinmr', nmf => {
            nmf.hooks.beforeResolve.tap('aibinmrInstead', mod => {
                if (mod.request.includes('WebGLBackground')) {
                    // 将请求重定向到新文件
                    mod.request = '../../../../core/renderers/webgl/WebGLBackground.js';
                    // mod.request = newResource;
                }
            });
            nmf.hooks.afterResolve.tap('aibinmrInstead2', mod => {
                if (mod.request.includes('WebGLBackground')) {
                    // 将请求重定向到新文件
                    mod.resource = '../../../../core/renderers/webgl/WebGLBackground.js';
                    // mod.request = newResource;
                }
            });
        });
    }
}
module.exports = {
    devtool: 'source-map',
    mode: 'production',
    entry: './src/index.js',
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.(css|less)$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: {
                                localIdentName: '[name]__[local]-[hash:base64:5]'
                            }
                        }
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            lessOptions: {
                                strictMath: true
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(png|svg|jpg|gif|jpeg)$/,
                loader: 'file-loader'
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                loader: 'file-loader'
            }
        ]
    },
    resolve: {
        // 设置别名
        alias: {
            '@': path.resolve('src') ,// 这样配置后 @ 可以指向 src 目录
            './webgl/WebGLBackground.js':path.resolve(__dirname, '/core/renderers/webgl/WebGLBackground.js')
        }
    },
    plugins: [
        //配置html 模板
        new HtmlWebpackPlugin({
            title: '3D-Editor',
            template: 'public/index.html',
            favicon: path.resolve('public/favicon.ico'),
            manifest: path.resolve('public/manifest.json')
        }),
        // 清除缓存
        new CleanWebpackPlugin(),
        // 执行eslint 校验
        new ESLintPlugin(),
        //配置 全局变量
        new webpack.ProvidePlugin({
            $$: path.resolve(path.join(__dirname, '../src/', 'utils/utils.js')),
            constant: path.resolve(path.join(__dirname, '../src/', 'constant/index.js'))
        })
    ],
    devServer: {
        static: './public',
        hot: true,
        historyApiFallback: true,
        compress: true
    }
};
