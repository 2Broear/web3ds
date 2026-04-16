# Web3Ds
web3d panorama/model viewer via three.js

### MAIN FEAT
- Equidistant cylindrical projection
- GLB/GLTF 3D Model (DRACOLoader Optimization)
- Multi Scene Switch Supports
- Custom Scene(Background Src / Environment Images Array) / Entry Points Args / Scene Context / Camera Transform Animation etc..

### QUICK START
Run one of these scripts on Node.js CLI, Based on Webpack.
```
// prod
npm run build

// dev(9001/9002)
npm start
```

## 3d scene viewer
load image(image/video) as [3d-panorama views](https://node.2broear.com/);

![Preview](https://raw.githubusercontent.com/2Broear/web3ds/refs/heads/main/screenshot/panorama-map.gif "3d-model-viewer")

## 3d model viewer
load model(gltf/glb) as [3d-model views](https://node.2broear.com/?texture&entry=tesla_model_3&model=/assets/3d/draco/tesla_2018_model_3-edit_compressed.glb);

![Preview](https://raw.githubusercontent.com/2Broear/web3ds/refs/heads/main/screenshot/3d-model-view.gif "3d-model-viewer")
