// require("!style-loader!css-loader!../style/main.css"); //style/main.css
import '../style/main.css';
// import styles from '../style/main.css';
import {
    threeView, //threeBase, TWEEN,
    RingGeometry, //SphereGeometry, BoxGeometry, PlaneGeometry, 
    MeshPhongMaterial, //MeshBasicMaterial,
} from './three.js';
/*
**  Overwrite query data
*/
const contextPoint = {
    x: 388, y: -88, z: -404,
    px: -100, py: 200, pz: -100,
    cw: 1024, ch: 1024, cs: 2048,
    width:0, height:0, deepth:1,
};
const defaultSpots = {
    global_map: {
        src: '', //deepal-sl03-inside.jpg
        // env: [],
        uvs: [0.6754583295687697, 0.8029043481247053, 0.30890971887284235, 0.5107758060045948],
        ctx: ['MINECRAFT', 'GreenForest'],
        // define mesh point
        point: {
            // entries (x,y,z; positionX,positionY,positionZ)
            x: -20.15844995141832, y: -145.91485079560525, z: -472.9048238279224,
            // navigator positions
            px: 0, py: 128, pz: 64,
            // navigator (width/height/deepth; rotationX,rotationY,rotationZ)
            rx: -Math.PI * 0.45, ry: 0, rz: -600,
            width:100, height:600, deepth:10,
            // context (width/height/size:adds)
            cw: 512, ch: 512, cs: 256
        },
        // define entry point
        entry: [],
    },
    minecraft: {
        // src: 'minecraft-night.jpg', //imgs.2broear.com/2025/05/Ayutthaya_SD60x.mp4
        env: [
            'cube/1.16_panorama_2.webp',
            'cube/1.16_panorama_0.webp',
            'cube/1.16_panorama_4s.webp',
            'cube/1.16_panorama_5s.webp', 
            'cube/1.16_panorama_1.webp',
            'cube/1.16_panorama_3.webp',
        ],
        uvs: [0.6754583295687697, 0.8029043481247053, 0.30890971887284235, 0.5107758060045948],
        ctx: ['MINECRAFT', 'v0.7.3'],
        // define mesh point
        point: {
            // entries (x,y,z; positionX,positionY,positionZ)
            x: -20.15844995141832, y: -145.91485079560525, z: -472.9048238279224,
            // navigator positions
            px: 0, py: 128, pz: 64,
            // navigator (width/height/deepth; rotationX,rotationY,rotationZ)
            rx: -Math.PI * 0.45, ry: 0, rz: -600,
            width:100, height:600, deepth:10,
            // context (width/height/size:adds)
            cw: 512, ch: 512, cs: 256
        },
        // define entry point
        entry: [],
    },
    empty_room: {
        src: 'small_empty_room_3_2k.hdr',
        uvs: [0.031337077604052466, 0.07535424120148843, 0.34646601500275254, 0.5660095586586424],
        ctx: ['SMALL', 'EMPTY ROOM'],
        // define mesh point
        point: {
            x: 379.73991320053943, y: -88.8495197768429, z: -414.5114041846273,
            px: -130, py: 30, pz: 0,
            rx: 0, ry: 0, rz: Math.PI * 0.5,
            width:80, height:320, deepth:5,
            cw: 320, ch: 320, cs: 256
        },
        // define entry point
        entry: [],
    },
    tesla_model_3: {
        entry: [],
        ctx: ['Model 3 2018', 'TESLA'],
        point: contextPoint
    },
    tesla_cybertruck: {
        entry: [],
        ctx: ['CyberTruck', 'TESLA'],
        point: contextPoint
    },
    macbook_pro: {
        entry: [],
        ctx: ['MacBook Pro', 'APPLE'],
        point: contextPoint
    },
    mbti_enfp: {
        entry: [],
        ctx: ['Campaigner', 'ENFP-A'],
        point: contextPoint
    },
};

