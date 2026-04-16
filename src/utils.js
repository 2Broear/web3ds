class _EventBus {
    // 使用嵌套 Map 存储不同事件类型的处理器
    #eventbus = new Map();  // Map<Element, Map<EventName, Handler>>
    
    bind (element, eventName, handler) {
        if (!element || !eventName || !handler) {
            console.warn('invalid element, handler or eventName provided, check', element, eventName, handler);
            return;
        }
        
        // 存储到事件处理器Map中
        if (!this.has(element)) {
            this.#eventbus.set(element, new Map());
        }
        const elementEvents = this.#eventbus.get(element);
        
        // 同时支持两种绑定方式
        const standardEventName = eventName.replace(/^on/, '');
        elementEvents.set(standardEventName, handler);
        
        // 优先使用 addEventListener，降级使用属性赋值
        try {
            element.addEventListener(standardEventName, handler);
        } catch (e) {
            element[eventName] = handler;
        }
    }
    
    unbind (element, eventName) {
        // 如果没有指定 element，解绑所有元素的事件
        if (!element) {
            this.#eventbus.forEach((events, el) => {
                events.forEach((handler, evt) => {
                    el.removeEventListener(evt, handler);
                });
            });
            this.#eventbus.clear();
            return;
        }

        const elementEvents = this.#eventbus.get(element);
        if (!elementEvents) return;

        // 如果没有指定 eventName，解绑该元素的所有事件
        if (!eventName) {
            elementEvents.forEach((handler, evt) => {
                element.removeEventListener(evt, handler);
            });
            this.#eventbus.delete(element);
            return;
        }

        // 解绑特定事件
        const handler = elementEvents.get(eventName);
        if (handler) {
            element.removeEventListener(eventName, handler);
            elementEvents.delete(eventName);
        }

        // 如果该元素没有其他事件了，从 Map 中删除
        if (elementEvents.size === 0) {
            this.#eventbus.delete(element);
        }
    }

    has (element, eventName) {
        return element && this.#eventbus.has(element) || eventName && this.#eventbus.has(eventName);
    }

}

class _Closure {
    // constructor() {
    //     this.delay = 200;
    // }
    static delay = 200;
    #delay = 200;
    
    debouncer (callback, delay = _Closure.delay) { //this.#delay
        var timer = null;
        return function(...args) {
            if(timer) clearTimeout(timer);
            timer = setTimeout(()=> callback.apply(this, args), delay);
        };
    }
    
    throttler (callback, delay = _Closure.delay) { //this.#delay
        let closure_variable = true;  //default running
        return function(...args) {
            if(!closure_variable) return;  //now running..
            closure_variable = false;  //stop running
            setTimeout(()=> {
                callback.apply(this, args); //arguments
                closure_variable = true;  //reset running
            }, delay);
        };
    }
}

class myPromise {
    
    static CONTEXT = {
        FULLFILLED: "fullfilled",
        REJECTED: "rejected",
        PENDING: "pending",
    }
    
    #promiseQueue = [];
    #promiseState = myPromise.CONTEXT.PENDING;
    #promiseResult;
    
    /*
    ** @resolve
    ** @rejected
    */
    constructor(executor) {
        const resolve = (data)=> {
            this.#changeState(myPromise.CONTEXT.FULLFILLED, data);
        };
        const reject = (err)=> {
            this.#changeState(myPromise.CONTEXT.REJECTED, err);
        };
        try {
            executor(resolve, reject);
        } catch (e) {
            reject(e);
        }
    }
    
    _isPending() {
        return this.#promiseState === myPromise.CONTEXT.PENDING;
    }
    
    _isFullfilled() {
        return this.#promiseState === myPromise.CONTEXT.FULLFILLED;
    }
    
