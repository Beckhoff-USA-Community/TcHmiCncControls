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

                /*
                Attribute philosophy
                --------------------
                - Local variables are not set in the class definition, so they have the value 'undefined'.
                - During compilation, the Framework sets the value that is specified in the HTML or in the theme (possibly 'null') via normal setters.
                - Because of the "changed detection" in the setter, the value is only processed once during compilation.
                - Attention: If we have a Server Binding on an Attribute, the setter will be called once with null to initialize and later with the correct value.
                */

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

                    this.__pathString = "";
                    this.__selectedMeshId = 0;
                    this.__renderProgress = false;
                    this.__cncConfig = {
                        ijkRelative: true, maxArcRenderingPoints: 32
                    };
                    this.__toolingConfig = {
                        showTooling: true,
                        positionOffset: {
                            x: 0, y: 0, z: 0, a: 0, b: 0, c: 0
                        },
                        rotationUnit: "Degrees"
                    };
                    this.__toolingPos = {
                        x: 0, y: 0, z: 0, a: 0, b: 0, c: 0
                    };
                }

                /**
                 * Raised after the control was added to the control cache and the constructors of all base classes were called.
                 */
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
                /**
                 * Is called during control initialization after the attribute setters have been called. 
                 * @returns {void}
                 */
                __init() {
                    super.__init();
                    this.__initScene();
                }
                /**
                 * Is called by the system after the control instance is inserted into the active DOM.
                 * Is only allowed to be called from the framework itself!
                 */
                __attach() {
                    super.__attach();
                    /**
                     * Initialize everything which is only available while the control is part of the active dom.
                     */
                }
                /**
                 * Is called by the system when the control instance is no longer part of the active DOM.
                 * Is only allowed to be called from the framework itself!
                 */
                __detach() {
                    super.__detach();

                    /**
                     * Disable everything that is not needed while the control is not part of the active DOM.
                     * For example, there is usually no need to listen for events!
                     */
                }

                __handleResize() {
                    // resize scene if parent element size changes
                    this.__engine?.resize();
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

                        // init camera
                        const camera = new BABYLON.ArcRotateCamera(
                            "camera0", Math.PI / 2, Math.PI / 2, 7, BABYLON.Vector3.Zero(), scene);
                        camera.attachControl();

                        const _ = new BABYLON.Debug.AxesViewer(scene, 0.5)
                        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

                        // resize engine on window resize
                        window.addEventListener("resize", this.__handleResize);

                        // register render loop
                        engine.runRenderLoop(function () {
                            scene.render();
                        });

                        // give time for init, then resize
                        setTimeout(() => { engine.resize(); }, 1000);

                        // optimization
                        scene.skipPointerMovePicking = true;

                        // mesh onClick event
                        scene.onPointerObservable.add((pointerInfo) => {
                            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                                // ignore right-click
                                if (pointerInfo.event.inputIndex === 4) return;
                                if (pointerInfo.pickInfo.hit) {
                                    this.__onMeshPicked(pointerInfo.pickInfo);
                                }
                            }

                        });

                        // update scene reference
                        this.__scene = scene;
                    }
                }

                __initCamera(focusMesh) {

                    if (!this.__scene) return;

                    // get active camera
                    const camera = this.__scene.activeCamera;

                    // zoom to model
                    camera.useFramingBehavior = true;
                    camera.framingBehavior.radiusScale = 0.70;
                    camera.setTarget(focusMesh);

                    // scroll zoom config
                    camera.minZ = 0;
                    camera.wheelPrecision = 40;
                    camera.lowerRadiusLimit = null;
                    camera.useFramingBehavior = false;
                }

                // mesh clicked handler
                __onMeshPicked(pickInfo) {
                    const id = this.__lineData.faceIdMap.get(pickInfo.subMeshFaceId);
                    this.__selectedMeshId = id;
                    TcHmi.EventProvider.raise(`${this.getId()}.onPathSegmentPressed`);
                    TcHmi.EventProvider.raise(`${this.getId()}.onPropertyChanged`, {
                        propertyName: "SelectedMeshId",
                    });
                }

                __parseGCode(gcode) {
                    
                    // trace path
                    this.__initScene();
                    const interpreter = new GCodePathInterpreter(this.__cncConfig);
                    const paths = interpreter.Trace(gcode);

                    // generate line and color arrays
                    const lines = [];
                    const colors = [];
                    const ids = [];
                    const faceIdMap = new Map();
                    let faceId = 0;
                    paths.forEach((p, i) => {
                        const l = p.points.map((x, j) => {
                            if (j > 0) faceIdMap.set(faceId++, p.id);
                            return new BABYLON.Vector3(x.x, x.y, x.z)
                        });
                        const c = p.points.map(x =>
                            (p.code === 'g0' || p.code === 'g00') ?
                                new BABYLON.Color4(0, 0, 1, 1) :
                                new BABYLON.Color4(0, 1, 0, 1)
                        );

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

                    // store line data in control state
                    this.__lineData.lineSystem = ls;
                    this.__lineData.lines = lines;
                    this.__lineData.colors = colors;
                    this.__lineData.ids = ids;
                    this.__lineData.faceIdMap = faceIdMap;

                    // set view
                    this.__initCamera(ls);
                }

                // set mesh colors based on id
                __updateRendering(id) {

                    const ld = this.__lineData;
                    const blue = new BABYLON.Color4(0, 0, 1, 1);

                    if (!ld.colors) return;

                    // set colors
                    for (let i = 0; i < ld.colors.length; i++) {
                        if (ld.colors[i][0].equals(blue)) continue;
                        if (ld.ids[i] <= id) {
                            ld.colors[i].forEach((_, j) =>
                                ld.colors[i][j] = new BABYLON.Color4(1, 0, 0, 1));
                        } else {
                            ld.colors[i].forEach((_, j) =>
                                ld.colors[i][j] = new BABYLON.Color4(0, 1, 0, 1));
                        }
                    }

                    // update colors
                    ld.lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
                        "lineSystem",
                        {
                            lines: ld.lines,
                            colors: ld.colors,
                            instance: ld.lineSystem,
                            updatable: true
                        }
                    );
                }

                // update tooling
                __updateTooling(pos) {

                    if (!this.__scene)
                        return;

                    this.__toolingPos = pos;

                    let mesh = this.__scene.getMeshByName("tool");

                    if (!this.__toolingConfig.showTooling) {
                        // hide mesh
                        mesh?.dispose();
                        return;
                    } else {
                        mesh.visible = true;
                    }

                    if (!mesh) mesh = BABYLON.MeshBuilder.CreateCylinder("tool", { diameter: 0.1, height: 0.5 });

                    mesh.position.x = this.__toolingConfig.positionOffset.x + pos.x;
                    mesh.position.y = this.__toolingConfig.positionOffset.y + pos.y;
                    mesh.position.z = this.__toolingConfig.positionOffset.z + pos.z;

                    // abc rotation
                    if (this.__toolingConfig.rotationUnit === "Degrees") {
                        mesh.rotation.x = (this.__toolingConfig.positionOffset.a + pos.a) * Math.PI / 180;
                        mesh.rotation.y = (this.__toolingConfig.positionOffset.b + pos.b) * Math.PI / 180;
                        mesh.rotation.z = (this.__toolingConfig.positionOffset.c + pos.c) * Math.PI / 180;
                    } else {
                        mesh.rotation.x = this.__toolingConfig.positionOffset.a + pos.a;
                        mesh.rotation.y = this.__toolingConfig.positionOffset.b + pos.b;
                        mesh.rotation.z = this.__toolingConfig.positionOffset.c + pos.c;
                    }
                }

                __updateToolingConfig(config) {
                    this.__toolingConfig = config;
                    this.__updateTooling(this.__toolingPos);
                }

                __resolveObjectProperty(propertyName, value, processFn) {

                    // get state references
                    const parent = this;

                    // callback fn
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
                }

                /**
                 * Destroy the current control instance.
                 * Will be called automatically if the framework destroys the control instance!
                 */
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

                setPath(value) {
                    this.__pathString = value;
                    if (value.length)
                        this.__parseGCode(value);
                }

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

                getToolingPosition() {
                    return this.__toolingPos;
                }

                setToolingPosition(value) {
                    this.__resolveObjectProperty('toolingPosition', value, this.__updateTooling);
                }
            }
            TcHmiCncControls.GCodePathRenderer = GCodePathRenderer;
        })(TcHmiCncControls = Controls.TcHmiCncControls || (Controls.TcHmiCncControls = {}));
    })(Controls = TcHmi.Controls || (TcHmi.Controls = {}));
})(TcHmi || (TcHmi = {}));

/**
 * Register Control
 */
TcHmi.Controls.registerEx('GCodePathRenderer', 'TcHmi.Controls.TcHmiCncControls', TcHmi.Controls.TcHmiCncControls.GCodePathRenderer);
