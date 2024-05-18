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

                    this.__pathString = "";
                    this.__relativeMode = false;

                    // constants
                    this.__VIEWS = [
                        { name: "camera0", alpha: 1.2, beta: 1.2, radius: 75, target: new BABYLON.Vector3(0, 0, 0) },
                        { name: "camera1", alpha: 2, beta: 1.2, radius: 7, target: new BABYLON.Vector3(0, 0, 0) },
                        { name: "camera2", alpha: -1.2, beta: 1.2, radius: 7, target: new BABYLON.Vector3(0, 0, 0) },
                        { name: "camera3", alpha: -2, beta: 1.2, radius: 7, target: new BABYLON.Vector3(0, 0, 0) }
                    ];
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

                    // init babylon scene
                    if (this.__engine) {

                        // generate scene
                        const engine = this.__engine;
                        const scene = this.__createScene();

                        // register render loop
                        engine.runRenderLoop(function () {
                            scene.render();
                        });

                        // resize engine on window resize
                        window.addEventListener("resize", function () {
                            engine.resize();
                        });

                        // give time for init, then resize
                        setTimeout(() => { engine.resize(); }, 500);

                        scene.onPointerObservable.add((pointerInfo) => {
                            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                                if (pointerInfo.pickInfo.hit) {
                                    this.__pointerDown(pointerInfo.pickInfo.pickedMesh)
                                }
                            }
                        });
                    }
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

                __pointerDown(mesh) {
                    console.log(mesh);
                }

                __createScene() {
                    // create scene
                    const scene = new BABYLON.Scene(this.__engine);
                    
                    // init camera from view array
                    const camera = new BABYLON.ArcRotateCamera(
                        this.__VIEWS[0].name,
                        this.__VIEWS[0].alpha,
                        this.__VIEWS[0].beta,
                        this.__VIEWS[0].radius,
                        this.__VIEWS[0].target,
                        scene
                    );

                    // attach mouse controls to camera
                    camera.attachControl();
                    let prevRadius = camera.radius;

                    // This targets the camera to scene origin
                    camera.setTarget(BABYLON.Vector3.Zero());

                    camera.wheelPrecision = 10;
                    scene.beforeRender = () => {
                        let ratio = 10;
                        if (prevRadius != camera.radius) {
                            ratio = prevRadius / camera.radius;
                            prevRadius = camera.radius;

                            camera.panningSensibility *= ratio;
                            camera.wheelPrecision *= ratio;
                        }
                    };

                    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
                    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

                    // Default intensity is 1. Let's dim the light a small amount
                    light.intensity = 0.7;

                    const axes = new BABYLON.Debug.AxesViewer(scene, 20)

                    return scene;
                }

                __parseGCode(gcode) {
                    
                    const interpreter = new GCodePathInterpreter();
                    interpreter.trace(gcode, this.__engine.scene);
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
                    /**
                     * Free resources like child controls etc.
                     */
                }

                setPath(path) {
                    this.__pathString = path;
                    if (path.length)
                        this.__parseGCode(path);
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