    #changeState(state = '', data) {
        // 跳过非 pending 状态
        if (false === this._isPending()) return;
        // 改变 promise 状态/返回值
        this.#promiseState = state;
        this.#promiseResult = data;
        // 处理 promise 队列
        this.#run();
    }
    
    #handleCallback(callback, resolve, reject) {
        if (typeof callback !== 'function') {
            // 状态穿透（继承父级）
            queueMicrotask(()=> {
                const settled = this._isFullfilled() ? resolve : reject;
                settled(this.#promiseResult);
            });
            return;
        }
        // 成功回调
        queueMicrotask(()=> {
            try {
                // callback 作为 data 返回
                const data = callback(this.#promiseResult);
                resolve(data);  // 注：返回 this.#promiseResult 为穿透 result
            } catch (e) {
                reject(e);
            }
        });
    }
    
    #run() {
        // 跳过 pending 状态
        if (this._isPending()) return;
        // 循环处理 promise 队列
        while (this.#promiseQueue.length) {
            const { onFullfilled, onRejected, resolve, reject } = this.#promiseQueue.shift();
            const settled = this._isFullfilled() ? onFullfilled : onRejected;
            // 处理传入 onFullfilled / onRejected
            this.#handleCallback(settled, resolve, reject);
        }
    }
    
    then(onFullfilled, onRejected) {
        // 返回 promise 以供链式调用
        return new myPromise((resolve, reject)=> {
            // 加入 promise 队列（非立即执行）
            this.#promiseQueue.push({ onFullfilled, onRejected, resolve, reject });
            // 处理 promise 队列
            this.#run();
        });
    }
}

/*
**
*const pool = new RequestPool(2);
 pool.add(()=>fetch('/api')
     .then((res)=>console.log(res))
     .catch((err)=>console.warn(err)));
**
*/
class RequestPool {
    #queue = [];
    #running = 0;
    
    constructor(limit = 2) {
        this.limit = limit;
    }
    
    /*
    ** @requestFn => Promise
    */
    add(requestFn) {
        if (typeof requestFn !== 'function') {
            console.warn('invalid requestFn/');
            return;
        }
        return new MyPromise((resolve, reject)=> {
           this.#queue.push({requestFn, resolve, reject});
           this.#run();
        });
    }
    
    #run() {
        // if /while 每次循环检查队列后递归
        while (this.#queue.length && this.#running < this.limit) {
            // 取出队列任务
            const { requestFn, resolve, reject } = this.#queue.shift();
            // 处理状态 +1
            this.#running++;
            // 执行回调 promise
            requestFn()
            // ..
            .then(resolve)
            .catch(reject)
            .finally((res)=> {
                // 处理状态 -1
                this.#running--;
                // 递归调用
                this.#run();
            });
        }
    }
}

class _events extends _EventBus {
    
    constructor () {
        super();
    }

    get (event) {
        return event ? event : window.event;
    }

    add (element=null, type='', handler) {
        let //addEvent = this.add,
            init_func = function(element=null, type='', handler, callback){
                if(!element || !type) return;
                if(!handler || typeof handler!=='function') {
                    console.warn('addEvent callback handler err.');
                    return;
                }
                if (null !== element['on' + type]) {
                    console.warn('event registered.');
                    return;
                }
                callback?.();
                console.log(`event[${type}] set.`);
            };
        try {
            if (element.addEventListener) {
                this.add = function(element=null, type='', handler) {
                    init_func(element, type, handler, ()=>{
                        element.addEventListener(type, handler);
                    });
                };
            } else if (element.attachEvent) {
                this.add = function(element=null, type='', handler) {
                    init_func(element, type, handler, ()=>{
                        element.attachEvent('on'+type, handler);
                    });
                };
            } else {
                this.add = function(element=null, type='', handler) {
                    init_func(element, type, handler, ()=>{
                        element['on'+type] = handler;
                    });
                };
            }
            this.add(element, type, handler);
        } catch (error) {}
    }