// let defaultViews;
let defaultModel;
let defaultTexture = defaultSpots.global_map;
let defaultEntrySpot;
let defaultSpotArray = ['//imgs.2broear.com/2025/04/texture63crf2pass.webm', '//imgs.2broear.com/2025/04/texture.mov', '//imgs.2broear.com/2025/04/texture.mp4']; //['./assets/3d/texture/nav5x.gif'];
const mobileSpotArray = [{
    url: './assets/3d/texture/sequences/14+/tiny/sequence',
    num:  54,
    ext: '.png'
}];
// 解析传入参数
const queryString = location.search;
let queryArray;
if (typeof URLSearchParams !== 'undefined' && URLSearchParams) {
    queryArray = new URLSearchParams(queryString);
} else {
    // 手动解析查询字符串
    const params = {};
    if (queryString && queryString.length > 1) {
        queryString.substring(1).split('&').forEach(function(pair) {
            const equalIndex = pair.indexOf('=');
            if (equalIndex !== -1) {
                const key = decodeURIComponent(pair.substring(0, equalIndex));
                const value = decodeURIComponent(pair.substring(equalIndex + 1));
                params[key] = value;
            } else if (pair) {
                params[pair] = '';
            }
        });
    }
    // 提供兼容的 API
    queryArray = {
        size: Object.keys(params).length,
        get: function(key) { return params[key] || null; },
        has: function(key) { return params.hasOwnProperty(key); }
    };
}

if (queryArray.size > 0) {
    const entry = queryArray.get('entry');
    const model = queryArray.get('model');
    const texture = queryArray.get('texture');
    if (queryArray.has('model') && model !== '') defaultModel = decodeURIComponent(model);
    if (queryArray.has('entry') && entry !== '') defaultEntrySpot = decodeURIComponent(entry);
    if (queryArray.has('texture') && texture !== '') {
        defaultTexture.src = decodeURIComponent(texture);
        // try {
        //     defaultTexture = JSON.parse(JSON.stringify(texture));
        // } catch (e) {
        //     console.warn(e);
        // }
    }
}


console.log(defaultTexture);
let nextEntry_02 = defaultSpots[defaultEntrySpot];
if (!nextEntry_02) nextEntry_02 = defaultSpots.minecraft;
// two ways to config hotSpotMap
// way 1: manual config
const returnsTexture = window.structuredClone ? window.structuredClone(defaultTexture) : JSON.parse(JSON.stringify(defaultTexture));
defaultSpots.global_map.entry.push(nextEntry_02);  // defaultTexture.entry.push Infinity loop.
nextEntry_02.entry.push(returnsTexture);  // loop back
// // way 2: callback config
// three._mods.mapSpotSetter(defaultTexture, (backupTexture)=> {
//     defaultTexture.entry.push(nextEntry_02);
//     nextEntry_02.entry.push(backupTexture);  // loop back
// });

