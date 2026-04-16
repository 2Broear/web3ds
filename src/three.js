
import * as TWEEN from '@tweenjs/tween.js';
import {
    _Closure, _EventBus, _Basics, //_events,
    FovDampingSystem, DampedEaseSystem, SequenceImagesVideo, VisibilityObserver,
} from './utils.js';
import {
    Scene, WebGLRenderer, PerspectiveCamera,
    HemisphereLight, DirectionalLight, SpotLight, PointLight,
    // HemisphereLightHelper, DirectionalLightHelper, SpotLightHelper, PointLightHelper,  // build size issue
    // CameraHelper, GridHelper, AxesHelper,  // build size issuess
    Clock, Box3, MathUtils, 
    Color, Raycaster, Vector2, //Vector3,
    BoxGeometry, SphereGeometry, PlaneGeometry, RingGeometry,
    Mesh, MeshBasicMaterial, MeshStandardMaterial, MeshPhongMaterial,
    TextureLoader, CubeTextureLoader, DataTexture, VideoTexture, CanvasTexture, 
    HalfFloatType, RGBAFormat, SRGBColorSpace, LinearFilter, EquirectangularReflectionMapping, //LinearSRGBColorSpace, 
    DoubleSide, //FrontSide, BackSide, RepeatWrapping
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';  // build size issue
// import { THREE_GetGifTexture } from "threejs-gif-texture";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';  // build size issue
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';  // compressed size

class threeBase {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.control = null;
    }
    
    setupScene (_scene) {
        try {
            this.scene = new Scene();
            this.renderer = new WebGLRenderer(_scene);
            this.renderer.setSize(this.config.load.size.width, this.config.load.size.height);
            this.config.load.dom.appendChild(this.renderer.domElement);
        } catch (e) {
            console.warn("检查 WebGL 2.0 是否可用！（safari浏览器勾选：开发->试验性->WebGL2.0）", e);
        }
        if (_scene.GridHelper) this.scene.add(new GridHelper(_scene.GridHelper));
        if (_scene.AxesHelper) this.scene.add(new AxesHelper(_scene.AxesHelper));
    }
    
    setupCamera (_camera) {
        const width = _camera?.width || this.config.load.size.width;
        const height = _camera?.height || this.config.load.size.height;
        if (this._mods.mobileDevice()) {
            const mobileFOV = this.config._camera?.fovs;
            if (mobileFOV) _camera.fov = mobileFOV;
        }
        // important of _camera.width & _camera.height: adjust camera
        const camera_ = new PerspectiveCamera(_camera.fov, width / height, _camera.near, _camera.far);
        this.camera = this._util.basics.confRewriter(_camera, camera_);
        this.camera.position.set(_camera.x, _camera.y, _camera.z);
        if (_camera.helper) this.scene.add(new CameraHelper(this.camera));
    }
    
    setupLight(_lights) {
        if (_lights.directional.enabled) this._mods.setupSceneLights('DirectionalLight', _lights.directional, true);
        if (_lights.hemisphere.enabled) this._mods.setupSceneLights('HemisphereLight', _lights.hemisphere, true);
        if (_lights.spot.enabled) this._mods.setupSceneLights('SpotLight', _lights.spot, true);
    }
    
    setupControl(_control, reset = false) {
        if (!reset) {
            // overwrite _control
            const controls_ = new OrbitControls(this.camera, this.renderer.domElement);
            this.control = this._util.basics.confRewriter(_control, controls_);
            // setup fps limits
            this.config.animation.list.FPSLimiter = (delta, callback)=> {
                // const delta = this.config.etc.clock.getDelta();  // delta required
                const fps = this.config.etc.fps || (1 / delta);
                const singleFrameTime = 1 / fps;
                this.config.etc.ts += delta;
                if (this.config.etc.ts > singleFrameTime) {
                    // callback?.(delta);
                    this.renderer.render(this.scene, this.camera);
                    this.control.update(delta);
                    this.config.etc.ts = (this.config.etc.ts % singleFrameTime);
                }
                // console.log(`两帧渲染时间间隔 ${delta*1000} ms；每秒渲染频率 ${1/delta} ms`);
            };
        }
        let FOVZoomConf = _control.FOVZoomConf;
        if (this._mods.mobileDevice()) {
            console.log('enableZoom/rotateReverse of OrbitControl for mobile control');
            // enable orbit zooms
            this.control.enableZoom = true;
            // enable reverse rotate (slowed)
            this.control.rotateSpeed = - (this.control.rotateSpeed / 2);
            // FOVZoomConf.rotateReverse = true;  // no need to config FOVZoomConf on return↓↓↓
            return;
        }
        // use of fov-controler for zoom/in/out
        if (_control.enableFOVZoom) {
            // this.control.enableZoom = false;  // disable orbitControl zooms
            // incase of repeat-add-events performance issue
            if (reset) this._util.events.unbind(this.renderer.domElement, 'wheel', this._events.FOVDamper);
            // must re-constract FOVDamper at each reset[FOV] controls..
            this._mods.FOVDamper = new FovDampingSystem(this.camera, this.control, FOVZoomConf);
            // init FOVEvents before add events
            this._events.FOVDamper = (event)=> {
                event.deltaY > 0 ? this._mods.FOVDamper.zoomOut() : this._mods.FOVDamper.zoomIn();
                event.preventDefault();
            };
            this._util.events.bind(this.renderer.domElement, 'wheel', this._events.FOVDamper);
            // loopAnimation callback 
            this.config.animation.list.FOVDamper = (delta)=> {
                this._mods.FOVDamper.update(delta);
                // !!!this.camera will always updateProjectionMatrix() if enableFOVZoom (mobile disabled)
                this.camera.updateProjectionMatrix();
            };
            return;
        }
        // use basic fov controller (only if enableZoom disabled)
        if (false === this.control.enableZoom) {
            this._util.events.bind(this.renderer.domElement, 'wheel', (event)=> {
                event.preventDefault();
                const delta = Math.sign(event.deltaY); // 1或-1
                // 计算新FOV
                let newFov = this.camera.fov + (delta * FOVZoomConf.step);
                newFov = MathUtils.clamp(newFov, FOVZoomConf.min, FOVZoomConf.max);
                // 应用并更新
                this.camera.fov = newFov;
                this.camera.updateProjectionMatrix();
            });
        }
    }
}

class threeView extends threeBase {
    // #config = this.config;  new Map()
    static _config = {
        _scene: {
            antialias: false,
            GridHelper: false,
            AxesHelper: false,
        },
        _camera: {
            fov: 60,
            near: 1,
            far: 2048,
            x: 0.1,
            y: 0,
            z: 0.1,
        },
        _lights: {
            hemisphere: {
                enabled: true,
                helper: 0,
                colors: 'white',
                intensity: 0.5,
                x: 0,
                y: 0,
                z: 0,
                // position: new Vector3(0, 0.1, 0),
            },
            directional: {
                enabled: false,
                helper: 0,
                colors: 'white',
                intensity: 0.5,
                x: 0,
                y: -1,
                z: 0,
                // position: new Vector3(0, 0.1, 0),
            },
            spot: {
                enabled: false,
                helper: 0,
                colors: 'white',
                targets: {
                    x: 0,
                    y: 0,
                    z: 0
                },
            }
        },
        _control: {
            enableFOVZoom: false,
            enableDamping: true,
            minPolarAngle: 0,
            maxPolarAngle: Math.PI,
            // enableDamping: false,
            // dampingFactor: 0.01,
            // zoomDampingFactor: 0.15,
            // zoomToCursor: true,
            // rotateSpeed: -0.1,  // set nagative as standard reverse mobile roatation
            enablePan: false,
            enableZoom: false,
            zoomSpeed: 10,
            autoRotate: false,
            autoRotateSpeed: 1,
            maxDistance: 450,
            minDistance: 0,
            // minZoom: 1,
            // maxZoom: 2,
            // target: new Vector3(0, 0, 0),
        },
        context: {
            load: {
                common: '加载中..',
                model: '载入模型文件..',
                texture: '载入贴图资源..',
                textures: '连载（静默）场景贴图..',
                enviroment: '载入环境贴图..',
                done: '已载入全部内容',
            },
            video: {
                play: '视频开始播放..',
                paused: '视频暂停播放',
            },
            errors: {
                load: '资源载入异常！',
                video: '视频播放异常！',
                canvas: '你的浏览器不支持CANVAS画布，建议升级！',
                worker: '你的浏览器不支持WORKER线程，建议升级！',
                request: 'Request denied(repeat)! wait a sec, another request in progress..',
            },
            classes: {
                loading: 'vloading',
                grabbing: 'grabbing',
                enter: 'enterable',
                pause: 'paused',
                videoTexture: 'map',
            }
        },
        etc: {
            ts: 0,
            fps: 0,
            raf: 0,
            last: 0,
            delta: Date.now(),
            clock: new Clock(),
            debug: {
                enabled: false,
                raycaster: new Raycaster(),
                mouse: new Vector2(),
                ux: [],
                vy: [],
            },
            // tween: {
            //     enabled: false,
            //     delay: 3000,
            // }
        },
        load: {
            path: './assets/3d/texture/',
            size: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            dom: null, //document.querySelector('.container')
            all: false,
            model: null,
            count: 1,
            counts: 1,
            holder: 'placeholder.jpg',
            caches: {},
            lights: [],
            meshs: [],
            spots: [],
            env: [
                'cube/right.webp',
                'cube/left.webp',
                'cube/tops.webp',
                'cube/bottom.webp', //jpg
                'cube/front.webp',
                'cube/back.webp',
            ],
            // map: [{}],
            pends: new Map(), //[]
        },
        animation: {
            list: {},
            camera: {},
        },
    };
    
