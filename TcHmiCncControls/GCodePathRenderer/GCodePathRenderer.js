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

                    // babylon vars
                    this.__engine = null;
                    this.__scene = null;

                    // line data for path rendering
                    this.__progressLines = {
                        lines: [],
                        colors: [],
                        ids: [],
                        meshName: "progressLines",
                        faceIdMap: null,
                        lineSystem: null
                    };

                    // line data for tool path tracing
                    this.__toolPathLines = {
                        MAX_LEN: 32000,
                        prevPoint: null,
                        idx: 0,
                        lines: [],
                        meshName: "toolPathLines",
                        lineSystem: null
                    };

                    this.__selectionZoomData = {};
                    this.__selectionZoom = false;

                    // gcode string
                    this.__pathString = "";

                    // selected segment for progress rendering
                    this.__selectedSegment = 0;
                    this.__renderProgress = false;
                    this.__hideG0Lines = false;

                    this.__cncConfig = {
                        ijkRelative: true,
                        maxArcRenderingPoints: 32,
                        workArea: {
                            visible: false,
                            width: 24,
                            height: 24,
                            units: "inches",
                            zoffset: -0.1,
                            originAlignment: "Center",
                            color: null
                        },
                        workOffsets: {
                            g54: { x: 0.0, y: 0.0, z: 0.0 },
                            g55: { x: 0.0, y: 0.0, z: 0.0 },
                            g56: { x: 0.0, y: 0.0, z: 0.0 },
                            g57: { x: 0.0, y: 0.0, z: 0.0 },
                            g58: { x: 0.0, y: 0.0, z: 0.0 },
                            g59: { x: 0.0, y: 0.0, z: 0.0 },
                        }
                    };

                    this.__toolingConfig = {
                        showTooling: true,
                        modelFilePath: null,
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
                        trackToolPath: false,
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

                    this.__lockCamera = false;

                    // lock flag for async model loading
                    this.__loadingTool = false;

                    // colors - holds property value in TcHmi color type
                    this.__sceneBgColor = null;
                    this.__g00LineColor = null;
                    this.__g01LineColor = null;
                    this.__g02LineColor = null;
                    this.__g03LineColor = null;
                    this.__programTraceLineColor = null;
                    this.__toolingTraceLineColor = null;

                    // colors - holds converted value in babylon color type
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

                    // init scene
                    this.__initScene();

                    // Call __previnit of base class
                    super.__previnit();
                }

                __init() {
                    super.__init();
                }
                __attach() {
                    super.__attach();
                }
                __detach() {
                    window.removeEventListener("resize", this.__handleResize);
                    super.__detach();
                }

                // init babylon scene
                __initScene() {
                    if (this.__engine) {

                        // generate scene
                        const engine = this.__engine;
                        const scene = new BABYLON.Scene(engine);
                        this.__scene = scene;

                        scene.useRightHandedSystem = true;

                        // init default camera
                        const camera = new BABYLON.ArcRotateCamera(
                            "camera0", Math.PI / 2, Math.PI / 2, 7, BABYLON.Vector3.Zero(), scene);

                        // camera settings
                        camera.minZ = 0;
                        camera.wheelPrecision = 40;
                        camera.lowerRadiusLimit = 0.5;
                        camera.attachControl();

                        new BABYLON.Debug.AxesViewer(scene, 0.5);
                        new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

                        // resize engine on window resize
                        window.addEventListener("resize", this.__handleResize);
                        setTimeout(() => { engine.resize(); }, 1000);

                        // init line color defaults
                        this.__lineColors = {
                            g00: new BABYLON.Color4(0, 0, 1, 1),
                            g01: new BABYLON.Color4(0, 1, 0, 1),
                            g02: new BABYLON.Color4(0, 1, 0, 1),
                            g03: new BABYLON.Color4(0, 1, 0, 1),
                            programTrace: new BABYLON.Color4(1, 0, 0, 1),
                            toolingTrace: new BABYLON.Color4(1, 1, 1, 1) 
                        };

                        // register render loop
                        engine.runRenderLoop(function () {
                            scene.render();
                        });

                        // mouse events
                        scene.onPointerObservable.add((pointerInfo) => {
                            switch (pointerInfo.type) {
                                case BABYLON.PointerEventTypes.POINTERDOWN:
                                    // ignore right-click
                                    if (pointerInfo.event.inputIndex === 4) return;
                                    if (!pointerInfo.pickInfo.hit) return;

                                    if (!this.__selectionZoomData.drag) {
                                        // line segment click
                                        if (pointerInfo.pickInfo.pickedMesh.id === this.__progressLines.meshName) {
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
                    }
                }

                __handleResize() {
                    this.__engine?.resize();
                }

                // first click initiates drawing zoom area box
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

                // drag sizing zoom area box
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

                // focus camera to zoomed area
                __onSelectionZoomEnd() {

                    this.__selectionZoomData.mesh.refreshBoundingInfo();
                    this.__focusMesh(this.__selectionZoomData.mesh);

                    this.__selectionZoomData.drag = false;
                    this.__selectionZoomData.mesh.dispose();
                }

                // mesh clicked handler
                __onMeshPicked(pickInfo) {

                    // get selected segment
                    const id = this.__progressLines.faceIdMap.get(pickInfo.subMeshFaceId);
                    this.__selectedSegment = id;

                    // set and raise control property change event
                    TcHmi.EventProvider.raise(`${this.getId()}.onPropertyChanged`, {
                        propertyName: "SelectedSegment",
                    });
                }

                // set camera focus on mesh w/ easing
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

                    // zoom to appropriate bounds and normal to Z axis
                    framingBehavior.zoomOnBoundingInfo(bounds.maximum, bounds.minimum, false, () => {
                        camera.alpha = Math.PI / 2;
                        camera.beta = Math.PI / 2;
                        framingBehavior.detach();
                    });
                }

                __toggleSelectionZoom(enabled) {
                    if (!this.__scene) return;

                    // get active camera
                    const camera = this.__scene.activeCamera;

                    // disable mouse camera rotation
                    camera.angularSensibilityX = (enabled) ? 1000000 : 3000;
                    camera.angularSensibilityY = (enabled) ? 1000000 : 3000;
                }

                // main rendering logic
                __renderPath(gcode) {
                    
                    // parse gcode and trace path
                    const interpreter = new GCodePathInterpreter(this.__cncConfig);
                    const paths = interpreter.Trace(gcode);
                    const parent = this;

                    // generate line and color arrays for line system
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

                    // clean up / create line system
                    this.__scene.getMeshByName(this.__progressLines.meshName)?.dispose();
                    const ls = BABYLON.MeshBuilder.CreateLineSystem(
                        this.__progressLines.meshName,
                        {
                            lines: lines,
                            colors: colors,
                            updatable: true
                        },
                        this.__scene
                    );

                    // set pick threshhold (higher value = easier to click select segments)
                    ls.intersectionThreshold = 0.05;

                    // store line data in control state
                    this.__progressLines.lineSystem = ls;
                    this.__progressLines.lines = lines;
                    this.__progressLines.colors = colors;
                    this.__progressLines.ids = ids;
                    this.__progressLines.faceIdMap = faceIdMap;

                    // set view
                    this.__focusMesh(ls);
                    this.__toggleSelectionZoom(this.__selectionZoom);

                    // create (invisible) ground mesh based on bounds of path mesh
                    // a background mesh is required to get pick points for selection zoom
                    const bounds = ls.getBoundingInfo();
                    const bg = BABYLON.MeshBuilder.CreatePlane(
                        "zoomBg",
                        {
                            width: bounds.maximum.x + (bounds.maximum.x * 0.25),
                            height: bounds.maximum.y + (bounds.maximum.y * 0.25),
                            sideOrientation: BABYLON.Mesh.DOUBLESIDE
                        },
                    );
                    bg.position = new BABYLON.Vector3(bounds.boundingBox.center.x, bounds.boundingBox.center.y, bounds.minimum.z);
                    bg.visibility = 0;
                }

                __renderWorkArea(workArea) {

                    this.__scene.getMeshByName("workArea")?.dispose();
                    if (!workArea.visible) return;

                    const width = (workArea.units === "mm") ? (workArea.width / 25.4) : workArea.width;
                    const height = (workArea.units === "mm") ? (workArea.height / 25.4) : workArea.height;

                    const mesh = BABYLON.MeshBuilder.CreatePlane(
                        "workArea",
                        {
                            width: width,
                            height: height,
                            sideOrientation: BABYLON.Mesh.DOUBLESIDE
                        },
                    );

                    let align;
                    switch (workArea.originAlignment) {
                        case "BottomLeft":
                            align = new BABYLON.Vector3(workArea.width / 2, workArea.height / 2, workArea.zoffset);
                            break;
                        case "BottomRight":
                            align = new BABYLON.Vector3(-workArea.width / 2, workArea.height / 2, workArea.zoffset);
                            break;
                        case "TopLeft":
                            align = new BABYLON.Vector3(workArea.width / 2, -workArea.height / 2, workArea.zoffset);
                            break;
                        case "TopRight":
                            align = new BABYLON.Vector3(-workArea.width / 2, -workArea.height / 2, workArea.zoffset);
                            break;
                        default:
                            align = new BABYLON.Vector3(0, 0, workArea.zoffset);
                            break;
                    }
                    mesh.position = align;
                    if (workArea.color) {
                        mesh.color = this.__hmiColorToBablyonColor(workArea.color);
                    } else {
                        mesh.color = new BABYLON.Color4(1, 1, 1, 0.75);
                    }
                }

                // set colors based on progress (selected segment)
                __updateProgress(id) {

                    const ld = this.__progressLines;
                    if (!ld.colors || !ld.lineSystem) return;

                    // set all line segments below selected segment to program trace color
                    let traced = [];
                    for (let i = 0; i < ld.colors.length; i++) {
                        traced.push(ld.colors[i].slice());
                        if (ld.ids[i] <= id) {
                            ld.colors[i].forEach((_, j) =>
                                traced[i][j] = this.__lineColors.programTrace);
                        } else {
                            ld.colors[i].forEach((_, j) =>
                                traced[i][j] = ld.colors[i][j]);
                        }
                    }

                    // update line system
                    ld.lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
                        ld.meshName,
                        {
                            lines: ld.lines,
                            colors: traced,
                            instance: ld.lineSystem,
                            updatable: true
                        }
                    );
                }

                __renderToolPath(dynamics) {

                    const tpl = this.__toolPathLines;
                    // initialize - linesystem lines cannot be created or destroyed - only modified
                    if (tpl.lines.length === 0) {
                        tpl.lines = Array(tpl.MAX_LEN).fill(0).map((_, i) => [BABYLON.Vector3.Zero(), BABYLON.Vector3.Zero()]);
                    }
                    const currPoint = new BABYLON.Vector3(dynamics.position.x, dynamics.position.y, dynamics.position.z);

                    // at least two points - start rendering
                    if (tpl.prevPoint) {
                        // maintain ring buffer for fixed-size linesystem
                        if (tpl.idx === tpl.MAX_LEN) {
                            tpl.lines.shift();
                            tpl.lines.push([tpl.prevPoint, currPoint]);
                        } else {
                            tpl.lines[tpl.idx] = [tpl.prevPoint, currPoint];
                            tpl.idx++;
                        }
                        tpl.lineSystem = BABYLON.CreateLineSystem(tpl.meshName, { lines: tpl.lines, instance: tpl.lineSystem, updatable: true }, this.__scene);
                        tpl.lineSystem.color = this.__lineColors.toolingTrace;
                    }
                    tpl.prevPoint = currPoint;
                }

                async __loadToolingModel(config) {

                    // prevent concurrent calls
                    if (!this.__scene || this.__loadingTool) return;
                    this.__loadingTool = true;

                    this.__scene.getMeshByName("tool")?.dispose();

                    // load tooling model
                    let m;
                    if (config.showTooling) {
                        if (config.modelFilePath) {
                            const imported = await BABYLON.SceneLoader.ImportMeshAsync(null, config.modelFilePath);
                            m = imported.meshes[0];
                            m.name = m.id = "tool";
                        } else {
                            m = BABYLON.MeshBuilder.CreateCylinder("tool", { diameter: 0.1, height: 0.5 });
                        }

                        this.__translateMesh(m,
                            {
                                position: config.positionOffset,
                                rotation: config.rotationOffset,
                                scaling: config.scaling
                            }
                        );
                    }

                    this.__loadingTool = false;
                }

                __translateMesh(mesh, translation) {

                    if (!mesh || !translation) return;
                    const mult = (this.__toolingConfig.rotationUnit === "Degrees") ? Math.PI / 180 : 1;
                    mesh.position = new BABYLON.Vector3(translation.position.x, translation.position.y, translation.position.z);
                    mesh.rotation = new BABYLON.Vector3(translation.rotation.x * mult, translation.rotation.y * mult, translation.rotation.z * mult);
                    if (translation.scaling) {
                        mesh.scaling = new BABYLON.Vector3(translation.scaling.x, translation.scaling.y, translation.scaling.z);
                    }
                }

                __hmiColorToBablyonColor(hmiColor) {
                    if (hmiColor == null) return;
                    const [r, g, b, a] = hmiColor.color.match(/[\d\.]+/g).map(Number);
                    return new BABYLON.Color4((r / 255), (g / 255), (b / 255), a);
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

                // object property resolvers

                async __updateToolingConfig(config) {

                    if (config.modelFilePath !== this.__toolingConfig.modelFilePath) {
                        await this.__loadToolingModel(config);
                    }
                    if (config.trackToolPath !== this.__toolingConfig.trackToolPath) {
                        const ls = this.__scene?.getMeshByName(this.__toolPathLines.meshName);
                        if (ls) ls.visibility = config.trackToolPath;
                    }

                    // follow tool with camera
                    const camera = this.__scene.activeCamera;
                    if (config.cameraFollow) {
                        const mesh = this.__scene.getMeshByName("tool");
                        if (mesh) camera.lockedTarget = mesh;
                    } else {
                        camera.storeState();
                        camera.lockedTarget = null;
                        camera.restoreState();
                    }

                    this.__toolingConfig = config;

                }

                __updateToolingDynamics(dynamics) {

                    if (!this.__scene || this.__loadingTool)
                        return;

                    let mesh = this.__scene.getMeshByName("tool");
                    if (!mesh) return;

                    // translate position/rotation
                    this.__toolingDynamics = dynamics;
                    this.__translateMesh(
                        mesh,
                        {
                            position: {
                                x: this.__toolingConfig.positionOffset.x + dynamics.position.x,
                                y: this.__toolingConfig.positionOffset.y + dynamics.position.y,
                                z: this.__toolingConfig.positionOffset.z + dynamics.position.z
                            },
                            rotation: {
                                x: this.__toolingConfig.rotationOffset.x + dynamics.rotation.x,
                                y: this.__toolingConfig.rotationOffset.y + dynamics.rotation.y,
                                z: this.__toolingConfig.rotationOffset.z + dynamics.rotation.z
                            }
                        }
                    );

                    if (this.__toolingConfig.trackToolPath)
                        this.__renderToolPath(dynamics);
                }

                destroy() {
                    if (this.__keepAlive) {
                        return;
                    }
                    this.__scene?.dispose();
                    this.__engine?.dispose();
                    super.destroy();
                }

                /// public methods

                setPath(value) {
                    this.__pathString = value;
                    if (value.length)
                        this.__renderPath(value);
                }

                resetCamera() {
                    if (this.__progressLines.lineSystem) {
                        this.__focusMesh(this.__progressLines.lineSystem);
                    }
                }

                clearToolPath() {
                    if (!this.__scene) return;
                    this.__scene.getMeshByName(this.__toolPathLines.meshName)?.dispose();
                    this.__toolPathLines.lineSystem = null;
                    this.__toolPathLines.lines = [];
                    this.__toolPathLines.idx = 0;
                    this.__toolPathLines.prevPoint = null;
                }

                /// property accessors

                getSelectedSegment() {
                    return this.__selectedSegment;
                }

                setSelectedSegment(value) {
                    this.__selectedSegment = value;
                    if (this.__renderProgress) {
                        this.__updateProgress(value);
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
                    this.__cncConfig.ijkRelative = value.ijkRelative || false;
                    this.__cncConfig.maxArcRenderingPoints = value.maxArcRenderingPoints || 32;
                    if (value.workArea) {
                        this.__cncConfig.workArea = value.workArea;
                        this.__renderWorkArea(value.workArea);
                    }
                    if (value.workOffsets) {
                        this.__cncConfig.workOffsets = {
                            g54: value.workOffsets.g54 || { x: 0.0, y: 0.0, z: 0.0 },
                            g55: value.workOffsets.g55 || { x: 0.0, y: 0.0, z: 0.0 },
                            g56: value.workOffsets.g56 || { x: 0.0, y: 0.0, z: 0.0 },
                            g57: value.workOffsets.g57 || { x: 0.0, y: 0.0, z: 0.0 },
                            g58: value.workOffsets.g58 || { x: 0.0, y: 0.0, z: 0.0 },
                            g59: value.workOffsets.g59 || { x: 0.0, y: 0.0, z: 0.0 },
                        };
                    }
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
                    this.__resolveObjectProperty('toolingDynamics', value, this.__updateToolingDynamics);
                }

                getLockCamera() {
                    return this.__lockCamera;
                }

                setLockCamera(value) {
                    this.__lockCamera = value;
                    if (this.__lockCamera) {
                        this.__scene.activeCamera.detachControl();
                    } else {
                        this.__scene.activeCamera.attachControl();
                    }
                }

                getSceneBgColor() {
                    return this.__sceneBgColor;
                }

                setSceneBgColor(value) {
                    this.__sceneBgColor = value;
                    if (value) this.__scene.clearColor = this.__hmiColorToBablyonColor(this.__sceneBgColor);
                }

                getG00LineColor() {
                    return this.__g00LineColor;
                }

                setG00LineColor(value) {
                    this.__g00LineColor = value;
                    if (value) this.__lineColors.g00 = this.__hmiColorToBablyonColor(this.__g00LineColor);
                }

                getG01LineColor() {
                    return this.__g01LineColor;
                }

                setG01LineColor(value) {
                    this.__g01LineColor = value;
                    if (value) this.__lineColors.g01 = this.__hmiColorToBablyonColor(this.__g01LineColor);
                }

                getG02LineColor() {
                    return this.__g02LineColor;
                }

                setG02LineColor(value) {
                    this.__g02LineColor = value;
                    if (value) this.__lineColors.g02 = this.__hmiColorToBablyonColor(this.__g02LineColor);
                }

                getG03LineColor() {
                    return this.__g03LineColor;
                }

                setG03LineColor(value) {
                    this.__g03LineColor = value;
                    if (value) this.__lineColors.g03 = this.__hmiColorToBablyonColor(this.__g03LineColor);
                }

                getProgramTraceLineColor() {
                    return this.__programTraceLineColor;
                }

                setProgramTraceLineColor(value) {
                    this.__programTraceLineColor = value;
                    if (value) this.__lineColors.programTrace = this.__hmiColorToBablyonColor(this.__programTraceLineColor);
                }

                getToolingTraceLineColor() {
                    return this.__toolingTraceLineColor;
                }

                setToolingTraceLineColor(value) {
                    this.__toolingTraceLineColor = value;
                    if (value) this.__lineColors.toolingTrace = this.__hmiColorToBablyonColor(this.__toolingTraceLineColor);
                }
            }
            TcHmiCncControls.GCodePathRenderer = GCodePathRenderer;
        })(TcHmiCncControls = Controls.TcHmiCncControls || (Controls.TcHmiCncControls = {}));
    })(Controls = TcHmi.Controls || (TcHmi.Controls = {}));
})(TcHmi || (TcHmi = {}));

// Register Control
TcHmi.Controls.registerEx('GCodePathRenderer', 'TcHmi.Controls.TcHmiCncControls', TcHmi.Controls.TcHmiCncControls.GCodePathRenderer);