if (defaultModel) {
    const diyModel = new threeView();
    diyModel.animateInit({
        _scene: {
            antialias: true,
            // AxesHelper: 500,
        },
        _camera: {
            fov: 58,
            fovs: 88,
            far: 9999,
            x: 500,
            y: 200,
            z: 300,
            // helper: 500,
        },
        _lights: {
            hemisphere: {
                // intensity: 1,
            },
            directional: {
                enabled: true,
                // intensity: 1,
                y: 500,
            }
        },
        _control: {
            enableFOVZoom: true,
            // enablePan: true,
            FOVZoomConf: {
                min: 30,
                max: 90,
                // step: 2,
                // debug: true,
            },
            rotateSpeed: 0.5,
            maxPolarAngle: 0.98 * (Math.PI / 2),
            autoRotate: true,
        },
        load: {
            dom: document.querySelector('.diyModel'),
            // model: './assets/3d/tesla_2018_model_3/scene.gltf',
            // model: './assets/3d/draco/tesla_2018_model_3_compresseds.glb',
            // model: './assets/3d/draco/tesla_cybertruck-x200_compresseds.glb',
            // model: './assets/3d/draco/apple_macbook_pro_16_inch_2021-x100_compresseds.glb',
            // model: './assets/3d/draco/mbti_enfp-textured-x200_compresseds.glb',
            model: './assets/3d/draco/mbti_enfp-x200_compresseds.glb',
            // path: '', // absolute url(online-res)
            // holder: '//imgs.2broear.com/2025/06/placeholder.jpg',
            // env: [
            //     '//imgs.2broear.com/2025/06/right.webp',
            //     '//imgs.2broear.com/2025/06/left.webp',
            //     '//imgs.2broear.com/2025/06/tops.webp',
            //     '//imgs.2broear.com/2025/06/bottom.webp', //jpg
            //     '//imgs.2broear.com/2025/06/front.webp',
            //     '//imgs.2broear.com/2025/06/back.webp',
            // ],
        },
    }, (three)=> {
        
        // 配置热点
        let currentScene = defaultTexture;
        const defaultEntryArray = currentScene.entry || null;
        
        // 配置摄像机动画
        let cameraTransConf = three.config.animation.camera;
        
        // 重写移动端配置
        if (three._mods.mobileDevice()) {
            // rewrite default mobile fov
            const mobileFOV = three.config._camera?.fovs;
            if (mobileFOV && cameraTransConf?.fov?.to) cameraTransConf.fov.to = mobileFOV;
            // use sequenceImagesVideo(canvasTexture) insted of videoTexture
            defaultSpotArray = mobileSpotArray;
        }
        
        // 加载基础地面
        const floor = three._mods.meshLoader(new RingGeometry(0, 1024, 1024), new MeshPhongMaterial({ // MeshBasicMaterial not-receiving shadows, MeshPhongMaterial&MeshLambertMaterial works fine.
            color: 0xffffff,
            transparent: false,  // bug of(true) white-background when low-camera-deg of plane
        }), (mesh)=> {
            mesh.position.y = -128;
            mesh.rotation.x = -Math.PI * 0.5;
            // 加载地面贴图
            three._mods.mapSingleLoader('floor-s3.jpg', (map)=> {
                mesh.material.map = map;
                mesh.material.needsUpdate = true;
            }, undefined, undefined, false);
        }); //, false
        
        // 加载基础（透明）球体
        const sphere = three._mods.meshLoader();
        sphere.material.transparent = true;
        sphere.material.opacity = 0;
        
        // 添加球体热点 load childEntryArray
        three._mods.mapSpotCreator(defaultEntryArray, defaultSpotArray, null, undefined, true, false);  // set @depthTest as true, @spotAnimator as false
        
        // 添加球体事件处理器（射线投射器）
        three._mods.clickSphereEvent(sphere, currentScene, defaultTexture, defaultSpotArray, cameraTransConf); //, true set sphere material as transparent
        
        // 加载自定义贴图
        three._mods.mapSingleLoader(defaultTexture.src, (map)=> loadback(map), undefined, (err)=> loadback());
        function loadback(map) {
            if (map) {
                // three.scene.background = map;  // 设置背景贴图
                // three.scene.environment = map;  // 设置环境贴图
                // floor.material.envMap = map;
                sphere.material.transparent = false;
                sphere.material.opacity = 1;
                sphere.material.map = map;
                sphere.material.needsUpdate = true;
                // 缓存贴图
                three.cacheControlSet(defaultTexture.src, map);
            }
            
            // 载入其余贴图
            if (three.config.load.all && defaultTexture.entry.src) {
                const defaultEntrySrc = three._mods.entrySrcFinder(defaultTexture.entry);
                // !!!do NOT update all-required load counts, this should be a silent behavior.
                // if (three.config.load.all) three.config.load.counts = defaultEntrySrc.length;
                three._mods.mapMultiLoader(defaultEntrySrc, ()=>console.log('all map cached.', three.caches));
            }
            
            // 载入模型文件
            if (!defaultModel) defaultModel = three.config.load.model;
            three._mods.loadModel(defaultModel, (model)=> {
                const target = model.scene;
                const modelSize = three._mods.getModelSize(target);
                // const modelSizeZ = modelSize.max.z - modelSize.min.z;
                const modelSizeX = modelSize.max.x - modelSize.min.x;
                // add model to scene
                three.scene.add(target);
                // adjust floor/context(if available) position to lowest-side
                floor.position.y = modelSize.min.y; //target.position.y = modelSize.max.y;
                floor.position.y = modelSize.min.y; //target.position.y = modelSize.max.y;
                // // setup autoRotate after model loaded(with config on)
                // three.config._control.autoRotate = three.control.autoRotate = true;
                
                // 配置模型粗糙度
                three._mods.getModelPart(target, (mesh)=> {
                    mesh.material.roughness = 0.15;
                    mesh.material.metalness = 0.15;  // flash-performance issue
                });
                
                // 配置灯光
                // wave droplight
                const dropHeight = modelSizeX * 4;
                const dropLight = three._mods.setupSceneLights('PointLight', {
                    colors: 'white',
                    intensity: 20,
                    distance: dropHeight,
                    x: 0,
                    y: (dropHeight-modelSize.min.y) / 1.5,
                    z: 0,
                    angle: dropHeight * 1.5,
                    decay: 0.1,
                    // castShadow: true,
                    shadow: {
                        // mapSize: {
                        //     width: 1024,
                        //     height: 1024
                        // },
                        camera: {
                            near: three.config._camera.near,
                            far: three.config._camera.far
                        }
                    }
                });
                // // lamp lights
                // let spotLightConf = {
                //     colors: 'white',
                //     intensity: 1500,
                //     distance: 1000,
                //     decay: 0.55,
                //     angle: 0.25,
                //     x: 0,
                //     y: 0,
                //     z: -50,
                //     targets: {
                //         x: 58,
                //         y: -18,
                //         z: -1000,
                //     },
                //     visible: false,
                // };
                // const lampLight = three._mods.setupSceneLights('SpotLight', spotLightConf, true);
                // spotLightConf.targets.x = -58;
                // const lampLights = three._mods.setupSceneLights('SpotLight', spotLightConf, true);
                // // head Lights
                // let pointLightConf = {
                //     colors: 'white',
                //     intensity: 3500,
                //     decay: 2,
                //     x: modelSize.min.y,
                //     y: 0,
                //     z: modelSize.min.z,
                //     // helper: 50,
                // };
                // const headLight = three._mods.setupSceneLights('PointLight', pointLightConf, true);
                // pointLightConf.x = modelSize.max.y;
                // const headLights = three._mods.setupSceneLights('PointLight', pointLightConf, true);
                // // red tail light
                // pointLightConf.colors = 'red';
                // pointLightConf.intensity = 5000;
                // pointLightConf.x = modelSize.min.y;
                // pointLightConf.y = 20;
                // pointLightConf.z = modelSize.max.z;
                // const tailLights = three._mods.setupSceneLights('PointLight', pointLightConf, true);
                // pointLightConf.x = modelSize.max.y;
                // const tailLight = three._mods.setupSceneLights('PointLight', pointLightConf, true);
                
                // /*** SETUP MESHS && SHADOWS ***/
                // // enable shadowMap&floor shadow receiver
                three.renderer.shadowMap.enabled = floor.receiveShadow = true;
                // // common shadowMapMaterial(note:doNOT use same on MeshBasicMaterial but conf, caused same material.needsUpdate)
                // const configShadow = {
                //     color: 0x000000,
                //     transparent: true,
                // };
                // let squareShadow;
                // let cuboidShadow;
                
                // // Sphere
                // const sphere = three._mods.meshLoader(new SphereGeometry(88, 100, 100), new MeshPhongMaterial({
                //     color: 0xffffff,
                // }), (mesh)=> {
                //     mesh.position.x = modelSizeX;
                //     mesh.position.y = 10;
                //     squareShadow = three._mods.meshLoader(new PlaneGeometry(200, 200), new MeshBasicMaterial(configShadow), (mesh)=> {
                //         mesh.position.x = modelSizeX;
                //         mesh.position.y = modelSize.min.y + 1;
                //         mesh.rotation.x = - Math.PI * 0.5;
                //     }, false, false);
                // });
                // // Cuboid
                // const cuboid = three._mods.meshLoader(new BoxGeometry(88, modelSize.max.y, modelSizeZ), new MeshPhongMaterial({
                //     color: 0xffffff,
                // }), (mesh)=> {
                //     mesh.position.x = -modelSizeX;
                //     mesh.position.y = -44;
                //     cuboidShadow = three._mods.meshLoader(new PlaneGeometry(88*1.5, modelSizeZ*1.3), new MeshBasicMaterial(configShadow), (meshs)=> {
                //         meshs.position.x = mesh.position.x;
                //         meshs.position.y = modelSize.min.y + 1;
                //         meshs.rotation.x = - Math.PI * 0.5;
                //     }, false, false);
                // });
                
                // // Model
                // const modelShadow = three._mods.meshLoader(new PlaneGeometry(modelSizeX, modelSizeZ), new MeshBasicMaterial(configShadow), (mesh)=> {
                //     mesh.position.y = modelSize.min.y + 1;
                //     mesh.rotation.x = - Math.PI * 0.5;
                // }, false, false);
                // three._mods.getModelPart(['primary', 'JUST_BLACK', 'dvorright', 'mirror', 'movsteer'], (mesh)=> {
                //     mesh.castShadow = true; // mesh.receiveShadow = true; // receive shadow from other lights (occure wave-issue)
                // }, true);
                
                target.traverse(child=> {
                    if(child.isMesh) child.castShadow = true; // child.receiveShadow = true;
                });
                
                // // CAST SHADOW SET(rtr)
                // sphere.castShadow = cuboid.castShadow = true;
                // // cast lots of performance issue!!
                dropLight.castShadow = true;
                // // MUST setup shadow mapSize incase of Performance issue
                dropLight.shadow.mapSize.set(2048, 2048);
                // // three.renderer.shadowMap.autoUpdate = false;
                // // three.renderer.shadowMap.needUpdate = true;
                
                // /*** SETUP MESH MATERIALS  ***/
                // const materialList = ['floor-s3.jpg', 'entrance.png', 'floor3.jpg', 'shadow.png', 'shadows.png'];
                // three._mods.mapMultiLoader(materialList, ()=> {
                //     console.log('all done?', materialList);
                // }, (map, src, loaded)=> {
                //     console.debug(`loading ${src}[${loaded}]..`);
                //     materialList[src] = map; // loadBack by ordering issue!..!
                //     if (loaded === materialList.length) {
                //         const materialLists = materialList;
                //         // console.log(materialList, materialLists[materialList[3]].uuid);
                //         floor.material.map = materialLists[materialList[0]];
                //         sphere.material.map = materialLists[materialList[1]];
                //         cuboid.material.map = materialLists[materialList[2]];
                //         // apply updates
                //         floor.material.needsUpdate = sphere.material.needsUpdate = cuboid.material.needsUpdate = true;
                //         // shadow mesh(square)
                //         squareShadow.material.map = materialLists[materialList[4]];
                //         squareShadow.material.needsUpdate = true;
                //         three.scene.add(squareShadow);
                //         // shadow meshs
                //         [modelShadow, cuboidShadow].forEach((mesh)=> {
                //             mesh.material.map = materialLists[materialList[3]];
                //             mesh.material.needsUpdate = true;
                //             three.scene.add(mesh);
                //             // console.log(mesh.material.map.uuid)
                //         });
                //     }
                // });
                // const materialComps = {
                //     metal: ['bonnet_ok_primary_0', 'door_lf_primary_0', 'door_lr_primary_0', 'door_rf_primary_0', 'door_rr_primary_0', 'body_primary_0', 'boot_primary_0', 'wheels_wheels4_0','wheels001_wheels4_0', 'wheels_wheels6_0','wheels001_wheels6_0', 'hub_lf_hub_rf0_0','hub_lb_hub_rb0_0'],
                //     glass: ['windscreen_ok_glass0_0', 'door_lf_glass0_0','door_lr_glass0_0', 'door_rf_glass0_0','door_rr_glass0_0', 'glass_glass0_0', 'glass_glass1_0'],
                //     mirror: ['door_lf_mirror_inside0_0', 'door_rf_mirror_inside0_0', 'mirror_inside_mirror_inside0_0'],
                //     plasticGlass: ['tembus_depan_ok_tembus_red0_0', 'tembus_belakang_tembus_red0_0', 'tembus_boot_ok_tembus_red0_0', 'aluminium_light_aluminium_light0_0', 'rear_lights_right_rear_light_0', 'rear_lightsl_left_rear_light_0', 'rear_lightsr_right_rear_light_0', 'movsteer', 'hitam006_black_lights0_0', 'cahrome_movsteer_101_0'],
                //     hidden: ['door_lf_door_lf5_0'],  // door_lf_door_lf5_0 is a model-bug of plastic-but-glass
                // }
                // // const glassWithoutWindsheld = materialComps.glass.filter((item)=>item!=='windscreen_ok_glass0_0');
                // three._mods.getModelPart(materialComps.hidden, (mesh)=>mesh.visible=false);
                // three._mods.getModelPart(materialComps.glass.concat(materialComps.plasticGlass), (mesh)=>mesh.material.roughness=0);
                // three._mods.getModelPart(materialComps.metal, (mesh)=> {
                //     mesh.material.roughness = 0.15;
                //     mesh.material.metalness = 0.55;
                // });
                // three._mods.getModelPart(materialComps.glass, (mesh)=> {
                //     mesh.material.transparent = true;
                //     mesh.material.opacity = 0.78;
                // });
                // three._mods.getModelPart('windscreen_ok_glass0_0', (mesh)=> {
                //     mesh.material = new MeshBasicMaterial({
                //         color: 0x000000,
                //         transparent: true,
                //         opacity: 0.72
                //     });
                //     mesh.material.dispose();
                // });
                // three._mods.getModelPart('mirror_inside', (mesh)=> { //materialComps.mirror
                //     mesh.material = new MeshPhongMaterial({
                //         color: 0xffffff,
                //         transparent: true,
                //         envMap: map
                //     });
                //     mesh.material.dispose();
                // }, true);
                // three._mods.setModelMaterial('wheels', '#1a1a1a');
    
                // // ADD CAMERA TRANSITIONS
                // three._mods.cameraTransform({
                //     stiffness: 0.2,
                //     damping: 0.3,
                //     thresholdRatio: 0.1,
                //     x: {
                //         from: -800,
                //         to: 400,
                //     },
                //     y: {
                //         from: 500,
                //         to: -0.1,
                //     },
                //     z: {
                //         from: 500,
                //         to: -500,
                //     },
                //     fov: {
                //         from: 100,
                //         to: 70,
                //     },
                // }, () => {
                //     /*** SETUP Extra EVENTS  ***/
                //     // const setWheelsAngle = (deg = -26)=> {
                //     //     three._mods.getModelPart('wheels', (obj)=> {
                //     //         obj.rotation.z = deg;
                //     //     }, true, 'Object3D');
                //     // };
                //     // setWheelsAngle();
                    // let waveCounter = 0;
                    // const waveLights = (delta, speed=1, reverse=false)=> {
                    //         waveCounter += delta; // * speed
                    //         let sin = Math.sin(waveCounter) * 300,
                    //             cos = Math.cos(waveCounter) * 200;
                    //         dropLight.position.x = reverse ? sin : cos;
                    //         dropLight.position.z = reverse ? cos : sin;
                    //         // dropLight.target.position.z = Math.sin(waveCounter) * 100;
                    //         // sphere.rotation.z = Math.sin(waveCounter) * 10;
                    //         // console.log(waveCounter);
                    //     };
                //     const switchLights = (t)=> {
                //         let openStatu = t.dataset.action,
                //             materialShine = new MeshPhongMaterial({
                //                 color: 0xffffff,
                //                 emissive: 0xffffff,
                //                 emissiveIntensity: 1,
                //                 transparent: false,
                //                 // opacity: 1,
                //             }),
                //             materialHidden = new MeshPhongMaterial({
                //                 // color: 0xffffff,
                //                 transparent: true,
                //                 opacity: 0.15,
                //             });
                //         lampLight.visible = lampLights.visible = headLight.visible = headLights.visible = tailLight.visible = tailLights.visible = openStatu ? openStatu : false;
                //         three._mods.setModelMaterial('tembus_', '', false, (mesh)=> {
                //             if(!mesh.materialOrigin) mesh.materialOrigin = mesh.material;  // backup of origin material at first time
                //             mesh.material = openStatu ? materialHidden : mesh.materialOrigin;
                //         });
                //         three._mods.setModelMaterial('aluminium_light', '', false, (mesh)=> {
                //             if(!mesh.materialOrigin) mesh.materialOrigin = mesh.material;  // backup of origin material at first time
                //             mesh.material = openStatu ? materialShine : mesh.materialOrigin;
                //         });
                //     };
                //     const runWheels = (speed=0.05, reverse=false)=> {
                //         three._mods.setModelMaterial('wheels', '', null, (mesh)=> {
                //             if(reverse) {
                //                 mesh.rotation.x += speed;
                //                 return;
                //             }
                //             mesh.rotation.x -= speed;
                //         });
                //     };
                //     const useArguments = function(fn, ...args) {
                //         // console.log(args);
                //         return function() {
                //             if(fn&&typeof fn==='function') fn?.(...args);
                //         }
                //     }
                //     // bind dom events(inside diyModel Callback)
                //     three._util.events.bind(document.querySelector('.carControls'), 'click', (e)=> {
                //         let t = e.target;
                //         if(t.parentNode.classList.contains('setColors')) {
                //             three._mods.setModelMaterial('primary', t.style.color);
                //         }
                //         if(!t.id) return;
                //         t.dataset.action = t.dataset.action ? '' : true; // common status setup
                //         switch (t.id) {
                //             case 'switchLights': switchLights(t);
                //                 break;
                //             case 'setRotation':
                //                 if(t.dataset.action) {
                //                     t.textContent = 'unsetRotation';
                //                     diyModel.control.autoRotate = t.dataset.action;
                //                 }else{
                //                     t.textContent = 'setRotation';
                //                     diyModel.control.autoRotate = false;
                //                 }
                //                 break;
                //             case 'waveLights':
                //                 three.config.animation.list.waveLights = t.dataset.action ? useArguments(waveLights, 0.025) : null;
                //                 break;
                //             case 'runWheels':
                //                 three.config.animation.list.runWheels = t.dataset.action ? runWheels : useArguments(runWheels, 0.01, true);
                //                 break;
                //             default:
                //                 break;
                //         }
                //     });
    
                //     // wave dropLight
                    three.scene.add(dropLight);
                    // three.config.animation.list.waveLights = waveLights;
                //     // switchLights
                //     const lightSwitcher = document.querySelector('.carControls .btns#switchLights');
                //     lightSwitcher.dataset.action = true;
                //     switchLights(lightSwitcher);
                // });
                
                // auto-focus on first-frame of animateLoop for performance-mode(setTimeout as async)
                if (!three.config._control.autoRotate) setTimeout(()=> three.animateStop(), 100);
            }, true); // use Draco-compressed model by setup loadModel@dracoLoad: true
        }
    });
} else {
    // init threeObj
    const threejsInstance = new threeView();
    threejsInstance.animateInit({
        _camera: {
            fov: 66,
            fovs: 88,
            // far: 1999,
            x: -1,
            y: 0,
            z: -1,
        },
        _control: {
            autoRotate: true,
            enableFOVZoom: true,
            // enablePan: true,
            FOVZoomConf: {
                min: 20,
                max: 80,
                step: 2,
                // debug: true,
            },
        },
        _lights: {
            hemisphere: {
                intensity: 2,
                // y: 10,
            },
            directional: {
                enabled: true,
                // colors: 'blue',
                y: -3,
                z: -1,
            }
        },
        load: {
            dom: document.querySelector('.fullviews'),
            all: true,
            // path: '', // absolute url(online-res)
            // holder: '//imgs.2broear.com/2025/06/placeholder.jpg',
            // env: [
            //     '//imgs.2broear.com/2025/06/right.webp',
            //     '//imgs.2broear.com/2025/06/left.webp',
            //     '//imgs.2broear.com/2025/06/tops.webp',
            //     '//imgs.2broear.com/2025/06/bottom.webp', //jpg
            //     '//imgs.2broear.com/2025/06/front.webp',
            //     '//imgs.2broear.com/2025/06/back.webp',
            // ],
        },
        etc: {
            debug: {
                // enabled: true,
            },
            tween: {
                // enabled: true,
            }
        },
        animation: {
            camera: {
                // enabled: false,
                // debug: true,
                stiffness: 0.25,
                damping: 0.2,
                thresholdRatio: 0.015,
                tween: true,  // tween.js
                x: {
                    from: -100,
                    to: 100,
                },
                z: {
                    from: 100,
                    to: 0.1,
                },
                y: {
                    from: 450,
                    to: -0.1,
                },
                fov: {
                    from: 120,
                    to: 60,
                },
            }
        },
        context: {
            // load: {
            //     common: 'Loading..',
            //     model: 'Loading model..',
            //     texture: 'Loading textures..',
            //     textures: 'Loading(Multiple) scene textures..',
            //     enviroment: 'Loading enviroment textures..',
            //     done: 'All loaded',
            // },
            // video: {
            //     play: 'Playing video..',
            //     paused: 'Video paused',
            // },
            // errors: {
            //     load: 'Error loading resources!',
            //     video: 'Error playing video!',
            //     canvas: 'Your browser does not support Canvas, Please upgrade!',
            //     worker: 'Your browser does not support Worker Thread, Please upgrade!',
            //     request: 'Request denied(repeat)! wait a sec, another request in progress..',
            // }
        }
    }, (three)=> {
        
        // 配置热点
        let currentScene = defaultTexture;
        const defaultEntryArray = currentScene.entry || null;
        
        // 配置摄像机动画
        let cameraTransConf = three.config.animation.camera;
        
        // 重写移动端配置
        if (three._mods.mobileDevice()) {
            // rewrite default mobile fov
            const mobileFOV = three.config._camera?.fovs;
            if (mobileFOV && cameraTransConf?.fov?.to) cameraTransConf.fov.to = mobileFOV;
            // use sequenceImagesVideo(canvasTexture) insted of videoTexture
            defaultSpotArray = mobileSpotArray;
        }
        
        // 加载基础（透明）球体
        const sphere = three._mods.meshLoader();
        sphere.material.transparent = true;
        sphere.material.opacity = 0;
        
        // 加载自定义贴图
        three._mods.mapSingleLoader(defaultTexture.src, (map)=> loadback(map), undefined, (err)=> loadback());
        
        function loadback(map) {
            if (map) {
                // 载入贴图
                sphere.material.transparent = false;
                sphere.material.opacity = 1;
                sphere.material.map = map;
                sphere.material.needsUpdate = true;
                // 缓存贴图
                three.cacheControlSet(defaultTexture.src, map);
            }
            
            // 载入其余贴图
            if (three.config.load.all && defaultTexture.entry.src) {
                const defaultEntrySrc = three._mods.entrySrcFinder(defaultTexture.entry);
                // !!!do NOT update all-required load counts, this should be a silent behavior.
                // if (three.config.load.all) three.config.load.counts = defaultEntrySrc.length;
                three._mods.mapMultiLoader(defaultEntrySrc, ()=>console.log('all map cached.', three.caches));
            }
            
            // 添加热点
            three._mods.mapSpotCreator(defaultEntryArray, defaultSpotArray);  // load childEntryArray
            
            // 添加动画
            three._mods.cameraTransform(cameraTransConf, () => {
                // const lightIntensity = 0;
                // const lightMinimun = 1;
                // let incrementing = true,
                //     lightCounter = lightIntensity;
                // three.config.animation.list.lightsAnimation = (delta, speed = 0.5)=> {
                //     const adjustedSpeed = speed * delta;
                //     if (incrementing) {
                //         lightCounter += adjustedSpeed;
                //         if (lightCounter >= lightIntensity) incrementing = false;
                //     } else {
                //         lightCounter -= adjustedSpeed;
                //         if (lightCounter <= lightMinimun) incrementing = true;
                //     }
                //     // three.lights.hemisphere.intensity = lightCounter;
                //     Object.values(three.lights).forEach((light)=> {
                //         light.intensity = lightCounter;
                //     });
                //     // console.log(lightCounter)
                // };
                
                if (!currentScene?.entry || currentScene?.entry?.length === 0) {
                    console.log('no entry on currentScene', currentScene);
                    return;
                }
                
                // 更新通用转场动画配置
                cameraTransConf = {
                    // enabled: false,
                    stiffness: 0.35,
                    damping: 0.15,
                    thresholdRatio: 0.025,
                    // tween: true,  // tween.js
                    // easeFn: TWEEN.Easing.Cubic,
                    // easeType: 'Out',
                    // easeDelay: 1500,
                    x: {
                        from: 1,
                        to: 0.5,
                    },
                    z: {
                        from: -1,
                        to: 0.1,
                    },
                    y: {
                        from: -0.1,
                        to: 0.1,
                    },
                }
                // 添加（基础球体）事件处理器（射线投射器）
                three._mods.clickSphereEvent(sphere, currentScene, defaultTexture, defaultSpotArray, cameraTransConf);
            });
        }
    });
    // const diyModel = new threeView();
    // console.log(1,diyModel)
}