    constructor(conf) {
        super();
        this.config = threeView._config;
        // rewrite init config
        if (conf) {
            conf = Object.seal(conf);
            let config = { ...this.config };
            Object.freeze(this.config);
            let mixedConfig = {
                ...config,
                conf,
            };
            Object.defineProperty(this, 'config', {
                // value: mixedConfig,
                writable: false,
                configurable: false,
                enumerable: true,
                get() {
                    return mixedConfig;
                },
                set(value) {
                    if (typeof value !== 'Object') throw new Error('config must be an Object');
                    mixedConfig = value;
                },
            });
        }
    };
    
    // async init setups
    animateInit(conf, callback) {
        try {
            /**
            * init extends util mods
            */
            this.setupMethods();
            /**
            * setup threejs basic
            */
            // rewrite init conf
            // Object.freeze(this.config);
            // const presets = window.structuredClone ? window.structuredClone(threeView._config) : JSON.parse(JSON.stringify(threeView._config));
            this.config = this._util.basics.confRewriter(conf, this.config);
            // this.config = { ...this.config, conf };
            this.setupBasics();
            /**
            * add custom listeners
            */
            this.setupEvents();
            /**
            * start animateLoop!!!duplicated by visibilityChange init;
            */
            // this.animateLoop();
            /**
            * load CUBE env（performance issue）
            */
            // pre-load(init) default placeholder before cubeImgs
            this._mods.loadImages(this.config.load.holder, (img)=> {
                this.config.load.dom.style.cssText = `--vload-placeholder: url(${img.src}) center /cover;`;
                // callback
                const loadCubeTextureCallback = (map)=> {
                    // set as enviroment textures
                    this.scene.background = map;
                    callback?.(this);
                };
                this._mods.loadCubeTexture(this.config.load.env, loadCubeTextureCallback, loadCubeTextureCallback);
                // debug info
                console.log(this);
                window.three = this;
            }, this.config.load.path); //, true
        } catch (error) {
            console.log(error)
        }
    }
    
    animateLoop(performance = false) {
        if (this.config.etc.raf) cancelAnimationFrame(this.config.etc.raf);
        // const start = Date.now();
        // const delta = start - this.config.etc.delta;
        const delta = this.config.etc.clock.getDelta(); // delta for sync screen refresh-rates
        // const current = this.config.etc.clock.getElapsedTime();
        // const delta = current - this.config.etc.last;
        // this.config.etc.last = current;
        Object.values(this.config.animation.list).forEach(animate => {
            if(this._util.basics.detects.validFun(animate)) animate(delta, ...arguments);
        });
        // repeat animation..
        this.config.etc.raf = requestAnimationFrame(this.animateLoop.bind(this));
    }
    
    animateStop() {
        // reset raf
        cancelAnimationFrame(this.config.etc.raf);
        this.config.etc.raf = 0;
        console.log(`animating${this.config.etc.raf} paused..`); //, this
    }
    
    autoRotateStart() {
        // this.control.autoRotate = true; // auto conf
        this.control.autoRotate = this.config._control.autoRotate ? true : false; // manual conf
    }
    
    autoRotateStop() {
        this.control.autoRotate = false;
    }
    
    setupBasics(_conf) {
        // setup basics
        this.setupScene(this.config._scene);
        this.setupCamera(this.config._camera);
        this.setupLight(this.config._lights);
        this.setupControl(this.config._control);
        // set default loadPath
        this._util.loader.RGBE.path = this.config.load.path;
        this._util.loader.BASE.path = this._util.loader.CUBE.path = this.config.load.path;
        // enhance prototype of base loader
        Object.setPrototypeOf(this._mods.mapSingleLoader, {
            setPath: (path)=> {
                this._util.loader.BASE.setPath(path);
                this._util.loader.CUBE.setPath(path);
                this._util.loader.RGBE.setPath(path);
            }
        });
    }
    
    setupEvents() {
        
        const loader = this.config.load.dom;
        
        // global page visibility
        const visibilityObserver = new VisibilityObserver({
            threshold: 0.1, // 10%可见时触发
            rootMargin: '10px' // 提前10px检测
        });
        // start observe by default
        visibilityObserver.observe(loader, (entry) => this._mods.visibilityChange(entry.isVisible));  // console.log(`Element is ${entry.isVisible ? 'visible' : 'hidden'}, Visible ratio: ${entry.intersectionRatio}`); //, visibilityObserver, loader
        // global document visibility
        this._util.events.bind(document, 'visibilitychange', ()=> {
            const documentVisible = document.visibilityState === 'visible';
            // observe current tab && viewportVisibility
            if (documentVisible) {
                visibilityObserver.observe(loader, (entry) => {
                    const viewportVisible = entry.isVisible;
                    this._mods.visibilityChange(viewportVisible);
                    console.debug(`documentVisibility visible, observing viewportVisibility: ${viewportVisible}..`);
                });
                return;
            }
            // switch to another tab(hidden)
            visibilityObserver.unobserve();
            this._mods.visibilityChange(documentVisible);
            console.debug(`documentVisibility: ${documentVisible}, visibilityObserver disconnected..`);
        });
        
        // global window resize
        this._util.events.bind(window, 'resize', this._util.closure.debouncer(()=> {
            this.config.load.size.width = window.innerWidth;
            this.config.load.size.height = window.innerHeight;
            this.camera.aspect = this.config.load.size.width / this.config.load.size.height;
            // if (this._mods.mobileDevice()) 
                this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.config.load.size.width, this.config.load.size.height);
            console.log('window resized.', this)
        }, 500));
        
        // right click debug event
        if (this.config.etc.debug.enabled) {
            this._util.events.bind(loader, 'contextmenu', (events)=> {
                this._mods.mapUVEngager(events, this.config.load.meshs[0], (intersect)=> {
                    const intersectUV = intersect.uv;
                    const intersectPoint = intersect.point;
                    this.config.etc.debug.ux.push(intersectUV.x);
                    this.config.etc.debug.vy.push(intersectUV.y);
                    // debug of UV info
                    console.log(`[${Math.min(...this.config.etc.debug.ux)}, ${Math.max(...this.config.etc.debug.ux)}, ${Math.min(...this.config.etc.debug.vy)}, ${Math.max(...this.config.etc.debug.vy)}]`, intersectPoint);
                });
            });
        };
        
        // double click play&&pause video
        this._util.events.bind(loader, 'dblclick', this._util.closure.debouncer(()=> {
            this.autoRotateStop();
            // animate start/stop
            if (this.config.etc.raf) {
                loader.classList.add(this.config.context.classes.pause);
                this.animateStop();
            } else {
                loader.classList.remove(this.config.context.classes.pause);
                this.animateLoop();
                // start autoRotate(only if enabled autoRotate) after loop Animates(infinite loop issue)
                this.autoRotateStart();
            }
            // // selecte video every time on async callback
            // const videos = loader.querySelectorAll('video');
            // if (videos.length <= 0) return;
            // videos.forEach((video)=> {
            //     if (video.paused) {
            //         video.play().catch(e=>console.warn(this.config.context.errors.video, e));
            //         return;
            //     }
            //     video.pause();
            // });
        }, 500));
        
        // pointermvoe
        this._util.events.bind(loader, 'pointermove', this._util.closure.throttler((e)=> this._events?.pointermove?.(e), 100));
        
        // pointerdown
        let pointerCoords = {};
        this._util.events.bind(loader, 'pointerdown', (e)=> {
            loader.classList.add(this.config.context.classes.grabbing);  // settle grabbing cursor
            pointerCoords.x = e.clientX;
            pointerCoords.y = e.clientY;
            if (e.type === 'touchend') {
                const touch = e.changedTouches[0];
                pointerCoords.x = touch.touch.clientX;
                pointerCoords.y = touch.touch.clientY;
            };
            // additional pointerdown callback
            this._events?.pointerdown?.(e);
        });
        
