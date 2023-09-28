import { BackSide, FrontSide, CubeUVReflectionMapping, SRGBColorSpace } from '../../constants.js';
import { PlaneGeometry } from '../../geometries/PlaneGeometry.js';
import { RawShaderMaterial } from '../../materials/RawShaderMaterial.js';
import { Color } from '../../math/Color.js';
import { Matrix4 } from '../../math/Matrix4.js';
import { Mesh } from '../../objects/Mesh.js';
import { ShaderLib } from '../shaders/ShaderLib.js';
import { cloneUniforms, getUnlitUniformColorSpace } from '../shaders/UniformsUtils.js';

const _rgb = { r: 0, b: 0, g: 0 };

function WebGLBackground(
    renderer,
    cubemaps,
    cubeuvmaps,
    state,
    objects,
    alpha,
    premultipliedAlpha
) {
    const clearColor = new Color(0x000000);
    let clearAlpha = alpha === true ? 0 : 1;

    let planeMesh;
    let boxMesh;

    let currentBackground = null;
    let currentBackgroundVersion = 0;
    let currentTonemapping = null;

    function render(renderList, scene, camera) {
        let forceClear = false;
        let background = scene.isScene === true ? scene.background : null;

        if (background && background.isTexture) {
            const usePMREM = scene.backgroundBlurriness > 0; // use PMREM if the user wants to blur the background
            background = (usePMREM ? cubeuvmaps : cubemaps).get(background);
        }

        if (background === null) {
            setClear(clearColor, clearAlpha);
        } else if (background && background.isColor) {
            setClear(background, 1);
            forceClear = true;
        }

        const xr = renderer.xr;
        const environmentBlendMode = xr.getEnvironmentBlendMode();

        switch (environmentBlendMode) {
            case 'opaque':
                forceClear = true;
                break;

            case 'additive':
                state.buffers.color.setClear(0, 0, 0, 1, premultipliedAlpha);
                forceClear = true;
                break;

            case 'alpha-blend':
                state.buffers.color.setClear(0, 0, 0, 0, premultipliedAlpha);
                forceClear = true;
                break;
        }

        if (renderer.autoClear || forceClear) {
            renderer.clear(
                renderer.autoClearColor,
                renderer.autoClearDepth,
                renderer.autoClearStencil
            );
        }

        if (
            background &&
            (background.isCubeTexture || background.mapping === CubeUVReflectionMapping)
        ) {
            if (boxMesh === undefined) {
                boxMesh = new Mesh(
                    new PlaneGeometry(2, 2),
                    new RawShaderMaterial({
                        name: 'BackgroundCubeMaterial',
                        uniforms: cloneUniforms(ShaderLib.backgroundCube.uniforms),
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
                    fragColor = vec4(1.0,1.0,0.0,1.0)
                    //fragColor = v_position;
                    }
            `,
                        side: BackSide,
                        depthTest: false,
                        depthWrite: false,
                        fog: false
                    })
                );

                boxMesh.geometry.deleteAttribute('normal');
                boxMesh.geometry.deleteAttribute('uv');

                boxMesh.onBeforeRender = function (renderer, scene, camera) {
                    this.matrixWorld.copyPosition(camera.matrixWorld);
                };

                // add "envMap" material property so the renderer can evaluate it like for built-in materials
                Object.defineProperty(boxMesh.material, 'envMap', {
                    get: function () {
                        return this.uniforms.envMap.value;
                    }
                });

                objects.update(boxMesh);
            }

            boxMesh.material.uniforms.u_skybox = { value: background };
            boxMesh.material.uniforms.flipEnvMap.value =
                background.isCubeTexture && background.isRenderTargetTexture === false ? -1 : 1;
            boxMesh.material.uniforms.backgroundBlurriness.value = scene.backgroundBlurriness;
            boxMesh.material.uniforms.backgroundIntensity.value = scene.backgroundIntensity;
            boxMesh.material.toneMapped = background.colorSpace !== SRGBColorSpace;
            boxMesh.material.glslVersion = '300 es';
            if (
                currentBackground !== background ||
                currentBackgroundVersion !== background.version ||
                currentTonemapping !== renderer.toneMapping
            ) {
                boxMesh.material.needsUpdate = true;

                currentBackground = background;
                currentBackgroundVersion = background.version;
                currentTonemapping = renderer.toneMapping;
            }

            boxMesh.layers.enableAll();

            const ps = new Matrix4();
            ps.makeRotationFromQuaternion(camera.quaternion).invert();

            const pj = new Matrix4().multiplyMatrices(camera.projectionMatrix, ps).invert();
            boxMesh.material.uniforms.u_viewDirectionProjectionInverse = { value: pj };

            // push to the pre-sorted opaque render list
            renderList.unshift(boxMesh, boxMesh.geometry, boxMesh.material, 0, 0, null);
            debugger;
        } else if (background && background.isTexture) {
            if (planeMesh === undefined) {
                planeMesh = new Mesh(
                    new PlaneGeometry(2, 2),
                    new ShaderMaterial({
                        name: 'BackgroundMaterial',
                        uniforms: cloneUniforms(ShaderLib.background.uniforms),
                        vertexShader: ShaderLib.background.vertexShader,
                        fragmentShader: ShaderLib.background.fragmentShader,
                        side: FrontSide,
                        depthTest: false,
                        depthWrite: false,
                        fog: false
                    })
                );

                planeMesh.geometry.deleteAttribute('normal');

                // add "map" material property so the renderer can evaluate it like for built-in materials
                Object.defineProperty(planeMesh.material, 'map', {
                    get: function () {
                        return this.uniforms.t2D.value;
                    }
                });

                objects.update(planeMesh);
            }

            planeMesh.material.uniforms.t2D.value = background;
            planeMesh.material.uniforms.backgroundIntensity.value = scene.backgroundIntensity;
            planeMesh.material.toneMapped = background.colorSpace === SRGBColorSpace ? false : true;

            if (background.matrixAutoUpdate === true) {
                background.updateMatrix();
            }

            planeMesh.material.uniforms.uvTransform.value.copy(background.matrix);

            if (
                currentBackground !== background ||
                currentBackgroundVersion !== background.version ||
                currentTonemapping !== renderer.toneMapping
            ) {
                planeMesh.material.needsUpdate = true;

                currentBackground = background;
                currentBackgroundVersion = background.version;
                currentTonemapping = renderer.toneMapping;
            }

            planeMesh.layers.enableAll();

            // push to the pre-sorted opaque render list
            renderList.unshift(planeMesh, planeMesh.geometry, planeMesh.material, 0, 0, null);
        }
    }

    function setClear(color, alpha) {
        color.getRGB(_rgb, getUnlitUniformColorSpace(renderer));

        state.buffers.color.setClear(_rgb.r, _rgb.g, _rgb.b, alpha, premultipliedAlpha);
    }

    return {
        getClearColor: function () {
            return clearColor;
        },
        setClearColor: function (color, alpha = 1) {
            clearColor.set(color);
            clearAlpha = alpha;
            setClear(clearColor, clearAlpha);
        },
        getClearAlpha: function () {
            return clearAlpha;
        },
        setClearAlpha: function (alpha) {
            clearAlpha = alpha;
            setClear(clearColor, clearAlpha);
        },
        render: render
    };
}

export { WebGLBackground };
