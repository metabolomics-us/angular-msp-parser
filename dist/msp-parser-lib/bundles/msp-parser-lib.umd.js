(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/common/http'), require('ngx-logger')) :
    typeof define === 'function' && define.amd ? define('msp-parser-lib', ['exports', '@angular/core', '@angular/common/http', 'ngx-logger'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['msp-parser-lib'] = {}, global.ng.core, global.ng.common.http, global.i2));
}(this, (function (exports, i0, i1, i2) { 'use strict';

    var MspParserLibService = /** @class */ (function () {
        function MspParserLibService(http, logger) {
            var _this = this;
            this.http = http;
            this.logger = logger;
            /**
             * parses the name field content and modifies the spectra object accordingly
             */
            this.handleName = function (value, spectra) {
                // check if we have a Retention Index in the name field
                var nameMatch = /(.+)_RI(.*)/.exec(value);
                var nameCombinedWithInstruments = /\s*([:\w\d\s-]+);/.exec(value);
                if (nameMatch) {
                    // sets the new name
                    spectra.names.push(_this.trim(nameMatch[1]));
                    // adds it as retention index
                    spectra.meta.push({ name: 'Retention Index', value: _this.trim(nameMatch[2]), category: _this.findCategory('Retention Index') });
                }
                else {
                    spectra.names.push(_this.trim(value));
                }
                return spectra;
            };
            /**
             * handles a given metadata field and might does additional modifications
             */
            this.handleMetaDataField = function (value, spectra, regex, category) {
                if (!category) {
                    category = 'none';
                }
                var extractValue = regex;
                var match = extractValue.exec(value);
                while (match != null) {
                    var name = _this.trim(match[1]);
                    var parsedValue = _this.trim(match[2]);
                    if (_this.ignoreField(name, parsedValue) === false) {
                        spectra.meta.push({ name: name, value: parsedValue, category: category });
                    }
                    match = extractValue.exec(value);
                }
                return spectra;
            };
            /**
             * simple trimming function
             */
            this.trim = function (str) {
                return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/^"(.*)"$/, '$1');
            };
            /**
             * inspects our metadata fields and does additional modifications, as required
             */
            this.inspectFields = function (match, spectra) {
                var regexInchIKey = /.*([A-Z]{14}-[A-Z]{10}-[A-Z,0-9])+.*/;
                // var regexSmiles = /^([^J][0-9BCOHNSOPrIFla@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
                var regexSmiles = /^([^J][0-9A-Za-z@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
                // if we contain an inchi key in any propterty of this field
                if (regexInchIKey.exec(match[2])) {
                    spectra.inchiKey = regexInchIKey.exec(match[2])[1];
                }
                // get an inchi
                else if (match[1].toLowerCase() === 'inchi' || match[1].toLowerCase() === 'inchicode' || match[1].toLowerCase() === 'inchi code') {
                    spectra.inchi = _this.trim(match[2]);
                }
                // get an inchi from a smile
                else if (match[1].toLowerCase() === 'smiles' && regexSmiles.exec(match[2])) {
                    spectra.smiles = regexSmiles.exec(match[2])[1];
                }
                // comment fields have quite often additional information in them
                else if (match[1].toLowerCase() === 'comment') {
                    spectra = _this.handleMetaDataField(match[2], spectra, /(\w+)\s*=\s*([0-9]*\.?[0-9]+)/g, undefined);
                }
                // can contain a lot of different id's in case of massbank generated msp files
                else if (match[1].toLowerCase() === 'searchid') {
                    spectra = _this.handleMetaDataField(match[2], spectra, /(\w+\s?\w*)+:\s*([\w\d]+[ \w\d-]+)/g, 'Database Identifier');
                }
                // this mass bank special flag provides some derivatization information
                else if (match[1].toLowerCase() === 'ms$focused_ion') {
                    spectra = _this.handleMetaDataField(match[2], spectra, /\s*(.+):(.+)/g, 'Derivatization');
                }
                // any other metadata field
                else {
                    var name = match[1];
                    var value = match[2];
                    if (_this.ignoreField(name, value) === false) {
                        // assign metadata
                        spectra.meta.push({
                            name: name,
                            value: value,
                            category: _this.findCategory(name)
                        });
                    }
                }
                return spectra;
            };
            /**
             * finds the related category for the given name, Will be an additional module at a later point TODO
             */
            this.findCategory = function (name) {
                var category = 'none';
                name = name.toLocaleLowerCase();
                // mass spectral properties
                if (name === '') { }
                else if (name === 'num peaks' || name === 'retentionindex' || name === 'retentiontime') {
                    category = 'spectral properties';
                }
                // acquisition properties
                else if (name === 'instrument' || name === 'instrumenttype' || name === 'ionmode' || name === 'precursormz') {
                    category = 'acquisition properties';
                }
                return category;
            };
            /**
             * ignores a given field, if a certain value is not as exspected. Will be an additional module at a later point TODO
             */
            this.ignoreField = function (name, value) {
                if (value.length === 0) {
                    return true;
                }
                name = name.toLowerCase();
                if (name === 'num peaks' || name === 'numpeaks') {
                    return true;
                }
                else {
                    return false;
                }
            };
            /**
             * converts the data using a callback
             */
            this.convertWithCallback = function (data, callback) {
                _this.logger.debug('starting with parsing new data set...');
                /**
                 * checks for a complete block of msp data.
                 */
                var blockRegEx = /((?:.*:\s*[^\n]*\n?)+)\n((?:\s*[0-9]*\.?[0-9]+\s+[0-9]*\.?[0-9]+[;\n]?.*\n?)*)/g;
                /**
                 * extracts the attribures like 'name' and 'value' from a found line
                 */
                var regExAttributes = /\s*([a-zA-Z _$\/]+):(.+)\s/g;
                /**
                 * first block captures meta data
                 * second block caputures spectra including floats
                 * optional third block are identifications of this ion
                 */
                var regExSpectra = /([0-9]+\.?[0-9]*)[ \t]+([0-9]*\.?[0-9]+)(?:\s*(?:[;\n])|(?:"?(.+)"?\n?))?/g;
                // regExSpectra = /([0-9]*\.?[0-9]+)[ \t]+([0-9]*\.?[0-9]+)(?:\s*(.*)\n?)?/g;
                // regExSpectra = /([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)(?:\s*"?(.*)"?\n)?;?/g;
                /**
                 * is this an accurate mass
                 */
                var regExAccurateMass = /([0-9]*\.?[0-9]{3,})/;
                var buf = data.toString('utf8');
                var blocks = blockRegEx.exec(buf);
                // return code
                var foundBlocks = false;
                // go over all available blocks
                while (blocks != null) {
                    // contains the resulting spectra object
                    var spectra = { meta: [], names: [], spectrum: '', accurate: false };
                    // parse the first block and assign
                    var current = blocks[0];
                    var match = regExAttributes.exec(current);
                    // builds our metadata object
                    while (match != null) {
                        match[1] = _this.trim(match[1]);
                        match[2] = _this.trim(match[2]);
                        if (match[1].toLowerCase() === 'name' || match[1].toLowerCase() === 'synon') {
                            // in case there are RI encoded we extract this information
                            spectra = _this.handleName(match[2], spectra);
                        }
                        else {
                            spectra = _this.inspectFields(match, spectra);
                        }
                        match = regExAttributes.exec(current);
                    }
                    // keep only unique names
                    spectra.names = spectra.names.reduce(function (p, c) {
                        if (p.indexOf(c) < 0) {
                            p.push(c);
                        }
                        return p;
                    }, []);
                    // builds the actual spectra
                    match = regExSpectra.exec(blocks[2]);
                    spectra.spectrum = '';
                    spectra.accurate = true;
                    while (match != null) {
                        foundBlocks = true;
                        spectra.spectrum = spectra.spectrum + ' ' + match[1] + ':' + match[2];
                        // used to determine if this is an accurate mass spectra or not
                        if (!regExAccurateMass.test(match[1])) {
                            spectra.accurate = false;
                        }
                        if (match[3]) {
                            spectra.meta.push({
                                name: _this.trim(match[3]).replace(/(^"|"$)/g, ''),
                                value: match[1],
                                category: 'annotation'
                            });
                        }
                        // get the next match
                        match = regExSpectra.exec(blocks[2]);
                    }
                    // assign the trimmed spectra
                    spectra.spectrum = _this.trim(spectra.spectrum);
                    // make sure we have at least a spectrum and a name
                    if (spectra.spectrum != null && spectra.names.length > 0) {
                        // invoke the callback function
                        callback(spectra);
                    }
                    else {
                        callback('THIS IS A TEST');
                        _this.logger.warn('invalid spectra found -> ignored');
                    }
                    // fetch the next matching block
                    blocks = blockRegEx.exec(buf);
                }
                return foundBlocks;
            };
            /**
             * converts the data using a callback
             */
            this.convertFromData = function (data, callback) {
                return _this.convertWithCallback(data, callback);
            };
            /**
             * counts the number of mass spectra in this library file
             */
            this.countSpectra = function (data) {
                var count = 0;
                var pos = 0;
                while (pos !== -1) {
                    count++;
                    pos = data.indexOf('Num Peaks', pos + 1);
                }
                return count;
            };
        }
        return MspParserLibService;
    }());
    MspParserLibService.ɵfac = function MspParserLibService_Factory(t) { return new (t || MspParserLibService)(i0.ɵɵinject(i1.HttpClient), i0.ɵɵinject(i2.NGXLogger)); };
    MspParserLibService.ɵprov = i0.ɵɵdefineInjectable({ token: MspParserLibService, factory: MspParserLibService.ɵfac, providedIn: 'root' });
    /*@__PURE__*/ (function () {
        i0.ɵsetClassMetadata(MspParserLibService, [{
                type: i0.Injectable,
                args: [{
                        providedIn: 'root'
                    }]
            }], function () {
            return [{ type: i1.HttpClient, decorators: [{
                            type: i0.Inject,
                            args: [i1.HttpClient]
                        }] }, { type: i2.NGXLogger, decorators: [{
                            type: i0.Inject,
                            args: [i2.NGXLogger]
                        }] }];
        }, null);
    })();

    var MspParserLibModule = /** @class */ (function () {
        function MspParserLibModule() {
        }
        return MspParserLibModule;
    }());
    MspParserLibModule.ɵmod = i0.ɵɵdefineNgModule({ type: MspParserLibModule });
    MspParserLibModule.ɵinj = i0.ɵɵdefineInjector({ factory: function MspParserLibModule_Factory(t) { return new (t || MspParserLibModule)(); }, providers: [
            MspParserLibService
        ], imports: [[
                i2.LoggerModule.forRoot({
                    level: i2.NgxLoggerLevel.DEBUG,
                    serverLogLevel: i2.NgxLoggerLevel.OFF
                }),
                i1.HttpClientModule
            ]] });
    (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(MspParserLibModule, { imports: [i2.LoggerModule, i1.HttpClientModule] }); })();
    /*@__PURE__*/ (function () {
        i0.ɵsetClassMetadata(MspParserLibModule, [{
                type: i0.NgModule,
                args: [{
                        imports: [
                            i2.LoggerModule.forRoot({
                                level: i2.NgxLoggerLevel.DEBUG,
                                serverLogLevel: i2.NgxLoggerLevel.OFF
                            }),
                            i1.HttpClientModule
                        ],
                        providers: [
                            MspParserLibService
                        ]
                    }]
            }], null, null);
    })();

    /*
     * Public API Surface of msp-parser-lib
     */

    /**
     * Generated bundle index. Do not edit.
     */

    exports.MspParserLibModule = MspParserLibModule;
    exports.MspParserLibService = MspParserLibService;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=msp-parser-lib.umd.js.map