    del (element=null, type='', handler) {
        // let delEvent = this.del;
        let init_func = function(element=null, type='', handler, callback){
            if(!element || !type) return;
            if(!handler || typeof handler!=='function') {
                console.warn('removeEvent callback err.');
                return;
            }
            callback?.();
            console.log(`event[${type}] clear.`);
        };
        try {
            if (element.removeEventListener) {
                this.del = function(element=null, type='', handler) {
                    init_func(element, type, handler, ()=>{
                        element.removeEventListener(type, handler);
                    });
                };
            } else if (element.detachEvent) {
                this.del = function(element=null, type='', handler){
                    init_func(element, type, handler, ()=>{
                        element.detachEvent('on'+type, handler);
                    });
                };
            } else {
                this.del = function(element=null, type='', handler){
                    init_func(element, type, handler, ()=>{
                        element['on'+type] = handler;
                    });
                };
            }
            this.del(element, type, handler);
        } catch (error) {}
    }
    
    target (event) {
        return this.get(event).target || window.srcElement;
    }

    click (effectArea, id, callback, debounce=200) {
        let execFn = (e) => {
            e = this.get(e);
            let t = this.target(e);
            if (!t || !t instanceof HTMLElement) return;
            if (!id) {
                // 如果未传入id参数，直接调用callback
                if (callback && typeof callback === 'function') callback(e, ...arguments);
                return;
            }
            while (t && t !== effectArea) {
                if (t.id === id || (t.classList && t.classList.contains(id)) || t.tagName.toLowerCase() === id.toLowerCase()) {
                    if (callback && typeof callback === 'function') callback(e, ...arguments);
                    break;
                }
                t = t.parentNode;
            }
        };
        let handler = debounce ? this.debouncer(execFn, debounce) : execFn;
        this.add(effectArea, 'click', handler);
    }

    scroll (effectArea, callback, throttle=200) {
        if(throttle) {
            // NOTE: throttled events can NOT be removed!!!
            this.add(effectArea, 'scroll', this.throttler(callback, throttle));
            return;
        }
        this.add(effectArea, 'scroll', callback);
    }
}

class _Basics {
    constructor () {
        this.detects = {
            validObj (obj) {
                return obj && Object.prototype.toString.call(obj)==='[object Object]';
            },
            validDom (node, textNode = true) {
                const valid_node = node && node instanceof HTMLElement;
                return textNode ? valid_node && node.nodeType===1 : valid_node;
            },
            validFun (fn) {
                // if(fn&&typeof fn==='function') fn?.();
                return fn && typeof fn === 'function';
            },
        };
        this.confRewriter = function Callee(rewrites, presets) {
            if(Object.prototype.toString.call(presets)!=='[object Object]') {
                return false;
            }
            for(let property in rewrites) {
                if(!rewrites.hasOwnProperty(property)) continue;
                let rewrite_conf = rewrites[property];
                if(Object.prototype.toString.call(rewrite_conf)==='[object Object]' && Reflect.ownKeys(rewrite_conf).length===0) {
                    continue;
                }
                if (Object.prototype.toString.call(rewrite_conf) === '[object Object]') {
                    presets[property] = Callee(rewrite_conf, presets[property] || {}); //this.confRewriter
                } else {
                    presets[property] = rewrite_conf;
                }
            }
            return presets;
        };
    }
}

