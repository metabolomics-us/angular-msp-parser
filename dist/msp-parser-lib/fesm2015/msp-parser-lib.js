import { ɵɵinject, ɵɵdefineInjectable, ɵsetClassMetadata, Injectable, Inject, ɵɵdefineNgModule, ɵɵdefineInjector, ɵɵsetNgModuleScope, NgModule } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NGXLogger, LoggerModule, NgxLoggerLevel } from 'ngx-logger';

class MspParserLibService {
    constructor(http, logger) {
        this.http = http;
        this.logger = logger;
        /**
         * parses the name field content and modifies the spectra object accordingly
         */
        this.handleName = (value, spectra) => {
            // check if we have a Retention Index in the name field
            const nameMatch = /(.+)_RI(.*)/.exec(value);
            const nameCombinedWithInstruments = /\s*([:\w\d\s-]+);/.exec(value);
            if (nameMatch) {
                // sets the new name
                spectra.names.push(this.trim(nameMatch[1]));
                // adds it as retention index
                spectra.meta.push({ name: 'Retention Index', value: this.trim(nameMatch[2]), category: this.findCategory('Retention Index') });
            }
            else {
                spectra.names.push(this.trim(value));
            }
            return spectra;
        };
        /**
         * handles a given metadata field and might does additional modifications
         */
        this.handleMetaDataField = (value, spectra, regex, category) => {
            if (!category) {
                category = 'none';
            }
            const extractValue = regex;
            let match = extractValue.exec(value);
            while (match != null) {
                const name = this.trim(match[1]);
                const parsedValue = this.trim(match[2]);
                if (this.ignoreField(name, parsedValue) === false) {
                    spectra.meta.push({ name, value: parsedValue, category });
                }
                match = extractValue.exec(value);
            }
            return spectra;
        };
        /**
         * simple trimming function
         */
        this.trim = (str) => {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/^"(.*)"$/, '$1');
        };
        /**
         * inspects our metadata fields and does additional modifications, as required
         */
        this.inspectFields = (match, spectra) => {
            const regexInchIKey = /.*([A-Z]{14}-[A-Z]{10}-[A-Z,0-9])+.*/;
            // var regexSmiles = /^([^J][0-9BCOHNSOPrIFla@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
            const regexSmiles = /^([^J][0-9A-Za-z@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
            // if we contain an inchi key in any propterty of this field
            if (regexInchIKey.exec(match[2])) {
                spectra.inchiKey = regexInchIKey.exec(match[2])[1];
            }
            // get an inchi
            else if (match[1].toLowerCase() === 'inchi' || match[1].toLowerCase() === 'inchicode' || match[1].toLowerCase() === 'inchi code') {
                spectra.inchi = this.trim(match[2]);
            }
            // get an inchi from a smile
            else if (match[1].toLowerCase() === 'smiles' && regexSmiles.exec(match[2])) {
                spectra.smiles = regexSmiles.exec(match[2])[1];
            }
            // comment fields have quite often additional information in them
            else if (match[1].toLowerCase() === 'comment') {
                spectra = this.handleMetaDataField(match[2], spectra, /(\w+)\s*=\s*([0-9]*\.?[0-9]+)/g, undefined);
            }
            // can contain a lot of different id's in case of massbank generated msp files
            else if (match[1].toLowerCase() === 'searchid') {
                spectra = this.handleMetaDataField(match[2], spectra, /(\w+\s?\w*)+:\s*([\w\d]+[ \w\d-]+)/g, 'Database Identifier');
            }
            // this mass bank special flag provides some derivatization information
            else if (match[1].toLowerCase() === 'ms$focused_ion') {
                spectra = this.handleMetaDataField(match[2], spectra, /\s*(.+):(.+)/g, 'Derivatization');
            }
            // any other metadata field
            else {
                const name = match[1];
                const value = match[2];
                if (this.ignoreField(name, value) === false) {
                    // assign metadata
                    spectra.meta.push({
                        name,
                        value,
                        category: this.findCategory(name)
                    });
                }
            }
            return spectra;
        };
        /**
         * finds the related category for the given name, Will be an additional module at a later point TODO
         */
        this.findCategory = (name) => {
            let category = 'none';
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
        this.ignoreField = (name, value) => {
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
        this.convertWithCallback = (data, callback) => {
            this.logger.debug('starting with parsing new data set...');
            /**
             * checks for a complete block of msp data.
             */
            const blockRegEx = /((?:.*:\s*[^\n]*\n?)+)\n((?:\s*[0-9]*\.?[0-9]+\s+[0-9]*\.?[0-9]+[;\n]?.*\n?)+)/g;
            /**
             * extracts the attribures like 'name' and 'value' from a found line
             */
            const regExAttributes = /\s*([a-zA-Z _$\/]+):(.+)\s/g;
            /**
             * first block captures meta data
             * second block caputures spectra including floats
             * optional third block are identifications of this ion
             */
            const regExSpectra = /([0-9]+\.?[0-9]*)[ \t]+([0-9]*\.?[0-9]+)(?:\s*(?:[;\n])|(?:"?(.+)"?\n?))?/g;
            // regExSpectra = /([0-9]*\.?[0-9]+)[ \t]+([0-9]*\.?[0-9]+)(?:\s*(.*)\n?)?/g;
            // regExSpectra = /([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)(?:\s*"?(.*)"?\n)?;?/g;
            /**
             * is this an accurate mass
             */
            const regExAccurateMass = /([0-9]*\.?[0-9]{3,})/;
            const buf = data.toString('utf8');
            let blocks = blockRegEx.exec(buf);
            // return code
            let foundBlocks = false;
            // go over all available blocks
            while (blocks != null) {
                // contains the resulting spectra object
                let spectra = { meta: [], names: [], spectrum: '', accurate: false };
                // parse the first block and assign
                const current = blocks[0];
                let match = regExAttributes.exec(current);
                // builds our metadata object
                while (match != null) {
                    match[1] = this.trim(match[1]);
                    match[2] = this.trim(match[2]);
                    if (match[1].toLowerCase() === 'name' || match[1].toLowerCase() === 'synon') {
                        // in case there are RI encoded we extract this information
                        spectra = this.handleName(match[2], spectra);
                    }
                    else {
                        spectra = this.inspectFields(match, spectra);
                    }
                    match = regExAttributes.exec(current);
                }
                // keep only unique names
                spectra.names = spectra.names.reduce((p, c) => {
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
                            name: this.trim(match[3]).replace(/(^"|"$)/g, ''),
                            value: match[1],
                            category: 'annotation'
                        });
                    }
                    // get the next match
                    match = regExSpectra.exec(blocks[2]);
                }
                // assign the trimmed spectra
                spectra.spectrum = this.trim(spectra.spectrum);
                // make sure we have at least a spectrum and a name
                if (spectra.spectrum != null && spectra.names.length > 0) {
                    // invoke the callback function
                    callback(spectra);
                }
                else {
                    callback('THIS IS A TEST');
                    this.logger.warn('invalid spectra found -> ignored');
                }
                // fetch the next matching block
                blocks = blockRegEx.exec(buf);
            }
            return foundBlocks;
        };
        /**
         * converts the data using a callback
         */
        this.convertFromData = (data, callback) => {
            return this.convertWithCallback(data, callback);
        };
        /**
         * counts the number of mass spectra in this library file
         */
        this.countSpectra = (data) => {
            let count = 0;
            let pos = 0;
            while (pos !== -1) {
                count++;
                pos = data.indexOf('Num Peaks', pos + 1);
            }
            return count;
        };
    }
}
MspParserLibService.ɵfac = function MspParserLibService_Factory(t) { return new (t || MspParserLibService)(ɵɵinject(HttpClient), ɵɵinject(NGXLogger)); };
MspParserLibService.ɵprov = ɵɵdefineInjectable({ token: MspParserLibService, factory: MspParserLibService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { ɵsetClassMetadata(MspParserLibService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: HttpClient, decorators: [{
                type: Inject,
                args: [HttpClient]
            }] }, { type: NGXLogger, decorators: [{
                type: Inject,
                args: [NGXLogger]
            }] }]; }, null); })();

