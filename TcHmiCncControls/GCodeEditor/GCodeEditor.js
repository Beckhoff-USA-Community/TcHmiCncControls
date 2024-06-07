// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

/*
 * Generated 5/13/2024 11:10:21 AM
 * Copyright (C) 2024
 */
var TcHmi;
(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    let Controls;
    (function (/** @type {globalThis.TcHmi.Controls} */ Controls) {
        let TcHmiCncControls;
        (function (TcHmiCncControls) {
            class GCodeEditor extends TcHmi.Controls.System.TcHmiControl {

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

                    this.__editor = null;
                    this.__elementEditor = null;
                    this.__elementIframe = null;
                    this.__fileName = "";

                    this.__fontSize = 16;
                    this.__isReadOnly = false;
                    this.__selectedLine = 0;

                    var guid = tchmi_create_guid();
                    this.__eIframeOnLoad = 'load.' + guid;
                    this.__onThemeChange = null;
                }
                /**
                 * Raised after the control was added to the control cache and the constructors of all base classes were called.
                 */
                __previnit() {
                    // Fetch template root element
                    this.__elementTemplateRoot = this.__element.find('.TcHmi_Controls_TcHmiCncControls_GCodeEditor-Template');
                    if (this.__elementTemplateRoot.length === 0) {
                        throw new Error('Invalid Template.html');
                    }

                    this.__elementEditor = this.__elementTemplateRoot.find('.ace-editor');
                    this.__elementIframe = this.__elementTemplateRoot.find('.ace-editor-src');

                    // initialize editor
                    if (this.__elementEditor) {
                        this.__editor = ace.edit(this.__elementEditor.get(0));
                        this.__setTheme();
                        this.__editor.session.setMode("ace/mode/gcode");
                        this.__editor.setFontSize(this.__fontSize ?? 16);

                        // selected line changed event
                        const ctrl = this;
                        this.__editor.on("changeSelection", function () {
                            if (ctrl.__selectedLine !== ctrl.__editor.selection.getRange().start.row) {
                                ctrl.__selectedLine = ctrl.__editor.selection.getRange().start.row || 0;
                                TcHmi.EventProvider.raise(`${ctrl.getId()}.onPropertyChanged`, {
                                    propertyName: "SelectedLine",
                                });
                            }
                        });
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

                    // iframe load
                    this.__elementIframe.on(this.__eIframeOnLoad, this.__onIframeLoad());

                    // theme changed
                    const ctrl = this;
                    this.__onThemeChange = TcHmi.EventProvider.register(
                        "onThemeDataChanged",
                        function (evt, data) { ctrl.__setTheme(); }
                    );
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
                    this.__elementIframe.off(this.__eIframeOnLoad);
                    this.__onThemeChange();
                    this.__editor.off("changeSelection");
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
                    this.__editor.destroy();
                    this.__editor.container.remove();
                }

                __setTheme() {
                    if (!this.__editor)
                        return;

                    // set editor frame
                    if (TcHmi.Theme.get().toLowerCase().includes("dark"))
                        this.__editor.setTheme("ace/theme/monokai");
                    else
                        this.__editor.setTheme("ace/theme/clouds");
                }

                __onIframeLoad() {
                    const ctrl = this;
                    return function (e) {
                        if (!ctrl.__editor) return;
                        // load editor with iframe src content
                        const content = e.target.contentDocument.body.firstChild.innerHTML;
                        if (content) {
                            ctrl.__editor.setValue(content);
                            ctrl.__editor.gotoLine(1, 0, false);
                        }

                        TcHmi.EventProvider.raise(`${ctrl.getId()}.onFileLoaded`);
                    }
                }

                ///////////////         public methods      ///////////////////

                // load nc file into GCode editor
                loadFile(file, path) {
                    if (!file || !path) return;
                    this.__fileName = file;
                    
                    // set iframe src
                    const full = path + '/' + file;
                    this.__elementIframe.first().attr('src', full);
                }

                // save current editor content to file
                save() {
                    if (!this.__editor) return;

                    const path = (this.__fileName.length) ? this.__fileName : "New.nc";
                    const data = this.__editor.getValue();
                    const file = new File([data], path, { type: 'text/plain' });
                    const url = URL.createObjectURL(file);

                    // create link and trigger click
                    $(`<a target="_blank" download="${path}" href="${url}">Download</a>`)
                        .get(0)
                        .click();
                }

                gotoLine(lineNumber) {
                    if (!this.__editor) return;
                    this.__editor.gotoLine(lineNumber, 0, false);
                    this.__editor.selection.selectLine();
                }

                ///////////////         property accesors      ///////////////////

                getFontSize() {
                    return this.__fontSize;
                }

                setFontSize(value) {
                    this.__fontSize = value;
                    this.__editor?.setFontSize(value);
                }

                getIsReadOnly() {
                    return this.__isReadOnly;
                }

                setIsReadOnly(value) {
                    this.__isReadOnly = value;
                    this.__editor?.setReadOnly(value);
                }

                getContent() {
                    return this.__editor?.getValue() || "";
                }

                setContent(value) {
                    this.__editor?.setValue(value);
                }

                getSelectedLine() {
                    return this.__selectedLine + 1;
                }

                setSelectedLine(value) {
                    this.__selectedLine = value;
                    this.gotoLine(this.__selectedLine);
                }
            }
            TcHmiCncControls.GCodeEditor = GCodeEditor;
        })(TcHmiCncControls = Controls.TcHmiCncControls || (Controls.TcHmiCncControls = {}));
    })(Controls = TcHmi.Controls || (TcHmi.Controls = {}));
})(TcHmi || (TcHmi = {}));

/**
 * Register Control
 */
TcHmi.Controls.registerEx('GCodeEditor', 'TcHmi.Controls.TcHmiCncControls', TcHmi.Controls.TcHmiCncControls.GCodeEditor);