class _storage extends _Basics {
    constructor () {
        super();
        this.cookie = {
            set: (name, value, path='/', days=30)=> {
                let exp = new Date();
                exp.setTime(exp.getTime() + days*(24*60*60*1000));
                document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + exp.toGMTString() + ';path=' + path; //escape
            },
            get: (cname)=> {
                var name = cname + "=";
                var ca = document.cookie.split(';');
                for(var i=0,caLen=ca.length; i<caLen; i++) {
                    var c = ca[i];
                    while (c.charAt(0)==' ') c=c.substring(1);
                    if(c.indexOf(name) != -1) {
                        return c.substring(name.length, c.length);
                    }
                }
                return "";
            },
            del: function(name, path='/') {
                var exp = new Date();
                exp.setTime(exp.getTime() - 1);
                var cval = this.get(name);
                if(cval!=null){
                    document.cookie = name+"="+cval+";expires="+exp.toGMTString()+";path="+path;
                }
            },
        };
        this.local = {
            getLocalStorage: ()=> {
                if (typeof localStorage == "object"){
                    return localStorage;
                } else if (typeof globalStorage == "object"){
                    return globalStorage[location.host];
                } else {
                    throw new Error("Local storage not available.");
                }
            },
            set: (name="", data={})=> {
                try {
                    if(Object.prototype.toString.call(data)==='[object Object]') data = JSON.stringify(data);
                    this.getLocalStorage().setItem(name, data);
                } catch (e) {
                    console.warn(e);
                    return null;
                }
            },
            get: (name="", expires=0)=> {
                try {
                    if(isNaN(expires) || typeof expires !== 'number') throw new Error('maxAge must be number of millseconds!');
                    const storage = getLocalStorage();
                    const ts = storage.getItem(name),
                          ms = expires ? expires : 1*24*60*60;
                    if(parseInt(ts)+ms < Date.now()) {
                        storage.removeItem(name);
                        return null;
                    }
                    return ts;
                } catch (e) {
                    console.warn(e);
                    return null;
                }
            },
            _get: (name="")=> {
                try {
                    return this.getLocalStorage().getItem(name);
                } catch (e) {
                    console.warn(e);
                    return null;
                }
            },
        };
    }
}


class SequenceImagesVideo extends _EventBus {

    constructor (conf) {
        super();
        this.conf = {
            ...SequenceImagesVideo.config,
            ...conf,
        };
    }

    #caches = new Map();
    static config = {
        list: [],           // images sequence
        rid: 0,             // RAF ID
        fps: 60,            // runing speed
        repeat: Infinity,   // repeat times
        times: 0,           // repeat times
        delay: 0,
        loads: 0,           // load process
        poster: 0,          // poster frame
        width: 0,           // canvas width
        height: 0,          // canvas height
        canvas: document.createElement('CANVAS'),  // basic cnavas element
        callback: (canvas)=>console.log('SequenceImagesVideo done.', canvas),  // all-loaded callback fn
        loadback: undefined,    // every-load callback fn for material inmediatelly updates
    }

    // preload list images
    load (...list) {
        if (this.validArray(list[0])) list = list[0];
        if (list.length === 0) {
            console.warn('invalid load list provide!', list);
            return;
        }
        if (list.length > 0) this.conf.list = Array.from(new Set([...this.conf.list, ...list])); //Array.from(new Set(this.conf.list.concat(list)));
        if (false === this.validArray(this.conf.list)) {
            console.warn('invalid/empty image list provide', this.conf);
            return;
        }
        
        // setupLimits before store
        this.setupLimits();

        // load images
        let index = -1;
        const that = this;
        return (function callee() {
            let image = new Image();
            if (false === that.validArray(that.conf.list)) {
                image.src = srcs;
                that.bind(image, 'load', ()=> {
                    that.unbind(image, 'load');  // release events
                    callback?.(image, srcs);
                });
                return;
            };
            index++;
            // console.log(list, index)
            image.src = that.conf.list[index];
            that.bind(image, 'load', ()=> {
                that.unbind(image, 'load');  // release events
                // that.conf.loads++;
                that.#caches.set(that.conf.list[index], image);
                console.debug('load image', that.conf.list[index]);
                // loadback?.(image);
                if (that.reacheLimits(index)) {
                    // callback?.(image);
                    // console.log('last load', image);
                    // that.conf.canvas.style = `background: url(${poster}) center center /cover;`;
                    console.log('all images load, canvas init..', that);
                    that.init(false, true);
                    return;
                }
                // that.conf.list.splice(that.conf.list.indexOf(index), 1);  // remove from list
                callee();  // loop callback store
            });
        })();
    }

