
// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
// const hdrLoader = new RGBELoader();

self.onmessage = async function(event) {
    const {src, path, type} = event.data;

    // // 直接加载返回HDR贴图BUG：贴图文件proto为object而非Texture!!!
    // hdrLoader.loadAsync(path + src).then((map)=> {
    //     console.log(`map [pre-loaded] via worker.`, map);
    //     self.postMessage({ map: map, src: src }); // 将加载完的贴图发送回主线程
    //     self.close();
    // });

    try {
        let blob;
        // loaded++; // counts for loadedProcess
        if (typeof fetch === 'function') {
            // 使用 Fetch API 加载 HDR 文件
            const response = await fetch(path + src);
            switch (type) {
                case 'hdrArrayBuffer':
                    // 默认使用 Transferable Objects 传输 ArrayBuffer
                    const arrayBuffer = await response.arrayBuffer();
                    blob = new Blob([arrayBuffer]);
                    self.postMessage({ type: type, data: arrayBuffer, url: URL.createObjectURL(blob), src: src }, [arrayBuffer]);
                    break;
                // case 'hdrFileReader':
                // case 'imgFileReader':
                // case 'imgArrayBuffer':
                case 'BASE':
                case 'RGBE':
                case 'VIDEO':
                default:
                    // 使用 FileReader 传输 DataURL(faster?)
                    blob = await response.blob();
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onload = function() {
                        self.postMessage({ type: type, data: reader.result, url: URL.createObjectURL(blob), src: src });//, data: reader.result
                    }
                    break;
            }
        } else {
            // 使用 XMLHttpRequest 加载 HDR 文件
            const xhr = new XMLHttpRequest();
            xhr.open('GET', path + src, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                const arrayBuffer = xhr.response;
                blob = new Blob([arrayBuffer]);
                self.postMessage({ type: type, data: arrayBuffer, url: URL.createObjectURL(blob), src: src }); // 将加载完的贴图发送回主线程
            };
            xhr.send();
        }
    } catch (error) {
        console.error('Error loading HDR file:', error);
    }
};