class MspParserLibModule {
}
MspParserLibModule.ɵmod = ɵɵdefineNgModule({ type: MspParserLibModule });
MspParserLibModule.ɵinj = ɵɵdefineInjector({ factory: function MspParserLibModule_Factory(t) { return new (t || MspParserLibModule)(); }, providers: [
        MspParserLibService
    ], imports: [[
            LoggerModule.forRoot({
                level: NgxLoggerLevel.DEBUG,
                serverLogLevel: NgxLoggerLevel.OFF
            }),
            HttpClientModule
        ]] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && ɵɵsetNgModuleScope(MspParserLibModule, { imports: [LoggerModule, HttpClientModule] }); })();
/*@__PURE__*/ (function () { ɵsetClassMetadata(MspParserLibModule, [{
        type: NgModule,
        args: [{
                imports: [
                    LoggerModule.forRoot({
                        level: NgxLoggerLevel.DEBUG,
                        serverLogLevel: NgxLoggerLevel.OFF
                    }),
                    HttpClientModule
                ],
                providers: [
                    MspParserLibService
                ]
            }]
    }], null, null); })();

/*
 * Public API Surface of msp-parser-lib
 */

/**
 * Generated bundle index. Do not edit.
 */

export { MspParserLibModule, MspParserLibService };
//# sourceMappingURL=msp-parser-lib.js.map