    // init canvas images
    init (_conf = {}, inited = false) {
        this.conf = {
            ...this.conf,
            ..._conf,
        };
        const caches = this.caches;
        if (caches.size === 0) { // return invalid conf
            // console.log('loading list..', this.conf.list);
            this.load(this.conf.list); // caches = this.caches;
            return;
        }
        
        // setupLimits incase no load called.
        this.setupLimits();
        // set poster frame(before init incase of canvas size init) // this.conf.loads = 0;
        const poster = this.conf.list[this.conf.poster];
        this.conf.poster = this.caches.get(poster);
        // setup placeposter size to canvas
        this.conf.canvas.width = this.conf.width || this.conf.poster.width;
        this.conf.canvas.height = this.conf.height || this.conf.poster.height;

        const canvasW = this.conf.canvas.width;
        const canvasH = this.conf.canvas.height;
        const ctx = this.conf.canvas.getContext('2d');
        const limitRepeat = this.repeatLimits();
        const reinitLoad = false === _conf || inited;
        let cachedVals = [...caches.values()];  //this.conf.vals = [...caches.values()];
        let startTime = new Date().getTime();
        let imgIndex = -1;  // default image[index-1 for++]

        this.conf.loop = ()=> {
            const currentTime = new Date().getTime();
            const onceDone = this.reacheLimits(this.conf.list[imgIndex], this.conf.edp);
            if (currentTime-startTime >= this.conf.fps) {
                imgIndex++;
                if (this.reacheLimits(imgIndex)) imgIndex = 0;  // redirect to default image[index]
                if (reinitLoad) {
                    console.debug('re-init on-load..', this.conf.edp);
                    this.cancelAnimation();  // cancel init but exec at least once
                    cachedVals = [...caches.values()];  // update caches value if reinitLoad
                }
                // console.log(this.conf.rid, imgIndex, this.conf.max, this.conf.list[imgIndex]);
                
                // draw image to canvas console.log(cachedVals, imgIndex)
                ctx.clearRect(0, 0, canvasW, canvasH);
                ctx.drawImage(cachedVals[imgIndex], 0, 0, canvasW, canvasH);
                // !!!callback every time on canvas context changes!
                this.conf.loadback?.(this.conf.canvas);

                // reach on endPoint with limits set console.log(this.conf.list[imgIndex], this.conf.edp)
                if (limitRepeat && onceDone) {
                    this.conf.times++;
                    if (this.reacheLimits(this.conf.times, this.conf.repeat)) {
                        this.conf.callback?.(this.conf.canvas, this.caches);
                        // optional poster after everything done.
                        ctx.clearRect(0, 0, canvasW, canvasH);
                        // ctx.drawImage(this.conf.poster, 0, 0, canvasW, canvasH);
                        this.cancelAnimation();
                        return;
                    }
                }

                // rewrite startTime to currentTime(lastest) for next loop
                startTime = currentTime;
            };

            // repeating animation
            this.requestAnimation(onceDone);
            // if (onceDone) this.conf.callback(this.conf.canvas)
        };

        // start animation
        this.requestAnimation(); //this.conf.loop();
        this.conf.callback?.(this.conf.canvas, this.caches);
    }
    
    loader (url, count, ext = '.png') {
        let list = [];
        for (let i=0; i<count + 1; i++) {
            const prefix = i<10 ? '0' : '';
            list.push(url + prefix + i + ext);
        }
        this.conf.list = list;
        return list; 
    }

    cancelAnimation () {
        cancelAnimationFrame(this.conf.rid);
    }
    
    requestAnimation (usedelay = false) {
        if (this.conf.rid) this.cancelAnimation();  // cancelAnimation if exist
        let timer;
        if (this.conf.delay && usedelay) {
            timer = setTimeout(() => {
                console.debug('once done delay..')
                this.conf.rid = requestAnimationFrame(this.conf.loop);
            }, this.conf.delay);
        } else {
            this.conf.rid = requestAnimationFrame(this.conf.loop);
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }
    }
    