        // pointerup
        this._util.events.bind(loader, 'pointerup', this._util.closure.debouncer((e)=> {
            loader.classList.remove(this.config.context.classes.grabbing);  // release grabbing cursor
            if (!pointerCoords.x || !pointerCoords.y) {
                console.warn('waitting for event(pointerdown) register..');
                return;
            }
            let pointerupX = e.clientX,
                pointerupY = e.clientY;
            if (e.type === 'touchend') {
                const touch = e.changedTouches[0];
                pointerupX = touch.clientX;
                pointerupY = touch.clientY;
            }
            if (parseInt(pointerupX) !== parseInt(pointerCoords.x) || parseInt(pointerupY) !== parseInt(pointerCoords.y)) {
                console.log('click abort on different click-origin');
                return;
            }
            // additional pointerup callback
            this._events?.pointerup?.(e);
        }));
    }
    
    setupMethods() {
        this._events = {};
        this._util = {
            closure: new _Closure(),
            events: new _EventBus(),
            basics: new _Basics(),
            loader: {
                BASE: new TextureLoader(),
                CUBE: new CubeTextureLoader(),
                RGBE: new RGBELoader(),
                GLTF: new GLTFLoader(),
                DRACO: new DRACOLoader(),
            },
        };
        this._mods = {
            validTexture: (map) => map && map.isTexture,
            mobileDevice: (maxWidth = 768)=> 'ontouchstart' in window || navigator.maxTouchPoints > 0, // || window.innerWidth <= maxWidth || document.body.clientWidth <= maxWidth
            visibilityChange: (visibleStatus, visibleObserver, observeTarget)=> {
                // console.log(visibleStatus);
                const videos = this.config.load.dom.querySelectorAll('video');
                const videosExists = videos.length > 0;
                if (false === visibleStatus) {
                    if (videosExists) videos.forEach((video)=>video.pause());
                    // incase of multi animateStop call..
                    if (this.config.etc.raf) this.animateStop();
                    this.autoRotateStop();
                    return;
                }
                // re-active all paused video
                if (videosExists) {
                    // console.log('replay videos', videos);
                    videos.forEach((video)=> {
                        video.play().catch(e=>console.warn(this.config.context.errors.video, e));
                        this.config.load.dom.classList.remove(this.config.context.classes.pause);
                    });
                }
                this.animateLoop();
                // start autoRotate(only if enabled autoRotate) after loop Animates(infinite loop issue)
                this.autoRotateStart(); //if (this.config._control.autoRotate) 
            },
            clickSphereEvent: (sphere, currentScene, defaultTexture, defaultSpotArray, cameraTransConf, transparency = false)=> {
                // 添加（自定义）事件处理器（射线投射器）
                if (!sphere) sphere = this._mods.meshLoader();
                if (transparency) {
                    // set MeshStandardMaterial incase of mapSwitchTransfer issue
                    sphere.material = new MeshStandardMaterial({
                        color: 0xffffff,
                        // envMap: map,
                        // map: map
                        transparent: true,
                        opacity: 0,
                    });
                }
                
                const eventLoader = this.config.load.dom;
                const enterClass = this.config.context.classes.enter;
                const autoRotateSpeed = this.control.autoRotateSpeed;
                // additional pointermove (hover)
                this._events.pointermove = (event)=> {
                    // if (!currentScene?.entry) {
                    //     console.log('no entry on scene', currentScene);
                    //     return;
                    // }
                    // console.log(currentScene);
                    const currentEntryArray = currentScene.entry;
                    const UVSObject = this._mods.entryUVRecorder(currentEntryArray);  // no update on currentScene
                    // console.log(currentEntryArray);
                    this._mods.mapUVEngager(event, sphere, (intersect)=> {
                        if (this._mods.mapUVEngaged(intersect.uv, UVSObject)) {
                            eventLoader.classList.add(enterClass);
                            if (this.control.autoRotate) this.control.autoRotateSpeed = autoRotateSpeed / 3; //0.23
                            return;
                        }
                        eventLoader.classList.remove(enterClass);
                        if (this.control.autoRotate) this.control.autoRotateSpeed = autoRotateSpeed;
                    });
                };
                
                // additional pointerup (clicked)
                this._events.pointerup = (event)=> {
                    eventLoader.classList.remove(enterClass);
                    this._mods.mapUVEngager(event, sphere, (intersect)=> {
                        if (!currentScene?.entry) {
                            console.warn('no entry on currentScene', currentScene);
                            return;
                        }
                        const intersectUV = intersect.uv;
                        const currentEntryArray = currentScene.entry;
                        // record entry uvs of currentEntryArray
                        const UVSObject = this._mods.entryUVRecorder(currentEntryArray);
                        // console.log(UVSObject)
                        const UVSObjectArray = Object.entries(UVSObject);
                        // console.log(currentEntryArray, currentScene.entry)
                        for (let i=0,vl=currentEntryArray.length; i<vl; i++) {
                            const eachEntry = currentEntryArray[i];
                            for (let j=0,ul=UVSObjectArray.length; j<ul; j++) {
                                const eachUVS = UVSObjectArray[j];
                                // console.warn(eachUVS[0], eachEntry.src)
                                if (eachUVS[0] !== eachEntry.meshs[0].uuid) {
                                    continue; //src
                                }
                                // current vev engaged
                                if (this._mods.mapUVEngaged(intersectUV, eachUVS[1])) {
                                    if (!eachEntry?.entry) {
                                        console.warn('no entry found on spot!', eachEntry);
                                        return;
                                    }
                                    // Recursion of previous(existent) entry
                                    if (!eachEntry?.entry || Object.keys(eachEntry?.entry).length === 0) {
                                        let existEntryScene;
                                        if (eachEntry?.src) {
                                            existEntryScene = this._mods.entryCacheSeeker(eachEntry.src, defaultTexture);
                                        } else {
                                            console.warn('no src found on entry, searching env insted..', eachEntry.entry);
                                            if (!eachEntry.env || !Array.isArray(eachEntry.env) || !eachEntry.env[0]) {
                                                console.log(`updating empty env[${eachEntry.env}] to defaults..`, this.config.load.env);
                                                // update both-env env to defaults for entryCacheSeeker compares
                                                eachEntry.env = defaultTexture.env = this.config.load.env;
                                            }
                                            existEntryScene = this._mods.entryCacheSeeker(eachEntry.env[0], defaultTexture);
                                            // return;
                                        }
                                        if (existEntryScene && existEntryScene?.entry[0]) {
                                            eachEntry.entry = existEntryScene.entry; //eachEntry = existEntryScene;
                                            console.log('redirect scene with exists entry', existEntryScene);
                                        } else {
                                            console.log('none cached-scene was found on entryCacheSeeker.')
                                        }
                                    }
                                    
                                    // disable all-previous symbols(click on uvs only)
                                    this._mods.mapSpotClear(currentEntryArray);
        
                                    // enable(create) all-current symbols // only IF child-entry exists(incase no entry as return)
                                    const childEntryArray = eachEntry?.entry ? eachEntry.entry : null;
                                    const mapSwitchCallback = ()=> {
                                        // update(always) currentScene
                                        currentScene = eachEntry;
                                        // load new(cached) map/hotspot/env
                                        this._mods.mapSpotCreator(childEntryArray, defaultSpotArray, currentScene, undefined, true);
                                    }
        
                                    // load transparent map
                                    if (!eachEntry?.src) {
                                        console.warn('invalid entry src.', eachEntry);
                                        this._mods.mapSwitchTransfer(sphere, null, mapSwitchCallback);
                                        this._mods.cameraTransform(cameraTransConf);  // cameraTransform animation(concurrent with mapSwitchTransfer)
                                        return;
                                    }
                                    
                                    // load cached map
                                    const cachedMap = this.cacheControlGet(eachEntry.src);
                                    if(this._mods.validTexture(cachedMap)) { //eachEntry?.map || 
                                        console.log('entering[cached]', eachEntry.src);
                                        // update current(non-exists) map
                                        this._mods.mapSwitchTransfer(sphere, cachedMap, mapSwitchCallback);
                                        this._mods.cameraTransform(cameraTransConf);  // cameraTransform animation(concurrent with mapSwitchTransfer)
                                        return;
                                    }
        
                                    // load new map
                                    this._mods.mapSingleLoader(eachEntry.src, (map)=> {
                                        console.log(`entering[new] ${eachEntry.src}..`);
                                        // add to loaded texture map
                                        this.cacheControlSet(eachEntry.src, map); //map.uuid
                                        // eachEntry.map = map;
                                        this._mods.mapSwitchTransfer(sphere, map, mapSwitchCallback); //sphere.material.map = eachEntry.map;
                                        this._mods.cameraTransform(cameraTransConf);  // cameraTransform animation(concurrent with mapSwitchTransfer)
                                        console.log(this.caches)
                                    });
                                }
                            }
                        }
                    });
                }
            },
            cameraTransform: (conf = {}, callback)=> { //loadback, 
                conf = {
                    ...this.config.animation.camera,
                    stiffness: 0.2,
                    damping: 0.2,
                    // mass: 0.85,
                    // thresholdRatio: 0.1,
                    debug: false,
                    // tween.js
                    tween: false,
                    easeFn: undefined,
                    easeType: 'InOut',
                    easeDelay: 3000,
                    enabled: true,
                    ...conf,
                };
                
                if (false === conf.enabled) return;
                this.control.enableRotate = false;
                // const disabledFOVZoom = this._mods.mobileDevice();  // camera always updateProjectionMatrix with FOVZoom enabled
                const enabledTween = conf.tween; //this.config.etc.tween.enabled
                const tweenCoords = { from: {}, to: {} };
                let transformList = [];

                if (conf?.fov?.from && conf.fov.to) {
                    if (enabledTween) {
                        tweenCoords.from.fov = conf.fov.from;
                        tweenCoords.to.fov = conf.fov.to;
                    } else {
                        transformList.push(new DampedEaseSystem(conf.fov.from, conf.fov.to, {
                            ...conf,
                            type: 'f',
                            callback: (current, velocity) => {
                                if (conf.debug) console.log(`FOV: Current: ${current}, Velocity: ${velocity}`);
                                this.camera.fov = current;
                                // !important! update camera fov instantly ()
                                // if (disabledFOVZoom) 
                                    this.camera.updateProjectionMatrix();
                            },
                        }));
                    }
                }
                if (conf?.x?.from && conf.x.to) {
                    if (enabledTween) {
                        tweenCoords.from.x = conf.x.from;
                        tweenCoords.to.x = conf.x.to;
                    } else {
                        transformList.push(new DampedEaseSystem(conf.x.from, conf.x.to, {
                            ...conf,
                            type: 'x',
                            callback: (current, velocity) => {
                                if (conf.debug) console.log(`X: Current: ${current}, Velocity: ${velocity}`);
                                this.camera.position.x = current;
                            },
                        }));
                    }
                }
                if (conf?.y?.from && conf.y.to) {
                    if (enabledTween) {
                        tweenCoords.from.y = conf.y.from;
                        tweenCoords.to.y = conf.y.to;
                    } else {
                        transformList.push(new DampedEaseSystem(conf.y.from, conf.y.to, {
                            ...conf,
                            type: 'y',
                            callback: (current, velocity) => {
                                if (conf.debug) console.log(`Y: Current: ${current}, Velocity: ${velocity}`);
                                this.camera.position.y = current;
                            },
                        }));
                    }
                }
                if (conf?.z?.from && conf.z.to) {
                    if (enabledTween) {
                        tweenCoords.from.z = conf.z.from;
                        tweenCoords.to.z = conf.z.to;
                    } else {
                        transformList.push(new DampedEaseSystem(conf.z.from, conf.z.to, {
                            ...conf,
                            type: 'z',
                            callback: (current, velocity) => {
                                if (conf.debug) console.log(`Z: Current: ${current}, Velocity: ${velocity}`);
                                this.camera.position.z = current;
                            },
                        }));
                    }
                }

                if (enabledTween && Object.keys(tweenCoords.from).length > 0 && Object.keys(tweenCoords.to).length > 0) {
                    // console.log(tweenCoords)
                    const { Tween, Easing } = TWEEN;
                    const ease = {
                        fn: conf.easeFn || Easing.Quadratic,
                        type: conf.easeType || 'InOut',
                        delay: conf.easeDelay || this.config.etc.tween.delay,
                    }
                    // console.log(ease)
                    const tween = new Tween(tweenCoords.from) // Create a new tween that modifies 'tweenCoords'.
                        .to(tweenCoords.to, ease.delay) // 3 second.
                        .easing(ease.fn[ease.type]) //Quadratic.InOut //Exponential.InOut //Quintic.InOut //Quartic.Out //Cubic.Out 
                        .onUpdate(() => {
                            if (tweenCoords.from?.fov) {
                                this.camera.fov = tweenCoords.from.fov;
                                // !!!important update camera fov instantly ()
                                // if (disabledFOVZoom) 
                                    this.camera.updateProjectionMatrix();
                            }
                            if (tweenCoords.from?.x) this.camera.position.x = tweenCoords.from.x;
                            if (tweenCoords.from?.y) this.camera.position.y = tweenCoords.from.y;
                            if (tweenCoords.from?.z) this.camera.position.z = tweenCoords.from.z;
                            if (conf.debug) console.log(tweenCoords.from.x, tweenCoords.from.y, tweenCoords.from.z, tweenCoords.from.fov);
                        })
                        .onComplete(() => {
                            console.log(`cameraTransform done..`, tween);
                            this.config.animation.list.tween = null;
                            this.control.enableRotate = true;
                            // reset FOVDamper
                            if (this.config.animation.list.FOVDamper) {
                                this.setupControl(this.config._control, true); // this._mods.FOVDamper.updateFov(this.camera.fov);
                                console.log('FOV controls re-initialized..', this.config._control)
                            }
                            callback?.();
                        });
                    this.config.animation.list.tween = (delta)=> tween.update(void 0, true); //, true
                    return;
                }
                
                const transformLen = transformList.length;
                if (transformLen <= 0) {
                    console.warn('invalid animation conf provided.', conf);
                    this.control.enableRotate = true;
                    callback?.();
                    return;
                }
                // loopAnimation callback
                let completeDone = false;  //const cameras = ['f','x','y','z'];
                for (let i=0; i<transformLen; i++) {
                    let transform = transformList[i];
                    const transformer = `Camera_${transform.config.type + i}`;
                    this.config.animation.list[transformer] = (delta)=> {
                        transform.update(delta);
                        completeDone = transform.isFinished;
                        if (false === completeDone) return;
                        // clear animation
                        this.config.animation.list[transformer] = null;
                        this.control.enableRotate = true;
                        console.log(`${transformer} done..`);
                        // all done callback
                        if (i === transformLen - 1 && completeDone) {
                            // reset FOVDamper
                            if (this.config.animation.list.FOVDamper) {
                                this.setupControl(this.config._control, true); // this._mods.FOVDamper.updateFov(this.camera.fov);
                                console.log('FOV controls re-initialized..', this.config._control)
                            }
                            callback?.();
                        }
                    };
                }
            },
            setupSceneLights: (type = 'HemisphereLight', conf = {}, add = false)=> {
                let lights, helper;
                switch (type) {
                    case 'HemisphereLight':
                        lights = new HemisphereLight(new Color(conf.colors), new Color(conf.color));
                        lights = this._util.basics.confRewriter(conf, lights);
                        lights.position.set(lights.x, lights.y, lights.z);
                        if (conf.helper) helper = new HemisphereLightHelper(lights, lights.helper);
                        break;
                    case 'DirectionalLight':
                        lights = new DirectionalLight(new Color(conf.colors));
                        lights = this._util.basics.confRewriter(conf, lights);
                        lights.position.set(lights.x, lights.y, lights.z);
                        if (conf.helper) helper = new DirectionalLightHelper(lights, lights.helper);
                        break;
                    case 'SpotLight':
                        lights = new SpotLight(new Color(conf.colors));
                        lights = this._util.basics.confRewriter(conf, lights);
                        if (lights.targets) {
                            lights.target.position.set(lights.targets.x, lights.targets.y, lights.targets.z); // set target-z foward as spot direction
                            lights.position.set(lights.targets.x, lights.targets.y, lights.z);
                            lights.target.updateMatrixWorld();  // updateMatrixWorld of spotTargets for SpotLightHelper points bug fixes.
                            lights.position.set(lights.targets.x, lights.targets.y, lights.z);  // sync spot-x to target-x
                        }
                        if (conf.helper) helper = new SpotLightHelper(lights, lights.helper);
                        break;
                    case 'PointLight':
                        lights = new PointLight(new Color(conf.colors));
                        lights = this._util.basics.confRewriter(conf, lights);
                        lights.position.set(lights.x, lights.y, lights.z);
                        if (conf.helper) helper = new PointLightHelper(lights, lights.helper);
                        break;
                    default:
                        console.log('Unsupport type of light: ' + type);
                        break;
                }
                if (add || conf.add) {
                    this.scene.add(lights);
                    // this.config.load.lights[lights.uuid] = lights;
                }
                if (helper) this.scene.add(helper);
                return lights;
            },
            setModelMaterial: (name, color, material=null, callback=false, fuzzy=true)=> {
                this.scene.traverse(child=> {
                    let matchPattern = fuzzy ? child.name.includes(name) : child.name===name;
                    if(child.isMesh && matchPattern) {
                        if(color) child.material.color.set(new Color(color));
                        if(material) child.material = material;
                        if(callback&&typeof callback==='function') callback(child);
                    }
                });
            },
            getModelSize: (target)=> {
                if (!target || !target.type) {
                    console.warn('invalid target provide on getModelSize', target);
                    return;
                }
                let size;
                switch (target.type) {
                    case 'Mesh':
                        target.geometry.computeBoundingBox();
                        size = target.geometry.boundingBox;
                        break;
                    case 'Group':
                    default:
                        let box3 = new Box3();
                        size = box3.expandByObject(target);
                        break;
                }
                return size;
            },
            getModelPart: (mesh, callback, fuzzy=false, type='Mesh')=> {
                const traverse_group = mesh?.type==="Group"; // && Object.prototype.toString.call(mesh) === '[Object3D]'
                const traverse_target = traverse_group ? mesh : this.scene;
                traverse_target.traverse(child=> {
                    if(!child.name) return;
                    const isMesh = child.type === type;
                    if (traverse_group) {
                        if(isMesh) callback?.(child);
                    } else {
                        if(mesh && mesh!='') {
                            let matchPattern;
                            if(Array.isArray(mesh)) {
                                for(let i=0,l=mesh.length; i<l; i++) {
                                    if(!mesh[i]) continue;
                                    matchPattern = fuzzy ? child.name.includes(mesh[i]) : child.name===mesh[i];
                                    if(matchPattern && isMesh) {
                                        callback?.(child);
                                        return;
                                    }
                                }
                            }
                            matchPattern = fuzzy ? child.name.includes(mesh) : child.name===mesh;
                            if(matchPattern && isMesh) callback?.(child);
                            return;
                        }
                        if(isMesh) callback?.(child);
                    }
                });
            },
            loadStats: (res)=> {
                const {loaded, total} = res;
                const load = Math.abs(loaded / total * 100);
                // this._mods.loadingWidth = load;
                // if(load >= 100) setTimeout(()=>this._mods.isLoading = false, 1000);
                console.log(load + '% texture loaded');
                return {
                    res: res,
                    num: (loaded / total) * 100
                };
            },
            loadStatus: (removal = false, context = '', mask = true)=> {
                context = context || this.config.context.load.common;
                const loadClass = this.config.context.classes.loading;
                const container = this.config.load.dom;
                container.classList.add(loadClass);
                let loader = container.querySelector('.' + loadClass);
                const existLoader = this._util.basics.detects.validDom(loader);
                // remove
                if (removal) {
                    container.classList.remove(loadClass);
                    if (!existLoader) {
                        console.debug('invalid loader', loader);
                        return;
                    }
                    // loader.dataset.context = this.config.context.load.done;
                    // removal = isNaN(removal) ? 1000 : removal;
                    // let timer = setTimeout(()=>{
                        loader.remove();
                    //     clearTimeout(timer);
                    // }, removal);
                    return;
                }
                if (!mask) {
                    container.classList.remove(loadClass);
                    container.style.cssText = `--vload-placeholder: url() center /cover;`;
                }
                // rewrite
                if (existLoader) {
                    loader.dataset.context = context;;
                    return;
                }
                // create
                loader = document.createElement('SPAN');
                loader.id = new Date().getTime();
                loader.classList.add(loadClass);
                if (!mask)  loader.style.color = 'white'; // loader.style.color = color;
                loader.dataset.context = context;
                container.appendChild(loader);
            },
            loadImages: (imgSrc = '', callback, loadPath = '', syncLoad = false)=> { //appendNode = null,
                if (!imgSrc) {
                    console.warn('invalid image src provided.', imgSrc)
                    return;
                }
                if (Array.isArray(imgSrc)) {
                    let node_list = [];
                    let img_count = imgSrc.length;
                    for (let i=0; i<img_count; i++) {
                        const image = new Image();
                        image.src = loadPath + imgSrc[i];
                        if (syncLoad) {
                            image.onload = ()=> {
                                img_count--;
                                node_list.push(image);
                                if (img_count === 0) callback?.(node_list);
                            }
                            continue;
                        }
                        node_list.push(image);
                    }
                    if (!syncLoad) callback?.(node_list);
                    return;
                }
                const image = new Image();
                image.src = loadPath + imgSrc;
                if (syncLoad) {
                    image.onload = ()=> callback?.(image);
                    return;
                }
                callback?.(image);
                return;
            },
            // !! Caution !! cubeImgs file path-src conflicts
            // !!! Maximum call stack !!! absolute-src with load.path:'';(online-res)
            loadCubeTexture: (cubeImgs, resolve, reject, checkStatus = true)=> {
                if (!cubeImgs || !Array.isArray(cubeImgs) || cubeImgs.length !== 6) {
                    // this.scene.background = new Color('black');
                    resolve?.();
                    return;
                }
                if (checkStatus) this._mods.loadStatus(0, this.config.context.load.enviroment);
                const cubeImg = cubeImgs[0]; // use first of cubeImgs url for cahces
                // this.config.load.pends.set(cubeImg); // add pending statu
                if (this.cacheControlGet(cubeImg)) {
                    console.warn(this.config.context.errors.request);
                    this._mods.loadStatus(0, this.config.context.errors.request);
                    // return;  // no NEED to return but loading status
                }
                this.cacheControlSet(cubeImg, {});  // placeholder for pending statu
                this._util.loader.CUBE.load(cubeImgs, (map) => {
                    map.format = RGBAFormat; // bug of RGBFormat
                    this.cacheControlSet(cubeImg, map);
                    if (checkStatus) {
                        this._mods.loadStatus(1);
                        // // set as enviroment textures
                        // this.scene.background = map;
                    }
                    resolve?.(map);
                    map.dispose();
                }, undefined, (error) => {
                    console.warn(this.config.context.errors.load, error);
                    if (checkStatus) this._mods.loadStatus(1);
                    reject?.(error);
                });
            },
            loadCanvasTexture: (content = 'context_01', callback, font = 'bold 88px Arial', size = 0)=> {
                if (!content || content === '') {
                    console.warn('invalid content provide', content);
                    return false;
                }
                let canvas = document.createElement('CANVAS');
                canvas.width = canvas.height = 1024 + size; // //size || 512
                const canvasW = canvas.width;
                const canvasH = canvas.height;
                this._mods.loadTextureType(content, (type)=> {
                    let ctx = canvas.getContext('2d');
                    switch (type) {
                        case 'BASE':
                        case 'GIF':
                            const image = new Image();
                            image.src = content;
                            image.onload = ()=> {
                                ctx.drawImage(image, 0, 0, canvasW, canvasW);
                                const canvasTexture = new CanvasTexture(canvas);
                                callback?.(canvasTexture, canvas);
                                return canvasTexture;
                            }
                            break;
                        default:
                            const centralX = canvasW / 2;
                            const centralY = canvasH / 2;
                            ctx.font = font; //width || height ? `bold ${Math.min(width, height) / 6}px Arial` : 
                            ctx.textAlign = 'center';
                            ctx.lineWidth = 10;
                            ctx.fillStyle = 'white';
                            ctx.strokeStyle = "black";
                            ctx.strokeText(content, centralX, centralY);
                            ctx.fillText(content, centralX, centralY);
                            break;
                    }
                    const canvasTexture = new CanvasTexture(canvas);
                    callback?.(canvasTexture, canvas); // this._mods.loadStatus(1);
                    return canvasTexture;
                });
            },
            loadVideoTexture: (filelist = [], callback, filepath = '')=> {
                if (!Array.isArray(filelist) || filelist.length < 1) {
                    console.debug('invalid list provided, loadVideoTexture[1st] required type of array.', filelist);
                    if (typeof filelist === 'string') {
                        filelist = [ filelist ];
                    } else {
                        return;
                    }
                }
                
                let video = document.createElement('VIDEO');
                let tips = document.createElement('P');
                video.preload = video.autoplay = video.loop = video.playsinline = video.muted = video.controls = true;
                video.crossOrigin = 'anonymous';
                video.style.display = 'none';
                video.classList = this.config.context.classes.videoTexture;

                filelist.forEach((file)=> {
                    const filesplite = file.lastIndexOf('.'); // file.splite('.');
                    const fileextend = file.substr(filesplite + 1); // const filename = file.substr(0, filesplite);
                    let source = document.createElement('SOURCE');
                    source.type = 'video/' + fileextend;
                    source.src = filepath + file;
                    video.appendChild(source); // this._mods.loadStatus(0, `加载[${file}]视频贴图..`);
                });
                tips.textContent = this.config.context.errors.canvas;
                video.appendChild(tips);
                this.config.load.dom.appendChild(video);
                video.play().catch(e=>console.warn(this.config.context.errors.video, e));

                // make sure callback after video canplay(load).
                this._util.events.bind(video, 'canplay', ()=> {
                    this._util.events.unbind(video, 'canplay');
                    const videoTexture = new VideoTexture(video);
                    // videoTexture.mapping = EquirectangularReflectionMapping;
                    // videoTexture.wrapS = RepeatWrapping;
                    // videoTexture.minFilter = LinearFilter;
                    // videoTexture.format = RGBAFormat;
                    callback?.(videoTexture, video); // this._mods.loadStatus(1);
                    return videoTexture;
                });
            },
            loadTextureType: (src, callback)=> {
                if (Array.isArray(src)) src = src[0];
                const filename = src.substr(src.lastIndexOf('/') + 1, src.length);
                let res = '';
                switch (true) {
                    case new RegExp('\\.(mp4|mov|webm|avi|wmv|flv)$', 'i').test(filename):
                        res = 'VIDEO';
                        break;
                    case new RegExp('\\.(hdr|hdrx)$', 'i').test(filename):
                        res = 'RGBE';
                        break;
                    case new RegExp('\\.(gif|apng)$', 'i').test(filename):
                        res = 'GIF';
                        break;
                    case new RegExp('\\.(jpg|jpeg|png|bmp|webp|tiff|apng)$', 'i').test(filename):
                        res = 'BASE';
                        break;
                    default:
                        break;
                }
                callback?.(res)
                return res;
            },
            meshLoader: (geometry, material, callback, storage = true)=> {
                try {
                    // adjust sphere size for cameraTransform animation(breaking sphere)
                    if (!geometry) geometry = new SphereGeometry(1024, 60, 40);
                    if (!material) {
                        let materialConf = {
                            color: 0xffffff,
                        };
                        if (!geometry) materialConf = {
                            side: DoubleSide, //FrontSide Backside
                            ...materialConf,
                        }
                        material = new MeshStandardMaterial(materialConf);
                    }
                    if (geometry.type==='SphereGeometry') {
                        material.side = DoubleSide;
                        geometry.scale(-1, 1, 1);  // 反转法线 DoubleSide 内部可见
                    }
                    const mesh = new Mesh(geometry, material);
                    if (storage) {
                        // if (!this.config.load.meshs) this.config.load.meshs = [];
                        // this.config.load.meshs[storage] = mesh;
                        this.config.load.meshs.push(mesh);
                        this.scene.add(mesh);
                    }
                    callback?.(mesh);
                    return mesh;
                } catch (error) {
                    console.warn(error)
                }
            },
            mapSingleLoader: (textureSrc = '', resolve, progress, reject, checkStatus = true)=> {
                if (!textureSrc) {
                    resolve?.(null);
                    return;
                }
                // textureSrc = textureSrc || '?';
                if (checkStatus) this._mods.loadStatus(0, `${this.config.context.load.texture}
（${this.config.load.count} / ${this.config.load.counts}）`);
                if (this.cacheControlGet(textureSrc)) {
                    console.warn(this.config.context.errors.request);
                    this._mods.loadStatus(0, this.config.context.errors.request);
                    // return;  // no NEED to return but loading status
                }
                this.cacheControlSet(textureSrc, {}); // placeholder for pending statu
                try {
                    this._mods.loadTextureType(textureSrc, (textureType)=> {
                        switch (textureType) {
                            case 'GIF':
                                // THREE_GetGifTexture(textureSrc).then(map => {
                                //     console.log('load gif', map);
                                //     this.config.load.count++;
                                //     this._mods.loadStatus(1);
                                //     resolve?.(map);
                                //     // map.dispose(); // do NOT dispose gif texture
                                // });
                                break;
                            case 'CANVAS':
                                break;
                            case 'VIDEO':
                                this._mods.loadVideoTexture(textureSrc, (map, video)=> {
                                    this.config.load.count++;
                                    this._mods.loadStatus(1);
                                    map.colorSpace = SRGBColorSpace;
                                    this.cacheControlSet(textureSrc, map); // cache to caches
                                    resolve?.(map);
                                    map.dispose();
                                });
                                break;
                            case 'RGBE':
                                // this._util.loader.RGBE.loadAsync(textureSrc).then((map)=> {
                                this._util.loader.RGBE.load(textureSrc, (map) => {
                                    // map.colorSpace = SRGBColorSpace;
                                    map.mapping = EquirectangularReflectionMapping;
                                    // map.sourceFile = url;
                                    map.isHDRTexture = true;
                                    map.needsUpdate = true;
                                    this.config.load.count++;
                                    this._mods.loadStatus(1);
                                    this.cacheControlSet(textureSrc, map); // cache to caches
                                    resolve?.(map);
                                    map.dispose();
                                }, (res) => progress?.(res), (error) => { //undefined, 
                                    console.warn(`${this.config.context.errors.load} [${textureSrc.substring(textureSrc.lastIndexOf('/') + 1, textureSrc.length)}]`, error); 
                                    this._mods.loadStatus(1); // this._mods.loadStatus(0, this.config.context.errors.load);
                                    reject?.(error);
                                });
                                break;
                            case 'BASE':
                            default:
                                this._util.loader.BASE.load(textureSrc, (map) => {
                                    map.colorSpace = SRGBColorSpace;
                                    this.config.load.count++;
                                    this._mods.loadStatus(1);
                                    this.cacheControlSet(textureSrc, map); // cache to caches
                                    resolve?.(map);
                                    map.dispose();
                                }, (res) => progress?.(res), (error) => {
                                    console.warn(`${this.config.context.errors.load} [${textureSrc.substring(textureSrc.lastIndexOf('/') + 1, textureSrc.length)}]`, error); 
                                    this._mods.loadStatus(1); // this._mods.loadStatus(0, this.config.context.errors.load);
                                    reject?.(error);
                                });
                                break;
                        }
                    });
                } catch (error) { console.warn(error) };
            },
            mapMultiLoader: (texturesList, callback, loadback)=> {
                const workerAvailable = this._util.basics.detects.validFun(Worker);
                let worker, loads = 0;
                if (workerAvailable) worker = new Worker(new URL('./worker.js', import.meta.url));
                if (!texturesList || !Array.isArray(texturesList)) {
                    console.warn('invalid textureList provide', texturesList);
                    return;
                }
                for (let i=0, listLen=texturesList.length; i<listLen; i++) {
                    let eachSrc = texturesList[i];
                    if (this.cacheControlGet(eachSrc)) {
                        console.warn('exists cacheControlGet on multi load', eachSrc);
                        continue;
                    }
                    this.cacheControlSet(eachSrc, {});  // placeholder for pending statu
                    if (!workerAvailable) {
                        console.warn(this.config.context.worker.error);
                        // load single thread
                        this._mods.mapSingleLoader(eachSrc, (map)=> {
                            console.log(`${eachSrc} pre-loaded.`, map);
                            loads++;
                            if (loads === listLen-1) {
                                callback?.(loads);
                                console.debug('all maps loaded.')
                            }
                            loadback?.(map, eachSrc, loads);
                        }, undefined, undefined, false);  // silent loadback(no need to alert user)
                        continue;
                    }
                    const loadAll = this.config.load.all;
                    if (loadAll) console.log(`${this.config.context.load.textures} ['${eachSrc}'] ..`);  // this._mods.loadStatus(0, `连载[${eachSrc}]场景贴图..`);
                    // 向 Worker 发送 src 以加载 HDR 贴图
                    const that = this;
                    const type = this._mods.loadTextureType(eachSrc);
                    worker.postMessage({
                        src: eachSrc,
                        path: that.config.load.path,
                        type: type,
                        // loaded: loads
                    });
                    // 接收 Worker 返回的 HDR 贴图（数据）
                    worker.onmessage = function(event) {
                        const {type, data, url, src, loaded} = event.data; //const
                        // loads = loaded;  // update loaded counts
                        // if (loadAll) console.log(`${this.config.context.load.textures} [已完成]`); // that._mods.loadStatus(1);
                        if (type === 'hdrArrayBuffer') {
                            if (!data) {
                                console.warn('invalid hdrTextureData', data);
                                return;
                            }
                            const hdrTextureData = that._util.loader.RGBE.parse(data);
                            // console.log(hdrTextureData, data, url);
                            const texture = new DataTexture(hdrTextureData.data, hdrTextureData.width, hdrTextureData.height);
                            texture.type = HalfFloatType; // type: 1016
                            // RGBELoader.js #434 (version#2)
                            texture.flipY = true;  // flipY must be true while using parse incase of texture-reversed
                            texture.colorSpace = SRGBColorSpace; //LinearSRGBColorSpace;
                            texture.minFilter = LinearFilter;
                            texture.magFilter = LinearFilter;
                            texture.generateMipmaps = false;
                            that.cacheControlSet(src, texture);  // save to caches(overwrite)
                            try {loadback?.(texture, src);} catch (error) {console.warn(error)};
                            texture.dispose();
                            console.log(`map[${texture.uuid}] cached from worker via [${type}] loader.`, url);
                        } else {
                            that.cacheControlSet(src, 0); // cache to caches(overwrite)
                            // // blob url required setPath as ''
                            // that._mods.mapSingleLoader.setPath('');
                            // that._mods.mapSingleLoader(url, (map)=> {
                            that._mods.mapSingleLoader(src, (map)=> {
                                console.log(`map[${map.uuid}] cached from worker via [${type}] loader.`, url);
                                URL.revokeObjectURL(url);
                                loads++;
                                loadback?.(map, src, loads);
                                if (loads === listLen-1) {
                                    callback?.(map);
                                    console.debug('all maps loaded.')
                                }
                            }, (progress)=> {
                                // let loadPercent = parseInt(this._mods.loadStats(progress).num);
                                // console.log(`${loadPercent}% [${defaultLoader}] loaded`);
                            }, (error)=> {
                                // console.warn(error);
                            }, false);  // silent loadback(no need to alert user)z
                        }
                    };
                    worker.onerror = function(event){
                        console.warn("ERROR: " + event.filename + " (" + event.lineno + "): " + event.message);
                    };
                }
            },
            mapSwitchTransfer: (mesh, map, callback)=> {
                const loader = this.config.load.dom;
                const classs = 'transform';
                loader.classList.add(classs);
                if (mesh.material.type !== 'MeshStandardMaterial' || mesh.type!=='Mesh') {
                    console.warn('invalid type of Mesh(MeshStandardMaterial required), switch map directly..', mesh);
                    mesh.material.map = map;
                    callback?.();
                    return;
                }
                // 保存旧材质
                const oldMaterial = mesh.material;
                // 创建新材质（初始透明度为0）
                const newMaterial = new MeshStandardMaterial({
                    map: map,
                    transparent: true,
                    opacity: 0, // 初始完全透明
                });
                // 替换材质
                mesh.material = newMaterial;
                if (map === null) {
                    console.warn(`invalid map(${map}) provided, transparency switching..`);
                    // mesh.material.dispose();
                    loader.classList.remove(classs);
                    // !!!always callback before returns
                    callback?.();
                    return;
                }
                // enabled mesh transparency
                mesh.material.transparent = true;
                // 标记过渡状态
                const total = 1;  // too long to unable to set transparency
                let progress = 0;
                this.config.animation.list.mapSwitchTransfer = (delta)=> {
                    if (progress >= total) {
                        oldMaterial.dispose();  // 过渡完成后清理旧材质
                        this.config.animation.list.mapSwitchTransfer = null;  // 清理过渡动画
                        // disable mesh transparency(case of black-mesh-background-color)
                        mesh.material.transparent = false;
                        loader.classList.remove(classs);
                        callback?.();
                        return;
                    }
                    progress += delta;
                    oldMaterial.opacity = total - progress;  // 旧材质渐隐
                    newMaterial.opacity = progress;  // 新材质渐显
                    // oldMaterial.needsUpdate = newMaterial.needsUpdate = true;  // 手动更新材质（某些情况下需要）
                    // console.log(progress);
                };
            },
            mapUVEngager: (event, geometry, callback)=> {
                event.preventDefault();
                let clientX = event.clientX,
                    clientY = event.clientY;
                if (event.type === 'touchend') {
                    const touch = event.changedTouches[0];
                    clientX = touch.clientX;
                    clientY = touch.clientY;
                }
                // 计算鼠标（手指）位置 Calculate mouse position relative to the canvas
                const canvasRect = this.config.load.dom.getBoundingClientRect();
                this.config.etc.debug.mouse.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
                this.config.etc.debug.mouse.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
                // 使用射线投射器设置射线
                this.config.etc.debug.raycaster, this.config.etc.debug.mouse, 
                this.config.etc.debug.raycaster.setFromCamera(this.config.etc.debug.mouse, this.camera);
                // 计算射线与物体的交叉点
                const intersects = this.config.etc.debug.raycaster.intersectObject(geometry);
                if(intersects.length <= 0) return;
                const intersect = intersects[0];
                // const intersectUV = intersect.uv;
                // const intersectPoint = intersect.point;
                if(callback && typeof callback==='function') callback?.(intersect);
            },
            mapUVEngaged: (uv, uvs)=> {
                if (!uv || !uvs) {
                    console.warn('invalid uv/uvs provide on mapUVEngaged', uv, uvs);
                    return;
                }
                let res = false;
                switch (true) {
                    case Array.isArray(uvs):
                        // 判断点击的UV坐标是否在方形位置范围内 (假设方形UV坐标范围为 [uMin, uMax] 和 [vMin, vMax])
                        res = uv.x >= uvs[0] && uv.x <= uvs[1] && uv.y >= uvs[2] && uv.y <= uvs[3];
                        break;
                    case this._util.basics.detects.validObj(uvs):
                        Object.values(uvs).forEach((uvss)=> {
                            // console.log(uv)
                            if (!Array.isArray(uvss) || !uvss[0]) {
                                return res;
                            }
                            if (uv.x >= uvss[0] && uv.x <= uvss[1] && uv.y >= uvss[2] && uv.y <= uvss[3]) res = true;
                        });
                        break;
                    default:
                        break;
                }
                return res;
            },
            entryUVRecorder: (EntryArray, uvsObject = {})=> {
                for (let i=0,vl=EntryArray.length; i<vl; i++) {
                    let eachEntry = EntryArray[i];
                    if (eachEntry.meshs && eachEntry.meshs[0]) { // && eachEntry.meshs[0].uuid
                        uvsObject[eachEntry.meshs[0].uuid] = eachEntry.uvs;  // if (eachEntry?.src) uvsObject[eachEntry?.src] = eachEntry.uvs;
                        // eachEntry.meshs.forEach((mesh)=> {
                        //     if (mesh.uuid) uvsObject[mesh.uuid] = eachEntry.uvs;
                        // });
                    }
                }
                return uvsObject;
            },
            entryCacheSeeker: function Callee(targetSceneSrc, currentScene) {
                const currentSceneEntrySrc = currentScene.src || currentScene.env[0];
                if (Object.prototype.toString.call(currentScene)==='[object Object]' && currentSceneEntrySrc === targetSceneSrc) { //this._util.basics.detects.validObj(currentScene) && 
                    return currentScene;  // return default entry scene
                }
                // traversal currentScene as EntryArray
                currentScene = Object.values(currentScene.entry);
                // return if child-entry not-exists..
                if (!currentScene[0].entry) {
                    console.log('currentScene entry not exists');
                    return currentScene[0];
                }
                for (let i=0,l=currentScene.length; i<l; i++) {
                    let currentEntry = currentScene[i];
                    const currentEntryEntry = currentEntry?.src || currentEntry?.env[0];
                    // console.warn(currentEntry)
                    if (!currentEntry?.entry || !currentEntryEntry) {
                        continue;
                    }
                    const currentEntryEntrySrc = currentEntry.src || currentEntry.env[0];
                    if (currentEntryEntrySrc === targetSceneSrc) {
                        console.log('exists texture found', currentEntry);
                        return currentEntry;
                    }
                    Callee(currentEntryEntrySrc, currentEntry);
                }
            },
            entrySrcFinder: function Callee(obj, results = [], foundSrcs = new Set()) {
                for (let key in obj) {
                    if (key === 'src' && obj[key] && !foundSrcs.has(obj[key])) {
                        results.push(obj[key]);
                        foundSrcs.add(obj[key]);
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        Callee(obj[key], results, foundSrcs);
                    }
                }
                return results;
            },
            // mapSpotSetter: (hotSpotObj = {}, entrySrc = '', callback)=> {
            //     const enviroment = hotSpotObj.env || this.config.load.env;
            //     const entrysrc = entrySrc ? entrySrc : hotSpotObj.src || '';
            //     const hotspot = {
            //         ...hotSpotObj,
            //         env: enviroment,
            //         entry: [],
            //     };
            //     if (this._util.basics.detects.validFun(callback)) {
            //         callback?.(hotspot);
            //         return;
            //     }
            //     return hotspot;
            // },
            mapSpotSetter: (hotSpot = {}, callback)=> {
                if (false === this._util.basics.detects.validObj(hotSpot)) {
                    console.warn('typeof hotSpot must be an Object', hotSpot);
                    return;
                }
                if (this._util.basics.detects.validFun(callback)) {
                    const backupTexture = window.structuredClone ? window.structuredClone(hotSpot) : JSON.parse(JSON.stringify(hotSpot));
                    callback?.(backupTexture);
                    return;
                }
                return hotSpot;
            },
            mapSpotAnimator: (mesh, conf, px = 0.05, py = 0, ry = 0)=> {
                let animationCounter = 0;
                if (!py) py = conf.y;
                this.config.animation.list[mesh.uuid] = (delta)=> {
                    animationCounter += delta;
                    const sin = Math.sin(animationCounter) * conf.height * px;
                    if (ry) mesh.rotation.y = sin * ry;
                    mesh.position.y = py + sin;  // conf.y to hold origin position y
                };
                // backup for animations
                mesh.animations[mesh.uuid] = this.config.animation.list[mesh.uuid];
            },
            mapSpotCreator: (childEntryArray = [], spotArray = ['entrance.png'], currentEntryArray = null, callback, depthTest = false, spotAnimation = true)=> {
                // console.log(childEntryArray)
                if (!Array.isArray(childEntryArray) || childEntryArray.length === 0) {
                    console.warn('invalid childEntryArray provided.', childEntryArray);
                    return;
                }
                for (let i=0,l=childEntryArray.length; i<l; i++) {
                    let childEntry = childEntryArray[i];
                    
                    // if (currentEntryArray) {
                        // always update enviroment background if available(with currentEntryArray priority)
                        const entryEnv = currentEntryArray?.env ? currentEntryArray.env : childEntry?.env;
                        const cachedEnv = entryEnv ? this.cacheControlGet(entryEnv[0]) : false;
                        // load cached enviroment cubeImgs background
                        if (this._mods.validTexture(cachedEnv)) {
                            this.scene.background = cachedEnv;
                            console.log(`load background enviroment[${entryEnv[0]}] from caches..`, this.caches);
                        } else {
                            // do not detect cachedEnv incase of childEntry can not be all scaned
                            // if (cachedEnv) {
                                // status: request before res-loaded, hold steady..
                                if (currentEntryArray) {
                                    this._mods.loadCubeTexture(entryEnv);  // with checkStatus enabled
                                } else {
                                    console.log(`loading background enviroment[${entryEnv?.[0]}]..`, this.caches);
                                    // create new enviroment background (silence loadback)
                                    this._mods.loadCubeTexture(entryEnv, undefined, (err)=>console.warn('fail to load cubeImgs', err), false);  // disabled checkStatus
                                }
                            // } else {
                            //     console.warn('invalid cachedEnv', cachedEnv);
                            // }
                        }
                    // }
                    
                    // setup mesh%material
                    if (!childEntry?.meshs || !childEntry.meshs[0]) {
                        childEntry.meshs = [];
                    } else {
                        childEntry.meshs.forEach((mesh)=> {
                            mesh.visible = true;
                            if (this.config.animation.list[mesh.uuid] === null) {
                                // restart mesh animation if cleared
                                this.config.animation.list[mesh.uuid] = mesh.animations[mesh.uuid];
                            }
                        });
                        console.log(`all exists symbol enabled..`, childEntry.meshs);
                        continue;
                    }
                    
                    // create new mesh
                    const conf = this._util.basics.confRewriter(childEntry.point, {
                        width: 100, height: 100, deepth: 100, // color: 0xffffff,
                        x: 0, y: 0, z: 0, 
                        px: 0, py: 0, pz: 0,
                        rx: 0, ry: 0, rz: 0,
                    });
                    const mesh = this._mods.meshLoader(new PlaneGeometry(conf.width, conf.height, conf.deepth), new MeshBasicMaterial({
                        // color: conf.color,
                        transparent: true,
                        // opacity: 0,
                    }), undefined, false);
                    // custom mesh postion offsets
                    let ox = conf.x + conf.px;
                    let oy = conf.y + conf.py;
                    let oz = conf.z + conf.pz;
                    mesh.position.set(ox, oy, oz); // near camera + 100
                    mesh.rotation.set(conf.rx || - Math.PI * 0.5, conf.ry, conf.rz || Math.PI * 0.5);
                    
                    // add mesh animations
                    if (spotAnimation) this._mods.mapSpotAnimator(mesh, conf, 0.05, oy, 0.015);
                    // extra mesh context spots
                    const childEntryCtxArr = childEntry?.ctx;
                    if (childEntryCtxArr) {
                        const ctxWidth = conf.cw;
                        const ctxHeight = conf.ch;
                        const ctxSizes = Math.min(ctxWidth, ctxHeight) / 2.5;
                        const materialConf = {
                            transparent: true, // opacity: .75,
                            depthTest: depthTest, // for renderOrder
                        };
                        let step = ctxSizes / 4;
                        let font = `bold ${ctxSizes}px Arial`;
                        const meshs = this._mods.meshLoader(new PlaneGeometry(ctxWidth, ctxHeight), new MeshBasicMaterial(materialConf), undefined, false);
                        meshs.renderOrder = -1;
                        // locate central point
                        meshs.position.set(ox, oy, oz - step);
                        // meshs.rotation.set(conf.rx, conf.ry, 0);
                        for (let i=0,l=childEntryCtxArr.length; i<l; i++) {
                            const eachChildEntryCtx = childEntryCtxArr[i];
                            const ctxMesh = meshs.clone();  // clone issue: rewrited lastest canvasTexture.
                            if (i >= 1) {
                                font = `${ctxSizes / 1.25}px Arial`; //conf.cs / 10
                                step = step * i;
                                // set new material for clone issue↑↑↑
                                ctxMesh.material = new MeshBasicMaterial({
                                    ...materialConf,
                                    opacity: 0.75,
                                });
                                // !!confilict with mapSpotAnimator positionY offsets
                                oy = oy - (step);
                                ctxMesh.position.set(ox, oy, oz);
                            }
                            
                            // extend mesh animations (!!must define in loop)
                            if (spotAnimation) this._mods.mapSpotAnimator(ctxMesh, conf, 0.025, oy);  // this.config.animation.list[ctxMesh.uuid] = this.config.animation.list[mesh.uuid];
                            // load from caches
                            if (this.cacheControlGet(eachChildEntryCtx)) {
                                console.log(`load hotSpot[${eachChildEntryCtx}] map from caches..`, this.caches);
                                ctxMesh.material.map = this.cacheControlGet(eachChildEntryCtx);
                                childEntry.meshs.push(ctxMesh);  // for disable visibility
                                this.scene.add(ctxMesh);
                                continue;
                            }
                            
                            // create new canvasTexture
                            this._mods.loadCanvasTexture(eachChildEntryCtx, (map, canvas)=> {
                                if (false !== map) {
                                    this.cacheControlSet(eachChildEntryCtx, map);
                                    ctxMesh.material.map = map;
                                    childEntry.meshs.push(ctxMesh);  // for disable visibility
                                    this.scene.add(ctxMesh);
                                    // ctxMesh.scale.set(canvas.width, canvas.height)
                                }
                            }, font, conf.cs); //Math.min(ctxWidth, ctxHeight)
                        }
                    };

                    // load cached map(mapSingleLoader/CanvasTexture)
                    const spotMap = spotArray[0];
                    const spotObj = this._util.basics.detects.validObj(spotMap);
                    const spotSrc = spotObj ? spotMap.url : spotMap;
                    const cachedMap = this.cacheControlGet(spotSrc);
                    
                    // load cached SequenceImagesVideo CanvasTexture
                    const cachedSIV = cachedMap && Object.getPrototypeOf(cachedMap).toString() === '[object Map]'; //cachedMap && cachedMap.caches;
                    if (cachedMap && false === cachedSIV) {
                        console.log(`load hotSpot[${spotSrc}] map from caches..`, this.caches);
                        mesh.material.map = cachedMap;
                        childEntry.meshs.push(mesh);
                        this.scene.add(mesh);
                        callback?.(mesh);
                        continue; // !!! do NOT return in loop!!!
                    }
                    
                    // create new map(SIV)
                    if (spotObj || cachedSIV) {
                        let SIVTexture = null;
                        let SIVInstance = new SequenceImagesVideo();
                        if (cachedSIV) {
                            console.log(`load hotSpot[SequenceImagesVideo] map from caches..`, this.caches);
                            SIVInstance.caches = cachedMap; // SIVInstance = cachedMap;
                        } else {
                            SIVInstance.loader(spotMap.url, spotMap.num, spotMap.ext); // SIVInstance = new SequenceImagesVideo();
                        }
                        SIVInstance.init({
                            fps: 23.976,
                            delay: 200,
                            // repeat: 2,
                            loadback: (canvas)=> {
                                SIVTexture = new CanvasTexture(canvas);
                                // SIVTexture.transparent = true;
                                // SIVTexture.colorSpace = SRGBColorSpace;
                                mesh.material.map = SIVTexture;
                                mesh.material.needsUpdate = true;
                                if (0 === mesh.material.opacity) mesh.material.opacity = 1;
                            },
                            callback: (canvas, caches)=> {
                                mesh.material.opacity = 0;  // ↑↑↑fix white-flashback loadback issue
                                // document.body.appendChild(canvas);
                                // this.cacheControlGet(spotSrc, SIVInstance);
                                this.cacheControlSet(spotSrc, caches);
                                childEntry.meshs.push(mesh);  // !append to entry then scene
                                this.scene.add(mesh);
                                if (SIVTexture) // callback twice no mater loadback->SIVTexture
                                    callback?.(mesh, SIVTexture);
                            }
                        });
                        continue; // return;
                    }

                    // create new map(src)
                    this._mods.mapSingleLoader(spotSrc, (map)=> {
                        mesh.material.map = map;
                        mesh.material.needsUpdate = true;
                        this.cacheControlSet(spotSrc, map);
                        childEntry.meshs.push(mesh);  // !append to entry then scene
                        this.scene.add(mesh);
                        callback?.(mesh);
                    }, undefined, undefined, false);  // disabled checkStatus
                }
            },
            mapSpotClear: (EntryArray, callback)=> {
                const EntryArrayLength = EntryArray.length;
                if (!Array.isArray(EntryArray) || EntryArrayLength === 0) {
                    console.log('invalid EntryArray on mapSpotClear', EntryArray);
                    return;
                }
                for (let i=0; i<EntryArrayLength; i++) {
                    let meshes = EntryArray[i].meshs;
                    if (!Array.isArray(meshes)) {
                        console.log('invalid childEntry.meshs on EntryArray', meshes);
                        continue;
                    }
                    meshes.forEach((mesh)=> {
                        mesh.visible = false;
                        if (this.config.animation.list[mesh.uuid]) this.config.animation.list[mesh.uuid] = null;  // clear mesh animations
                        callback?.(mesh);
                        console.log(`symbol disabled..`, mesh.uuid);
                    });
                }
            },
            loadModel: (loadSrc, callback, dracoLoad = false, loadPath = '', loader)=> {
                if (!loader) loader = this._util.loader.GLTF;
                if (!loadSrc) {
                    // loadSrc = this.config.load.model;
                    console.warn('invalid model', loadSrc);
                    return;
                }
                loadSrc = loadPath + loadSrc;  // prefix loadPath
                this._mods.loadStatus(0, this.config.context.load.model, false);
                if (dracoLoad) {
                    const draco = this._util.loader.DRACO;
                    draco.setDecoderPath('/libs/draco/');
                    loader.setDRACOLoader(draco);
                    loader.load(loadSrc, (gltf)=> {
                        console.log('model loaded', gltf);
                        // gltf.scene.traverse(function (child) {
                        //     if ((child as THREE.Mesh).isMesh) {
                        //         const m = child as THREE.Mesh;
                        //         m.receiveShadow = true;
                        //         m.castShadow = true;
                        //     }
                        //     if ((child as THREE.Light).isLight) {
                        //         const l = child as THREE.SpotLight;
                        //         l.castShadow = true;
                        //         l.shadow.bias = -0.003;
                        //         l.shadow.mapSize.width = 2048;
                        //         l.shadow.mapSize.height = 2048;
                        //     }
                        // });
                        callback?.(gltf); //this.scene.add(gltf.scene);
                        this._mods.loadStatus(1);
                    }, (xhr) => {
                        const {loaded, total} = xhr;
                        console.log((loaded / total) * 100 + '% loaded');
                    }, (error) => {
                        console.log(error);
                        this._mods.loadStatus(1);
                    });
                    return;
                }
                // let loadTarget = null;
                return new Promise((resolve, reject)=> {
                    loader.load(loadSrc, (target)=> {
                        console.log('model loaded', target);
                        resolve(target);
                        try {
                            callback?.(target);
                        } catch (error) {
                            console.warn(error)
                        }
                        this._mods.loadStatus(1);
                        // this.scene.add(target.scene); // bug of add-scene in promise(missing target)
                    }, (res)=> {
                        const {loaded, total} = res;
                        console.log((loaded / total) * 100 + '% loaded');
                    }, (err)=> {
                        reject(err);
                    })
                });
                // this.scene.add(loadTarget.scene); // bug of add-scene in async-await(missing target)
                // return loadTarget;
            },
        };
    }
    
    cacheControlGet(key = '', all = false) {
        // if (all) return this.caches;
        return key ? this.caches[key] : '';
    }
    
    cacheControlSet(key = '', value) {
        if (!key) {
            console.debug('invalid cache key!', key);
            return;
        }
        this.caches[key] = value;
    }
    
    // getter
    get caches() {
        return this.config.load.caches;
    }
    // get config() {
    //     return threeView._config;
    // }
    // setter
    // set config(conf) {
    //     if (!conf) throw Error("Error Occured while setting config: " + conf);
    //     threeView._config = conf; // threeView._config = Object.freeze(conf); // Object.freeze(conf);
    // }
    set caches(cache) {
        if (!cache) throw Error("Error Occured while setting cache: " + cache);
        this.config.load.caches = cache;
    }
}

export {
    threeView, //threeBase, 
    // TWEEN,
    SphereGeometry, BoxGeometry, PlaneGeometry, RingGeometry,
    MeshBasicMaterial, MeshPhongMaterial,
}