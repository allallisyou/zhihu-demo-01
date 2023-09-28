import { aibinMr } from './index.js';
import ViewController from './controller/ViewController';

window.aibinMr = aibinMr;

class ViewManager {
    constructor() {
        this.views = {};
        this.domTree = {};
    }

    initGLContext() {}

    createViewController(domContainer) {
        new ViewController(domContainer);
    }

    create3DMainScene(dom, parameters) {
        const renderer = new aibinMr.WebGLRenderer(parameters);
        let shader;
        renderer.setSize(dom.offsetWidth, dom.offsetHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        dom.appendChild(renderer.domElement);
        const camera = new aibinMr.PerspectiveCamera(
            60,
            dom.offsetWidth / dom.offsetHeight,
            1,
            20000
        );
        camera.position.set(0, 0, 100);
        camera.lookAt(0, 0, 0);
        window.camera = camera;
        const scene = new aibinMr.Scene();

        const controls = new aibinMr.OrbitControls(camera, renderer.domElement);
        const grid = new aibinMr.InfiniteGridHelper(10, 100);
        scene.add(grid);
        /* controls.enableZoom = true;
        controls.enablePan = true;*/

        const loader = new aibinMr.CubeTextureLoader();
        loader.setPath('textures/cube/');
        scene.background = loader.load(
            ['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg'],
            function (textureCube) {
                /*
                const skyGeometry = new aibinMr.PlaneGeometry(2, 2);
                textureCube.format = aibinMr.RGBAFormat;
                textureCube.type = aibinMr.UnsignedByteType;
                shader = {
                    vertexShader: `
                in vec4 position;
                out  vec4 v_position;
                void main() {
                v_position = position;
                gl_Position = position;//vec4(position, 1.0);
                gl_Position.z = 1.0;

            }`,
                    fragmentShader: `
                precision highp float;
                precision highp int;
                uniform samplerCube u_skybox;
                uniform mat4 u_viewDirectionProjectionInverse;
                out  vec4 fragColor;
                in vec4 v_position;
                void main() {
                    vec4 t = u_viewDirectionProjectionInverse * v_position;
                    // fragColor = texture(u_skybox, normalize( v_position.xyz));
                    fragColor = texture(u_skybox, normalize( t.xyz / t.w));
                    //fragColor = v_position;
                    }
            `,
                    uniforms: {
                        u_skybox: { value: textureCube }
                    }
                };
                camera.updateWorldMatrix();

                let material = new aibinMr.RawShaderMaterial({
                    // material = new THREE.ShaderMaterial({
                    name: 'SkyShader',
                    fragmentShader: shader.fragmentShader,
                    vertexShader: shader.vertexShader,
                    uniforms: shader.uniforms,
                    side: aibinMr.FrontSide
                });
                material.glslVersion = aibinMr.GLSL3;
                const plane = new aibinMr.Mesh(skyGeometry, material);
                scene.add(plane);*/
            }
        );

        // 天空盒代码 end

        controls.addEventListener('change', () => {
            if (shader) {
                // const ps = new aibinMr.Matrix4();

                const ps = new aibinMr.Matrix4();
                ps.makeRotationFromQuaternion(camera.quaternion).invert();

                const pj = new aibinMr.Matrix4()
                    .multiplyMatrices(camera.projectionMatrix, ps)
                    .invert();
                shader.uniforms.u_viewDirectionProjectionInverse = { value: pj };
            }
            camera.updateWorldMatrix();
            console.log(camera.matrixWorldInverse.elements);
            renderer.render(scene, camera);
        });
        renderer.render(scene, camera);
        //animate();*/
        const id = aibinMr.MathUtils.generateUUID();
        this.views[id] = {
            camera,
            renderer,
            scene
        };

        return this.views[id];
    }

    _checkDomStructure(canvasContainer, autoCompletion = true) {
        if (canvasContainer.id && this.domTree[canvasContainer.id]) {
            _.eachObject(canvasContainer.children, child => {
                if (child.nodeName === 'CANVAS') {
                    canvasContainer.removeChild(child);
                }
            });
        } else {
            if (!canvasContainer.id) {
                canvasContainer.id = aibinMr.MathUtils.generateUUID();
                this.domTree[canvasContainer.id] = {};
                this.domTree[canvasContainer.id]['mainCanvasContainer'] = canvasContainer;
            } else {
                this.domTree[canvasContainer.id] = {};
                this.domTree[canvasContainer.id]['mainCanvasContainer'] = canvasContainer;
            }
        }
    }

    _creatView(canvasContainer, options) {
        this._checkDomStructure(canvasContainer);
        let domTree = this.domTree[canvasContainer.id];
        let view = this.create3DMainScene(domTree.mainCanvasContainer, options);
        this.createViewController(domTree.mainCanvasContainer);
        view.domTree = domTree;
        return view;
    }

    /**
     * @description 创建视图
     * @param {Document} domContainer
     * @param {Object} [options]
     * @param {Object} [options.glParameters]
     * */
    createView(domContainer, options = {}) {
        //let {canvasContainer} = options;
        return this._creatView(domContainer, options);
    }
}

export { ViewManager };
export const viewManager = new ViewManager();