    setupLimits() {
        // record max loads
        this.conf.max = this.conf.list.length - 1;
        // record end point(keys)
        this.conf.edp = this.conf.list[this.conf.max - 1];  // early stop frame-1
    }

    reacheLimits (current = this.conf.loads, target = this.conf.max) {
        // console.log(current, target);
        return current === target;
    }

    repeatLimits () {
        return this.conf.repeat > 0 && this.conf.repeat !== Infinity;
    }

    validArray (arr) {
        return arr && Array.isArray(arr);
    }

    get caches() {
        return this.#caches;
    }

    set caches(caches) {
        this.#caches = caches;
        if (this.conf.list.length === 0) this.conf.list = Array.from(caches.keys());
    }
}


class DampedEaseSystem {
    // 建议将默认配置抽离为静态属性
    static DEFAULT_CONFIG = {
        stiffness: 0.3,
        damping: 0.1,
        mass: 1,
        min: -Infinity,
        max: Infinity,
        thresholdRatio: 0.01,
        callback: null
    };

    constructor(from = 0, to = 1, config = {}) {
        this.from = from;
        this.to = to;
        this.current = from;
        this.velocity = 0;
        this.isCompleted = false; // 标记动画是否完成

        // 使用静态默认配置
        this.config = {
            ...DampedEaseSystem.DEFAULT_CONFIG,
            ...config
        };

        // 根据 from 和 to 的差值自动计算 threshold
        this.threshold = Math.max(
            Math.abs(this.to - this.from) * this.config.thresholdRatio,
            0.0001  // 防止过小的阈值导致动画无法结束
        );
    }

    // 更新系统状态并返回当前值
    update(deltaTime = 0.01) {
        // 添加deltaTime合法性检查
        if (deltaTime <= 0) return this.current;
        
        // 添加最大deltaTime限制，防止过大的时间步长导致不稳定
        deltaTime = Math.min(deltaTime, 0.1);

        if (this.isCompleted) {
            return this.current; // 如果动画已完成，直接返回当前值
        }

        const delta = this.to - this.current;
        const acceleration = (delta * this.config.stiffness) / this.config.mass;

        this.velocity += acceleration;
        this.velocity *= (1 - this.config.damping);
        this.current += this.velocity * deltaTime;

        // 边界约束
        if (this.current < this.config.min) {
            this.current = this.config.min;
            this.velocity = 0;
        } else if (this.current > this.config.max) {
            this.current = this.config.max;
            this.velocity = 0;
        }

        // 检查是否接近目标值
        if (Math.abs(this.current - this.to) < this.threshold && 
            Math.abs(this.velocity) < this.threshold) {
            // this.current = this.to; // 直接设置为目标值，避免微小偏差
            this.velocity = 0;
            this.isCompleted = true;
        }

        // 调用回调函数
        if (this.config.callback) {
            this.config.callback(this.current, this.velocity);
        }

        return this.current;
    }

    // 判断动画是否完成的getter
    get isFinished() {
        return this.isCompleted;
    }
    
    // 获取动画进度的getter
    get progress() {
        return (this.current - this.from) / (this.to - this.from);
    }
    
    // // 暂停方法
    // pause() {
    //     this.velocity = 0;
    // }
    
    // // 恢复方法
    // resume() {
    //     this.isCompleted = false;
    // }

    // // 重置系统
    // reset(value) {
    //     this.current = value;
    //     this.to = value;
    //     this.velocity = 0;
    //     this.threshold = Math.abs(this.to - this.current) * this.config.thresholdRatio; // 重新计算 threshold
    //     this.isCompleted = false; // 重置完成状态
    // }
    
