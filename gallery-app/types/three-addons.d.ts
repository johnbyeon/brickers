// three.js 애드온용 타입 선언
declare module "three/addons/loaders/LDrawLoader.js" {
    import * as THREE from "three";

    export class LDrawLoader extends THREE.Loader {
        smoothNormals: boolean;
        setPartsLibraryPath(path: string): this;
        preloadMaterials(url: string): Promise<void>;
        loadAsync(url: string): Promise<THREE.Group>;
        setConditionalLineMaterial(material: any): this;
    }
}

declare module "three/addons/materials/LDrawConditionalLineMaterial.js" {
    import * as THREE from "three";

    export class LDrawConditionalLineMaterial extends THREE.ShaderMaterial {
        constructor(parameters?: THREE.ShaderMaterialParameters);
    }
}
