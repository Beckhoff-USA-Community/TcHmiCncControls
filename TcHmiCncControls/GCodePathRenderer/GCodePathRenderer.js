// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

/*
 * Generated 5/13/2024 4:06:42 PM
 * Copyright (C) 2024
 */

var TcHmi;
(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    let Controls;
    (function (/** @type {globalThis.TcHmi.Controls} */ Controls) {
        let TcHmiCncControls;
        (function (TcHmiCncControls) {
            class GCodePathRenderer extends TcHmi.Controls.System.TcHmiControl {

                /**
                 * Constructor of the control
                 * @param {JQuery} element Element from HTML (internal, do not use)
                 * @param {JQuery} pcElement precompiled Element (internal, do not use)
                 * @param {TcHmi.Controls.ControlAttributeList} attrs Attributes defined in HTML in a special format (internal, do not use)
                 * @returns {void}
                 */
                constructor(element, pcElement, attrs) {
                    /** Call base class constructor */
                    super(element, pcElement, attrs);

                    this.__elementCanvas = null;
                    this.__engine = null;
                    this.__scene = null;
                    this.__lineData = {};
                    this.__selectionZoomData = {};

                    this.__pathString = "";
                    this.__selectedMeshId = 0;
                    this.__renderProgress = false;
                    this.__hideG0Lines = false;
                    this.__cncConfig = {
                        ijkRelative: true, maxArcRenderingPoints: 32
                    };
                    this.__toolingConfig = {
                        showTooling: true,
                        modelPath: null,
                        rotationUnit: "Degrees",
                        positionOffset: {
                            x: 0, y: 0, z: 0
                        },
                        rotationOffset: {
                            x: 0, y: 0, z: 0
                        },
                        scaling: {
                            x: 1.0, y: 1.0, z: 1.0
                        },
                        cameraFollow: false
                    };
                    this.__toolingDynamics = {
                        position: {
                            x: 0, y: 0, z: 0
                        },
                        rotation: {
                            x: 0, y: 0, z: 0
                        }
                    };
                    this.__loadingTool = false;
                    this.__selectionZoom = false;

                    this.__sceneBgColor = null;
                    this.__g00LineColor = null;
                    this.__g01LineColor = null;
                    this.__g02LineColor = null;
                    this.__g03LineColor = null;
                    this.__traceLineColor = null;
                    this.__lineColors = {};
                }

                __previnit() {
                    // Fetch template root element
                    this.__elementTemplateRoot = this.__element.find('.TcHmi_Controls_TcHmiCncControls_GCodePathRenderer-Template');
                    if (this.__elementTemplateRoot.length === 0) {
                        throw new Error('Invalid Template.html');
                    }

                    // retrieve canvas element
                    this.__elementCanvas = this.__elementTemplateRoot.find('.gcode-render-canvas').get(0);

                    if (this.__elementCanvas) {
                        //create BABYLON engine
                        this.__engine = new BABYLON.Engine(this.__elementCanvas, true);
                    }

                    // Call __previnit of base class
                    super.__previnit();
                }

                __init() {
                    super.__init();
                    // init scene
                    this.__initScene();
                }
                __attach() {
                    super.__attach();
                }
                __detach() {
                    super.__detach();
                }

                // init / re-init babylon scene
                __initScene() {
                    if (this.__engine) {

                        if (this.__scene) {
                            this.__scene.dispose();
                            window.removeEventListener("resize", this.__handleResize);
                        }

                        // generate scene
                        const engine = this.__engine;
                        const scene = new BABYLON.Scene(engine);
                        this.__scene = scene;

                        // right-hand coordinate system
                        scene.useRightHandedSystem = true;

                        // init camera
                        const camera = new BABYLON.ArcRotateCamera(
                            "camera0", Math.PI / 2, Math.PI / 2, 7, BABYLON.Vector3.Zero(), scene);

                        // scroll zoom config
                        camera.minZ = 0;
                        camera.wheelPrecision = 40;

                        // prevent zoom through
                        camera.lowerRadiusLimit = 0.5;
                        camera.attachControl();

                        new BABYLON.Debug.AxesViewer(scene, 0.5)
                        new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

                        // resize engine on window resize
                        window.addEventListener("resize", this.__handleResize);

                        // register render loop
                        engine.runRenderLoop(function () {
                            scene.render();
                        });

                        // give time for init, then resize
                        setTimeout(() => { engine.resize(); }, 1000);

                        // background color
                        if (this.__sceneBgColor) {
                            scene.clearColor = this.__hmiColorToBablyonColor(this.__sceneBgColor);
                        }

                        // line colors
                        this.__lineColors = {
                            g00: this.__hmiColorToBablyonColor(this.__g00LineColor) ?? new BABYLON.Color4(0, 0, 1, 1),
                            g01: this.__hmiColorToBablyonColor(this.__g01LineColor) ?? new BABYLON.Color4(0, 1, 0, 1),
                            g02: this.__hmiColorToBablyonColor(this.__g02LineColor) ?? new BABYLON.Color4(0, 1, 0, 1),
                            g03: this.__hmiColorToBablyonColor(this.__g03LineColor) ?? new BABYLON.Color4(0, 1, 0, 1),
                            trace: this.__hmiColorToBablyonColor(this.__traceLineColor) ?? new BABYLON.Color4(1, 0, 0, 1) 
                        };

                        // mouse events
                        scene.onPointerObservable.add((pointerInfo) => {
                            switch (pointerInfo.type) {
                                case BABYLON.PointerEventTypes.POINTERDOWN:
                                    // ignore right-click
                                    if (pointerInfo.event.inputIndex === 4) return;
                                    if (!pointerInfo.pickInfo.hit) return;

                                    if (!this.__selectionZoomData.drag) {
                                        if (pointerInfo.pickInfo.pickedMesh.id === "lineSystem") {
                                            this.__onMeshPicked(pointerInfo.pickInfo);
                                        } else {
                                            if (!this.__selectionZoom) return;
                                            this.__onSelectionZoomStart(pointerInfo.pickInfo);
                                        }
                                    } else this.__onSelectionZoomEnd();

                                    break;

                                case BABYLON.PointerEventTypes.POINTERMOVE:
                                    if (this.__selectionZoom && this.__selectionZoomData.drag)
                                        this.__onSelectionZoomDrag(scene.pick(scene.pointerX, scene.pointerY));
                                    break;

                                default:
                                    break;
                            }
                        });

                        // load tooling
                        if (this.__toolingConfig.showTooling)
                            this.__loadToolingModel(this.__toolingConfig);
                    }
                }

                __hmiColorToBablyonColor(hmiColor) {
                    if (hmiColor == null) return;
                    const [r, g, b, a] = hmiColor.color.match(/[\d\.]+/g).map(Number);
                    return new BABYLON.Color4((r / 255), (g / 255), (b / 255), a);
                }

                __handleResize() {
                    // resize scene if parent element size changes
                    this.__engine?.resize();
                }

                __onSelectionZoomStart(pickInfo) {

                    const start = pickInfo.pickedPoint;
                    this.__selectionZoomData.mesh = BABYLON.MeshBuilder.CreateLines(
                        "zoomBox",
                        {
                            points: [start, 0, start, 0, start],
                            updatable: true
                        }
                    );

                    this.__selectionZoomData.start = start;
                    this.__selectionZoomData.drag = true;
                }

                __onSelectionZoomDrag(pickInfo) {

                    if (!pickInfo.pickedPoint) return;
                    const start = this.__selectionZoomData.start;
                    const end = pickInfo.pickedPoint;
                    const startB = new BABYLON.Vector3(end.x, start.y, start.z);
                    const endB = new BABYLON.Vector3(start.x, end.y, end.z);

                    this.__selectionZoomData.mesh = BABYLON.MeshBuilder.CreateLines(
                        "zoomBox",
                        {
                            points: [start, startB, end, endB, start],
                            updatable: true,
                            instance: this.__selectionZoomData.mesh
                        }
                    );

                    this.__selectionZoomData.end = end;
                }

                __onSelectionZoomEnd() {

                    this.__selectionZoomData.mesh.refreshBoundingInfo();
                    this.__focusMesh(this.__selectionZoomData.mesh);

                    this.__selectionZoomData.drag = false;
                    this.__selectionZoomData.mesh.dispose();
                }

                // mesh clicked handler
                __onMeshPicked(pickInfo) {
                    const id = this.__lineData.faceIdMap.get(pickInfo.subMeshFaceId);
                    this.__selectedMeshId = id;
                    TcHmi.EventProvider.raise(`${this.getId()}.onPropertyChanged`, {
                        propertyName: "SelectedMeshId",
                    });
                }

                __focusMesh(mesh) {

                    if (!this.__scene) return;

                    // get active camera
                    const camera = this.__scene.activeCamera;

                    const bounds = mesh.getBoundingInfo();

                    var framingBehavior = new BABYLON.FramingBehavior();
                    framingBehavior.framingTime = 750;
                    framingBehavior.radiusScale = 0.7;
                    framingBehavior.autoCorrectCameraLimitsAndSensibility = false;
                    framingBehavior.elevationReturnTime = -1;
                    framingBehavior.attach(camera);
                    framingBehavior.zoomOnBoundingInfo(bounds.maximum, bounds.minimum, false, () => {
                        // todo: normalize to Z axis or nah?
                        camera.alpha = Math.PI / 2;
                        camera.beta = Math.PI / 2;
                        framingBehavior.detach();
                    });
                }

                __toggleSelectionZoom(enabled) {
                    if (!this.__scene) return;

                    // get active camera
                    const camera = this.__scene.activeCamera;

                    // turn off mouse1 camera rotation
                    camera.angularSensibilityX = (enabled) ? 1000000 : 3000;
                    camera.angularSensibilityY = (enabled) ? 1000000 : 3000;
                }

                // main rendering logic
                __renderPath(gcode) {

                    this.__initScene();

                    // trace path
                    const interpreter = new GCodePathInterpreter(this.__cncConfig);
                    const paths = interpreter.Trace(gcode);
                    const parent = this;

                    // generate line and color arrays
                    const lines = [];
                    const colors = [];
                    const ids = [];
                    const faceIdMap = new Map();
                    let faceId = 0;
                    paths.forEach((p, i) => {
                        if (this.__hideG0Lines && p.code === "g00") return;
                        const l = p.points.map((x, j) => {
                            if (j > 0) faceIdMap.set(faceId++, p.id);
                            return new BABYLON.Vector3(x.x, x.y, x.z)
                        });
                        const c = p.points.map(_ => parent.__lineColors[p.code]);

                        lines.push(l);
                        colors.push(c);
                        ids.push(p.id);
                    });

                    // create line system
                    const ls = BABYLON.MeshBuilder.CreateLineSystem(
                        "lineSystem",
                        {
                            lines: lines,
                            colors: colors,
                            updatable: true
                        },
                        this.__scene
                    );
                    // pick threshhold
                    ls.intersectionThreshold = 0.05;

                    // store line data in control state
                    this.__lineData.lineSystem = ls;
                    this.__lineData.lines = lines;
                    this.__lineData.colors = colors;
                    this.__lineData.ids = ids;
                    this.__lineData.faceIdMap = faceIdMap;

                    // set view
                    this.__focusMesh(ls);
                    this.__toggleSelectionZoom(this.__selectionZoom);

                    // create (invisible) ground mesh
                    const bounds = ls.getBoundingInfo();
                    const bg = BABYLON.MeshBuilder.CreatePlane(
                        "bg",
                        {
                            width: bounds.maximum.x + (bounds.maximum.x * 0.25),
                            height: bounds.maximum.y + (bounds.maximum.y * 0.25),
                            sideOrientation: BABYLON.Mesh.DOUBLESIDE
                        },
                    );
                    bg.position = new BABYLON.Vector3(bounds.boundingBox.center.x, bounds.boundingBox.center.y, bounds.minimum.z);
                    bg.visibility = 0;
                }

                // set mesh colors based on id
                __updateRendering(id) {

                    const ld = this.__lineData;
                    if (!ld.colors) return;

                    // set colors
                    let traced = [];
                    for (let i = 0; i < ld.colors.length; i++) {
                        traced.push(ld.colors[i].slice());
                        if (ld.ids[i] <= id) {
                            ld.colors[i].forEach((_, j) =>
                                traced[i][j] = this.__lineColors.trace);
                        } else {
                            ld.colors[i].forEach((_, j) =>
                                traced[i][j] = ld.colors[i][j]);
                        }
                    }

                    // update colors
                    ld.lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
                        "lineSystem",
                        {
                            lines: ld.lines,
                            colors: traced,
                            instance: ld.lineSystem,
                            updatable: true
                        }
                    );
                }

                // update tooling
                __updateTooling(dynamics) {

                    if (!this.__scene || this.__loadingTool)
                        return;

                    let mesh = this.__scene.getMeshByName("tool");
                    if (!mesh) return;

                    this.__toolingDynamics = dynamics;

                    mesh.position.x = this.__toolingConfig.positionOffset.x + parseFloat(dynamics.position.x);
                    mesh.position.y = this.__toolingConfig.positionOffset.y + parseFloat(dynamics.position.y);
                    mesh.position.z = this.__toolingConfig.positionOffset.z + parseFloat(dynamics.position.z);

                    // abc rotation
                    const mult = (this.__toolingConfig.rotationUnit === "Degrees") ? Math.PI / 180 : 1;
                    mesh.rotation = BABYLON.Vector3.Zero();
                    mesh.rotation = new BABYLON.Vector3(
                        (parseFloat(dynamics.rotation.x) + this.__toolingConfig.rotationOffset.x) * mult,
                        (parseFloat(dynamics.rotation.y) + this.__toolingConfig.rotationOffset.y) * mult,
                        (parseFloat(dynamics.rotation.z) + this.__toolingConfig.rotationOffset.z) * mult
                    );

                    if (this.__toolingConfig.cameraFollow) {
                        const camera = this.__scene.activeCamera;
                        camera?.setTarget(mesh);
                    }
                }

                async __updateToolingConfig(config) {
                    await this.__loadToolingModel(config);
                    this.__toolingConfig = config;
                }

                async __loadToolingModel(config) {
                    // prevent concurrent calls
                    if (!this.__scene || this.__loadingTool) return;
                    this.__loadingTool = true;

                    const oldMesh = this.__scene.getMeshByName("tool");
                    if (oldMesh) oldMesh.dispose();

                    let m;
                    if (config.showTooling) {
                        if (config.modelPath) {
                            const imported = await BABYLON.SceneLoader.ImportMeshAsync(null, config.modelPath);
                            m = imported.meshes[0];
                            m.name = m.id = "tool";
                        } else {
                            m = BABYLON.MeshBuilder.CreateCylinder("tool", { diameter: 0.1, height: 0.5 });
                        }

                        if (m) {
                            m.scaling = new BABYLON.Vector3(
                                parseFloat(config.scaling.x),
                                parseFloat(config.scaling.y),
                                parseFloat(config.scaling.z)
                            );
                        }
                    }

                    this.__loadingTool = false;
                    this.__updateTooling(this.__toolingDynamics);
                }

                // facilitates binding object property members
                __resolveObjectProperty(propertyName, value, processFn) {

                    // get state references
                    const parent = this;
                    
                    let convertedValue = TcHmi.ValueConverter.toObject(value);
                    if (convertedValue === null) {
                        // if we have no value to set we have to fall back to the defaultValueInternal from description.json
                        convertedValue = this.getAttributeDefaultValueInternal(propertyName);
                    }

                    let resolverInfo = this.__objectResolvers.get(propertyName);
                    if (resolverInfo) {
                        if (resolverInfo.watchDestroyer) {
                            resolverInfo.watchDestroyer();
                        }
                        resolverInfo.resolver.destroy();
                    }

                    let resolver = new TcHmi.Symbol.ObjectResolver(convertedValue);
                    this.__objectResolvers.set(propertyName, {
                        resolver: resolver,
                        watchCallback: callbackFn,
                        watchDestroyer: resolver.watch(callbackFn)
                    });

                    // object resolver callback
                    function callbackFn(data) {
                        if (parent.__isAttached === false) { // While not attached attribute should only be processed once during initializing phase.
                            parent.__suspendObjectResolver(propertyName);
                        }

                        if (data.error !== TcHmi.Errors.NONE) {
                            TcHmi.Log.error('[Source=Control, Module=TcHmi.Controls.System.TcHmiControl, Id=' +
                                parent.getId() + ', Attribute=Value] Resolving symbols from object failed with error: ' + TcHmi.Log.buildMessage(data.details));
                            return;
                        }

                        if (processFn) {
                            processFn.bind(parent)(data.value);
                            TcHmi.EventProvider.raise(parent.__id + '.onPropertyChanged', { propertyName: propertyName });
                        }
                    }
                }

                destroy() {
                    /**
                     * Ignore while __keepAlive is set to true.
                     */
                    if (this.__keepAlive) {
                        return;
                    }
                    super.destroy();

                    this.__scene?.dispose();
                    this.__engine?.dispose();
                }

                /// public methods

                setPath(value) {
                    this.__pathString = value;
                    if (value.length)
                        this.__renderPath(value);
                }

                resetCamera() {
                    if (this.__lineData.lineSystem)
                        this.__focusMesh(this.__lineData.lineSystem);
                }

                /// properties

                getSelectedMeshId() {
                    return this.__selectedMeshId;
                }

                setSelectedMeshId(value) {
                    this.__selectedMeshId = value;
                    if (this.__renderProgress) {
                        this.__updateRendering(value);
                    }
                }

                getRenderProgress() {
                    return this.__renderProgress;
                }

                setRenderProgress(value) {
                    this.__renderProgress = value;
                }

                getHideG0Lines() {
                    return this.__hideG0Lines;
                }

                setHideG0Lines(value) {
                    this.__hideG0Lines = value;
                }

                getSelectionZoom() {
                    return this.__selectionZoom;
                }

                setSelectionZoom(value) {
                    this.__selectionZoom = value;
                    this.__toggleSelectionZoom(value);
                }

                getCncConfig() {
                    return this.__cncConfig;
                }

                setCncConfig(value) {
                    this.__cncConfig = value;
                }

                getToolingConfig() {
                    return this.__toolingConfig;
                }

                setToolingConfig(value) {
                    this.__resolveObjectProperty('toolingConfig', value, this.__updateToolingConfig);
                }

                getToolingDynamics() {
                    return this.__toolingDynamics;
                }

                setToolingDynamics(value) {
                    this.__resolveObjectProperty('toolingDynamics', value, this.__updateTooling);
                }

                getSceneBgColor() {
                    return this.__sceneBgColor;
                }

                setSceneBgColor(value) {
                    this.__sceneBgColor = value;
                }

                getG00LineColor() {
                    return this.__g00LineColor;
                }

                setG00LineColor(value) {
                    this.__g00LineColor = value;
                }

                getG01LineColor() {
                    return this.__g01LineColor;
                }

                setG01LineColor(value) {
                    this.__g01LineColor = value;
                }

                getG02LineColor() {
                    return this.__g02LineColor;
                }

                setG02LineColor(value) {
                    this.__g02LineColor = value;
                }

                getG03LineColor() {
                    return this.__g03LineColor;
                }

                setG03LineColor(value) {
                    this.__g03LineColor = value;
                }

                getTraceLineColor() {
                    return this.__traceLineColor;
                }

                setTraceLineColor(value) {
                    this.__traceLineColor = value;
                }
            }
            TcHmiCncControls.GCodePathRenderer = GCodePathRenderer;
        })(TcHmiCncControls = Controls.TcHmiCncControls || (Controls.TcHmiCncControls = {}));
    })(Controls = TcHmi.Controls || (TcHmi.Controls = {}));
})(TcHmi || (TcHmi = {}));

// Register Control
TcHmi.Controls.registerEx('GCodePathRenderer', 'TcHmi.Controls.TcHmiCncControls', TcHmi.Controls.TcHmiCncControls.GCodePathRenderer);