    // // 设置目标值
    // setTarget(value) {
    //     // 添加参数验证
    //     if (typeof value !== 'number' || isNaN(value)) {
    //         throw new TypeError('Target value must be a valid number');
    //     }
    //     this.to = Math.max(this.config.min, Math.min(value, this.config.max));
    //     this.threshold = Math.abs(this.to - this.current) * this.config.thresholdRatio; // 重新计算 threshold
    //     this.isCompleted = false; // 重置完成状态
    // }
}

class FovDampingSystem {
    constructor(camera, control, config) {
        this.camera = camera;
        this.control = control;
        this.basic = camera.fov;
        this.target = camera.fov;
        this.current = camera.fov;
        this.velocity = 0;

        // 默认配置
        // 过阻尼（缓慢停止） { stiffness: 0.1, damping: 0.3 }
        // 欠阻尼（弹性效果） { stiffness: 0.3, damping: 0.1 }
        // 临界阻尼（快速平稳停止） { stiffness: 0.2, damping: 0.2 }
        this.config = {
            stiffness: 0.3,
            damping: 0.1,
            mass: 1,
            min: 15,
            max: 115,
            step: 2,
            abort: false,
            debug: false,
            // rotateTimes: 1,
            rotateSpeed: this.control.rotateSpeed,
            rotateReverse: false,
            ...config
        };
        // 限制配置
        let maximun = 120;
        if (this.config.max > maximun) maximun = this.config.max + 1;
        this.confLimit(10, maximun);
    }

    update(deltaTime = 0.01) {
        // console.log(this.camera.fov)
        const delta = this.target - this.current;
        const acceleration = (delta * this.config.stiffness) / this.config.mass;

        this.velocity += acceleration;
        this.velocity *= (1 - this.config.damping);
        this.current += this.velocity * deltaTime;

        // 边界约束
        if (this.current < this.config.min) {
            this.current = this.config.min;
            this.velocity = 0;
        } else if (this.current > this.config.max) {
            this.current = this.config.max;
            this.velocity = 0;
        }
        if (this.config.debug) console.log(this.current , this.target, this.config.min, this.config.max); //this.current, this.target
        if (this.current != this.basic) {
            this.camera.fov = this.current;
            // this.camera.updateProjectionMatrix();
        }
        // console.log(this.current)

        const zoomPercent = (this.current / this.config.max).toFixed(1); // * 100
        // console.log(parseFloat(zoomPercent));
        this.control.rotateSpeed = parseFloat(this.config.rotateReverse ? - zoomPercent : zoomPercent); // * this.config.rotateSpeed
    }

    updateFov(currentFov) {
        this.current = currentFov;
        // this.camera.updateProjectionMatrix();
    }
    
    confLimit(min, max) {
        if (this.config.min < min) this.config.min = min;
        if (this.config.max > max) this.config.min = max;
    }

    zoomIn() {
        this.target = Math.max(this.target - this.config.step, this.config.min);
    }

    zoomOut() {
        this.target = Math.min(this.target + this.config.step, this.config.max);
    }
}

class VisibilityObserver {
    /**
    * 创建一个 VisibilityObserver 实例
    * @param {Object} options - 配置选项
    * @param {number} options.threshold - 可见比例阈值 (0-1)
    * @param {number} options.rootMargin - 根元素的 margin
    * @param {Element} options.root - 根元素
    */
    constructor(options = {}) {
        this.options = {
            threshold: 0.01,
            rootMargin: '0px',
            root: null,
            ...options
        };
        
        this.observers = new Map();
        this.callbacks = new Map();
        
        // 检查浏览器是否支持 IntersectionObserver
        this.supportsIntersectionObserver = 
        'IntersectionObserver' in window &&
        'IntersectionObserverEntry' in window &&
        'intersectionRatio' in window.IntersectionObserverEntry.prototype;
        
        if (!this.supportsIntersectionObserver) console.warn('IntersectionObserver not supported, falling back to manual checking');
    }
    /**
    * 观察目标元素的可见性
    * @param {Element} target - 要观察的 DOM 元素
    * @param {Function} callback - 可见性变化时的回调函数
    * @param {Object} options - 覆盖实例选项的配置
    */
    observe(target, callback, options = {}) {
        if (!target || !(target instanceof Element)) throw new Error('Invalid target element');
        if (typeof callback !== 'function') throw new Error('Callback must be a function');
        
        const mergedOptions = { ...this.options, ...options };
        
        // 如果已经观察过这个元素，先取消观察
        if (this.observers.has(target)) this.unobserve(target);
        
        // 开始观察 IntersectionObserver
        if (this.supportsIntersectionObserver) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    callback({
                        target: entry.target,
                        isVisible: entry.isIntersecting && entry.intersectionRatio >= mergedOptions.threshold,
                        intersectionRatio: entry.intersectionRatio
                    });
                });
            }, mergedOptions);
            
            observer.observe(target);
            this.observers.set(target, observer);
        } else {
            // 兼容方案
            const checkVisibility = () => {
                const isVisible = this._isElementVisible(target, mergedOptions);
                callback({
                    target,
                    isVisible,
                    intersectionRatio: isVisible ? 1 : 0
                });
            };
            // 初始检查
            checkVisibility();
            // 存储回调以便后续取消
            this.callbacks.set(target, { callback, checkVisibility });
            // 添加滚动和resize事件监听
            // const eventbus = new _Closure();
            // eventbus.bind(window, 'scroll', eventbus.debouncer(checkVisibility, 1000));
            window.addEventListener('scroll', checkVisibility, { passive: true });
            window.addEventListener('resize', checkVisibility, { passive: true });
        }
    }
    /**
    * 停止观察目标元素
    * @param {Element} target - 要停止观察的 DOM 元素
    */
    unobserve(target) {
        if (this.supportsIntersectionObserver) {
            const observer = this.observers.get(target);
            if (observer) {
                observer.disconnect();
                this.observers.delete(target);
            }
        } else {
            const entry = this.callbacks.get(target);
            if (entry) {
                window.removeEventListener('scroll', entry.checkVisibility);
                window.removeEventListener('resize', entry.checkVisibility);
                this.callbacks.delete(target);
            }
        }
    }
    /**
    * 销毁所有观察者
    */
    disconnect() {
        if (this.supportsIntersectionObserver) {
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();
        } else {
            this.callbacks.forEach(entry => {
                window.removeEventListener('scroll', entry.checkVisibility);
                window.removeEventListener('resize', entry.checkVisibility);
            });
            this.callbacks.clear();
        }
    }
    /**
    * 手动检查元素是否可见 (兼容方案)
    * @private
    */
    _isElementVisible(element, options) {
        if (!element || !element.getBoundingClientRect) return false;
        
        const rect = element.getBoundingClientRect();
        const rootRect = options.root ? options.root.getBoundingClientRect() : {
            top: 0,
            left: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        // 计算元素与根元素的交集
        const intersectionRect = {
            top: Math.max(rect.top, rootRect.top),
            left: Math.max(rect.left, rootRect.left),
            bottom: Math.min(rect.bottom, rootRect.bottom),
            right: Math.min(rect.right, rootRect.right)
        };
        // 计算交集区域面积
        const intersectionArea = Math.max(0, intersectionRect.bottom - intersectionRect.top) * Math.max(0, intersectionRect.right - intersectionRect.left);
        // 计算元素总面积
        const elementArea = (rect.bottom - rect.top) * (rect.right - rect.left);
        // 计算可见比例
        const ratio = elementArea > 0 ? intersectionArea / elementArea : 0;
        
        return ratio >= options.threshold;
    }
}

// exports
export {
    _EventBus, _Closure, _Basics, _events, _storage, 
    FovDampingSystem, DampedEaseSystem, SequenceImagesVideo, VisibilityObserver,
};