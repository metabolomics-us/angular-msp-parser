import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common/http";
import * as i2 from "ngx-logger";
export class MspParserLibService {
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
                    this.logger.warn('invalid spectra found -> ignored');
                    callback(undefined);
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
MspParserLibService.ɵfac = function MspParserLibService_Factory(t) { return new (t || MspParserLibService)(i0.ɵɵinject(HttpClient), i0.ɵɵinject(NGXLogger)); };
MspParserLibService.ɵprov = i0.ɵɵdefineInjectable({ token: MspParserLibService, factory: MspParserLibService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(MspParserLibService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.HttpClient, decorators: [{
                type: Inject,
                args: [HttpClient]
            }] }, { type: i2.NGXLogger, decorators: [{
                type: Inject,
                args: [NGXLogger]
            }] }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXNwLXBhcnNlci1saWIuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIvaG9tZS9ub2xhbi9EZXZlbG9wbWVudC9tb25hLXNlcnZpY2VzL2FuZ3VsYXItbXNwLXBhcnNlci9wcm9qZWN0cy9tc3AtcGFyc2VyLWxpYi9zcmMvIiwic291cmNlcyI6WyJsaWIvbXNwLXBhcnNlci1saWIuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNuRCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDaEQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFlBQVksQ0FBQzs7OztBQUtyQyxNQUFNLE9BQU8sbUJBQW1CO0lBQzlCLFlBQXdDLElBQWdCLEVBQTZCLE1BQWlCO1FBQTlELFNBQUksR0FBSixJQUFJLENBQVk7UUFBNkIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUV0Rzs7V0FFRztRQUNILGVBQVUsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUM5Qix1REFBdUQ7WUFDdkQsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxNQUFNLDJCQUEyQixHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVwRSxJQUFJLFNBQVMsRUFBRTtnQkFDYixvQkFBb0I7Z0JBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFNUMsNkJBQTZCO2dCQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDZixFQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENB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QUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDbkMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQTtRQUVEOztXQUVHO1FBQ0gsaUJBQVksR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3RCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNkLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztZQUVaLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUNqQixLQUFLLEVBQUUsQ0FBQztnQkFDUixHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQzFDO1lBRUQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLENBQUE7SUEvUnlHLENBQUM7O3NGQURoRyxtQkFBbUIsY0FDVixVQUFVLGVBQW9DLFNBQVM7MkRBRGhFLG1CQUFtQixXQUFuQixtQkFBbUIsbUJBRmxCLE1BQU07a0RBRVAsbUJBQW1CO2NBSC9CLFVBQVU7ZUFBQztnQkFDVixVQUFVLEVBQUUsTUFBTTthQUNuQjs7c0JBRWMsTUFBTTt1QkFBQyxVQUFVOztzQkFBNkIsTUFBTTt1QkFBQyxTQUFTIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW5qZWN0YWJsZSwgSW5qZWN0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0h0dHBDbGllbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi9odHRwJztcbmltcG9ydCB7TkdYTG9nZ2VyfSBmcm9tICduZ3gtbG9nZ2VyJztcblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgY2xhc3MgTXNwUGFyc2VyTGliU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKEBJbmplY3QoSHR0cENsaWVudCkgcHJpdmF0ZSBodHRwOiBIdHRwQ2xpZW50LCBASW5qZWN0KE5HWExvZ2dlcikgcHJpdmF0ZSBsb2dnZXI6IE5HWExvZ2dlcikgeyB9XG5cbiAgLyoqXG4gICAqIHBhcnNlcyB0aGUgbmFtZSBmaWVsZCBjb250ZW50IGFuZCBtb2RpZmllcyB0aGUgc3BlY3RyYSBvYmplY3QgYWNjb3JkaW5nbHlcbiAgICovXG4gIGhhbmRsZU5hbWUgPSAodmFsdWUsIHNwZWN0cmEpID0+IHtcbiAgICAvLyBjaGVjayBpZiB3ZSBoYXZlIGEgUmV0ZW50aW9uIEluZGV4IGluIHRoZSBuYW1lIGZpZWxkXG4gICAgY29uc3QgbmFtZU1hdGNoID0gLyguKylfUkkoLiopLy5leGVjKHZhbHVlKTtcbiAgICBjb25zdCBuYW1lQ29tYmluZWRXaXRoSW5zdHJ1bWVudHMgPSAvXFxzKihbOlxcd1xcZFxccy1dKyk7Ly5leGVjKHZhbHVlKTtcblxuICAgIGlmIChuYW1lTWF0Y2gpIHtcbiAgICAgIC8vIHNldHMgdGhlIG5ldyBuYW1lXG4gICAgICBzcGVjdHJhLm5hbWVzLnB1c2godGhpcy50cmltKG5hbWVNYXRjaFsxXSkpO1xuXG4gICAgICAvLyBhZGRzIGl0IGFzIHJldGVudGlvbiBpbmRleFxuICAgICAgc3BlY3RyYS5tZXRhLnB1c2goXG4gICAgICAgIHtuYW1lOiAnUmV0ZW50aW9uIEluZGV4JywgdmFsdWU6IHRoaXMudHJpbShuYW1lTWF0Y2hbMl0pLCBjYXRlZ29yeTogdGhpcy5maW5kQ2F0ZWdvcnkoJ1JldGVudGlvbiBJbmRleCcpfVxuICAgICAgKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzcGVjdHJhLm5hbWVzLnB1c2godGhpcy50cmltKHZhbHVlKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwZWN0cmE7XG4gIH1cblxuICAvKipcbiAgICogaGFuZGxlcyBhIGdpdmVuIG1ldGFkYXRhIGZpZWxkIGFuZCBtaWdodCBkb2VzIGFkZGl0aW9uYWwgbW9kaWZpY2F0aW9uc1xuICAgKi9cbiAgaGFuZGxlTWV0YURhdGFGaWVsZCA9ICh2YWx1ZSwgc3BlY3RyYSwgcmVnZXgsIGNhdGVnb3J5KSA9PiB7XG4gICAgaWYgKCFjYXRlZ29yeSkge1xuICAgICAgY2F0ZWdvcnkgPSAnbm9uZSc7XG4gICAgfVxuXG4gICAgY29uc3QgZXh0cmFjdFZhbHVlID0gcmVnZXg7XG4gICAgbGV0IG1hdGNoID0gZXh0cmFjdFZhbHVlLmV4ZWModmFsdWUpO1xuXG4gICAgd2hpbGUgKG1hdGNoICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLnRyaW0obWF0Y2hbMV0pO1xuICAgICAgY29uc3QgcGFyc2VkVmFsdWUgPSB0aGlzLnRyaW0obWF0Y2hbMl0pO1xuXG4gICAgICBpZiAodGhpcy5pZ25vcmVGaWVsZChuYW1lLCBwYXJzZWRWYWx1ZSkgPT09IGZhbHNlKSB7XG4gICAgICAgIHNwZWN0cmEubWV0YS5wdXNoKHtuYW1lLCB2YWx1ZTogcGFyc2VkVmFsdWUsIGNhdGVnb3J5fSk7XG4gICAgICB9XG4gICAgICBtYXRjaCA9IGV4dHJhY3RWYWx1ZS5leGVjKHZhbHVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3BlY3RyYTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzaW1wbGUgdHJpbW1pbmcgZnVuY3Rpb25cbiAgICovXG4gIHRyaW0gPSAoc3RyKSA9PiB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzXFxzKi8sICcnKS5yZXBsYWNlKC9cXHNcXHMqJC8sICcnKS5yZXBsYWNlKC9eXCIoLiopXCIkLywgJyQxJyk7XG4gIH1cblxuICAvKipcbiAgICogaW5zcGVjdHMgb3VyIG1ldGFkYXRhIGZpZWxkcyBhbmQgZG9lcyBhZGRpdGlvbmFsIG1vZGlmaWNhdGlvbnMsIGFzIHJlcXVpcmVkXG4gICAqL1xuICBpbnNwZWN0RmllbGRzID0gKG1hdGNoLCBzcGVjdHJhKSA9PiB7XG4gICAgY29uc3QgcmVnZXhJbmNoSUtleSA9IC8uKihbQS1aXXsxNH0tW0EtWl17MTB9LVtBLVosMC05XSkrLiovO1xuICAgIC8vIHZhciByZWdleFNtaWxlcyA9IC9eKFteSl1bMC05QkNPSE5TT1BySUZsYUArXFwtXFxbXFxdXFwoXFwpXFxcXFxcLyU9IyQsLn4mIV17Nix9KSQvO1xuICAgIGNvbnN0IHJlZ2V4U21pbGVzID0gL14oW15KXVswLTlBLVphLXpAK1xcLVxcW1xcXVxcKFxcKVxcXFxcXC8lPSMkLC5+JiFdezYsfSkkLztcblxuICAgIC8vIGlmIHdlIGNvbnRhaW4gYW4gaW5jaGkga2V5IGluIGFueSBwcm9wdGVydHkgb2YgdGhpcyBmaWVsZFxuICAgIGlmIChyZWdleEluY2hJS2V5LmV4ZWMobWF0Y2hbMl0pKXtcbiAgICAgIHNwZWN0cmEuaW5jaGlLZXkgPSByZWdleEluY2hJS2V5LmV4ZWMobWF0Y2hbMl0pWzFdO1xuICAgIH1cblxuICAgIC8vIGdldCBhbiBpbmNoaVxuICAgIGVsc2UgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdpbmNoaScgfHwgbWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2luY2hpY29kZScgfHwgbWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2luY2hpIGNvZGUnKSB7XG4gICAgICBzcGVjdHJhLmluY2hpID0gdGhpcy50cmltKG1hdGNoWzJdKTtcbiAgICB9XG5cbiAgICAvLyBnZXQgYW4gaW5jaGkgZnJvbSBhIHNtaWxlXG4gICAgZWxzZSBpZiAobWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ3NtaWxlcycgJiYgcmVnZXhTbWlsZXMuZXhlYyhtYXRjaFsyXSkpIHtcbiAgICAgIHNwZWN0cmEuc21pbGVzID0gcmVnZXhTbWlsZXMuZXhlYyhtYXRjaFsyXSlbMV07XG4gICAgfVxuXG4gICAgLy8gY29tbWVudCBmaWVsZHMgaGF2ZSBxdWl0ZSBvZnRlbiBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGluIHRoZW1cbiAgICBlbHNlIGlmIChtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnY29tbWVudCcpIHtcbiAgICAgIHNwZWN0cmEgPSB0aGlzLmhhbmRsZU1ldGFEYXRhRmllbGQobWF0Y2hbMl0sIHNwZWN0cmEsIC8oXFx3KylcXHMqPVxccyooWzAtOV0qXFwuP1swLTldKykvZywgdW5kZWZpbmVkKTtcbiAgICB9XG5cbiAgICAvLyBjYW4gY29udGFpbiBhIGxvdCBvZiBkaWZmZXJlbnQgaWQncyBpbiBjYXNlIG9mIG1hc3NiYW5rIGdlbmVyYXRlZCBtc3AgZmlsZXNcbiAgICBlbHNlIGlmIChtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnc2VhcmNoaWQnKSB7XG4gICAgICBzcGVjdHJhID0gdGhpcy5oYW5kbGVNZXRhRGF0YUZpZWxkKG1hdGNoWzJdLCBzcGVjdHJhLCAvKFxcdytcXHM/XFx3KikrOlxccyooW1xcd1xcZF0rWyBcXHdcXGQtXSspL2csICdEYXRhYmFzZSBJZGVudGlmaWVyJyk7XG4gICAgfVxuXG4gICAgLy8gdGhpcyBtYXNzIGJhbmsgc3BlY2lhbCBmbGFnIHByb3ZpZGVzIHNvbWUgZGVyaXZhdGl6YXRpb24gaW5mb3JtYXRpb25cbiAgICBlbHNlIGlmIChtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnbXMkZm9jdXNlZF9pb24nKSB7XG4gICAgICBzcGVjdHJhID0gdGhpcy5oYW5kbGVNZXRhRGF0YUZpZWxkKG1hdGNoWzJdLCBzcGVjdHJhLCAvXFxzKiguKyk6KC4rKS9nLCAnRGVyaXZhdGl6YXRpb24nKTtcbiAgICB9XG5cbiAgICAvLyBhbnkgb3RoZXIgbWV0YWRhdGEgZmllbGRcbiAgICBlbHNlIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBtYXRjaFsxXTtcbiAgICAgIGNvbnN0IHZhbHVlID0gbWF0Y2hbMl07XG5cbiAgICAgIGlmICh0aGlzLmlnbm9yZUZpZWxkKG5hbWUsIHZhbHVlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gYXNzaWduIG1ldGFkYXRhXG4gICAgICAgIHNwZWN0cmEubWV0YS5wdXNoKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIGNhdGVnb3J5OiB0aGlzLmZpbmRDYXRlZ29yeShuYW1lKVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3BlY3RyYTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmaW5kcyB0aGUgcmVsYXRlZCBjYXRlZ29yeSBmb3IgdGhlIGdpdmVuIG5hbWUsIFdpbGwgYmUgYW4gYWRkaXRpb25hbCBtb2R1bGUgYXQgYSBsYXRlciBwb2ludCBUT0RPXG4gICAqL1xuICBmaW5kQ2F0ZWdvcnkgPSAobmFtZSkgPT4ge1xuICAgIGxldCBjYXRlZ29yeSA9ICdub25lJztcbiAgICBuYW1lID0gbmFtZS50b0xvY2FsZUxvd2VyQ2FzZSgpO1xuXG4gICAgLy8gbWFzcyBzcGVjdHJhbCBwcm9wZXJ0aWVzXG4gICAgaWYgKG5hbWUgPT09ICcnKSB7fVxuXG4gICAgZWxzZSBpZiAobmFtZSA9PT0gJ251bSBwZWFrcycgfHwgbmFtZSA9PT0gJ3JldGVudGlvbmluZGV4JyB8fCBuYW1lID09PSAncmV0ZW50aW9udGltZScpIHtcbiAgICAgIGNhdGVnb3J5ID0gJ3NwZWN0cmFsIHByb3BlcnRpZXMnO1xuICAgIH1cblxuICAgIC8vIGFjcXVpc2l0aW9uIHByb3BlcnRpZXNcbiAgICBlbHNlIGlmIChuYW1lID09PSAnaW5zdHJ1bWVudCcgfHwgbmFtZSA9PT0gJ2luc3RydW1lbnR0eXBlJyB8fCBuYW1lID09PSAnaW9ubW9kZScgfHwgbmFtZSA9PT0gJ3ByZWN1cnNvcm16Jykge1xuICAgICAgY2F0ZWdvcnkgPSAnYWNxdWlzaXRpb24gcHJvcGVydGllcyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhdGVnb3J5O1xuICB9XG5cbiAgLyoqXG4gICAqIGlnbm9yZXMgYSBnaXZlbiBmaWVsZCwgaWYgYSBjZXJ0YWluIHZhbHVlIGlzIG5vdCBhcyBleHNwZWN0ZWQuIFdpbGwgYmUgYW4gYWRkaXRpb25hbCBtb2R1bGUgYXQgYSBsYXRlciBwb2ludCBUT0RPXG4gICAqL1xuICBpZ25vcmVGaWVsZCA9IChuYW1lLCB2YWx1ZSkgPT4ge1xuICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgICBpZiAobmFtZSA9PT0gJ251bSBwZWFrcycgfHwgbmFtZSA9PT0gJ251bXBlYWtzJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogY29udmVydHMgdGhlIGRhdGEgdXNpbmcgYSBjYWxsYmFja1xuICAgKi9cbiAgY29udmVydFdpdGhDYWxsYmFjayA9IChkYXRhLCBjYWxsYmFjaykgPT4ge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdzdGFydGluZyB3aXRoIHBhcnNpbmcgbmV3IGRhdGEgc2V0Li4uJyk7XG5cbiAgICAvKipcbiAgICAgKiBjaGVja3MgZm9yIGEgY29tcGxldGUgYmxvY2sgb2YgbXNwIGRhdGEuXG4gICAgICovXG4gICAgY29uc3QgYmxvY2tSZWdFeCA9IC8oKD86Lio6XFxzKlteXFxuXSpcXG4/KSspXFxuKCg/OlxccypbMC05XSpcXC4/WzAtOV0rXFxzK1swLTldKlxcLj9bMC05XStbO1xcbl0/LipcXG4/KSspL2c7XG5cbiAgICAvKipcbiAgICAgKiBleHRyYWN0cyB0aGUgYXR0cmlidXJlcyBsaWtlICduYW1lJyBhbmQgJ3ZhbHVlJyBmcm9tIGEgZm91bmQgbGluZVxuICAgICAqL1xuICAgIGNvbnN0IHJlZ0V4QXR0cmlidXRlcyA9IC9cXHMqKFthLXpBLVogXyRcXC9dKyk6KC4rKVxccy9nO1xuXG4gICAgLyoqXG4gICAgICogZmlyc3QgYmxvY2sgY2FwdHVyZXMgbWV0YSBkYXRhXG4gICAgICogc2Vjb25kIGJsb2NrIGNhcHV0dXJlcyBzcGVjdHJhIGluY2x1ZGluZyBmbG9hdHNcbiAgICAgKiBvcHRpb25hbCB0aGlyZCBibG9jayBhcmUgaWRlbnRpZmljYXRpb25zIG9mIHRoaXMgaW9uXG4gICAgICovXG4gICAgY29uc3QgcmVnRXhTcGVjdHJhID0gLyhbMC05XStcXC4/WzAtOV0qKVsgXFx0XSsoWzAtOV0qXFwuP1swLTldKykoPzpcXHMqKD86WztcXG5dKXwoPzpcIj8oLispXCI/XFxuPykpPy9nO1xuICAgIC8vIHJlZ0V4U3BlY3RyYSA9IC8oWzAtOV0qXFwuP1swLTldKylbIFxcdF0rKFswLTldKlxcLj9bMC05XSspKD86XFxzKiguKilcXG4/KT8vZztcbiAgICAvLyByZWdFeFNwZWN0cmEgPSAvKFswLTldKlxcLj9bMC05XSspXFxzKyhbMC05XSpcXC4/WzAtOV0rKSg/OlxccypcIj8oLiopXCI/XFxuKT87Py9nO1xuXG4gICAgLyoqXG4gICAgICogaXMgdGhpcyBhbiBhY2N1cmF0ZSBtYXNzXG4gICAgICovXG4gICAgY29uc3QgcmVnRXhBY2N1cmF0ZU1hc3MgPSAvKFswLTldKlxcLj9bMC05XXszLH0pLztcblxuICAgIGNvbnN0IGJ1ZiA9IGRhdGEudG9TdHJpbmcoJ3V0ZjgnKTtcblxuICAgIGxldCBibG9ja3MgPSBibG9ja1JlZ0V4LmV4ZWMoYnVmKTtcblxuICAgIC8vIHJldHVybiBjb2RlXG4gICAgbGV0IGZvdW5kQmxvY2tzID0gZmFsc2U7XG5cbiAgICAvLyBnbyBvdmVyIGFsbCBhdmFpbGFibGUgYmxvY2tzXG4gICAgd2hpbGUgKGJsb2NrcyAhPSBudWxsKSB7XG4gICAgICAvLyBjb250YWlucyB0aGUgcmVzdWx0aW5nIHNwZWN0cmEgb2JqZWN0XG4gICAgICBsZXQgc3BlY3RyYSA9IHttZXRhOiBbXSwgbmFtZXM6IFtdLCBzcGVjdHJ1bTogJycsIGFjY3VyYXRlOiBmYWxzZX07XG5cbiAgICAgIC8vIHBhcnNlIHRoZSBmaXJzdCBibG9jayBhbmQgYXNzaWduXG4gICAgICBjb25zdCBjdXJyZW50ID0gYmxvY2tzWzBdO1xuICAgICAgbGV0IG1hdGNoID0gcmVnRXhBdHRyaWJ1dGVzLmV4ZWMoY3VycmVudCk7XG5cbiAgICAgIC8vIGJ1aWxkcyBvdXIgbWV0YWRhdGEgb2JqZWN0XG4gICAgICB3aGlsZSAobWF0Y2ggIT0gbnVsbCkge1xuICAgICAgICBtYXRjaFsxXSA9IHRoaXMudHJpbShtYXRjaFsxXSk7XG4gICAgICAgIG1hdGNoWzJdID0gdGhpcy50cmltKG1hdGNoWzJdKTtcblxuICAgICAgICBpZiAobWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ25hbWUnIHx8IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdzeW5vbicpIHtcbiAgICAgICAgICAvLyBpbiBjYXNlIHRoZXJlIGFyZSBSSSBlbmNvZGVkIHdlIGV4dHJhY3QgdGhpcyBpbmZvcm1hdGlvblxuICAgICAgICAgIHNwZWN0cmEgPSB0aGlzLmhhbmRsZU5hbWUobWF0Y2hbMl0sIHNwZWN0cmEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNwZWN0cmEgPSB0aGlzLmluc3BlY3RGaWVsZHMobWF0Y2gsIHNwZWN0cmEpO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF0Y2ggPSByZWdFeEF0dHJpYnV0ZXMuZXhlYyhjdXJyZW50KTtcbiAgICAgIH1cblxuICAgICAgLy8ga2VlcCBvbmx5IHVuaXF1ZSBuYW1lc1xuICAgICAgc3BlY3RyYS5uYW1lcyA9IHNwZWN0cmEubmFtZXMucmVkdWNlKChwLCBjKSA9PiB7XG4gICAgICAgIGlmIChwLmluZGV4T2YoYykgPCAwKSB7IHAucHVzaChjKTsgfVxuICAgICAgICByZXR1cm4gcDtcbiAgICAgIH0sIFtdKTtcblxuICAgICAgLy8gYnVpbGRzIHRoZSBhY3R1YWwgc3BlY3RyYVxuICAgICAgbWF0Y2ggPSByZWdFeFNwZWN0cmEuZXhlYyhibG9ja3NbMl0pO1xuICAgICAgc3BlY3RyYS5zcGVjdHJ1bSA9ICcnO1xuICAgICAgc3BlY3RyYS5hY2N1cmF0ZSA9IHRydWU7XG5cbiAgICAgIHdoaWxlIChtYXRjaCAhPSBudWxsKSB7XG4gICAgICAgIGZvdW5kQmxvY2tzID0gdHJ1ZTtcblxuICAgICAgICBzcGVjdHJhLnNwZWN0cnVtID0gc3BlY3RyYS5zcGVjdHJ1bSArICcgJyArIG1hdGNoWzFdICsgJzonICsgbWF0Y2hbMl07XG5cbiAgICAgICAgLy8gdXNlZCB0byBkZXRlcm1pbmUgaWYgdGhpcyBpcyBhbiBhY2N1cmF0ZSBtYXNzIHNwZWN0cmEgb3Igbm90XG4gICAgICAgIGlmICghcmVnRXhBY2N1cmF0ZU1hc3MudGVzdChtYXRjaFsxXSkpIHtcbiAgICAgICAgICBzcGVjdHJhLmFjY3VyYXRlID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2hbM10pIHtcbiAgICAgICAgICBzcGVjdHJhLm1ldGEucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLnRyaW0obWF0Y2hbM10pLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCAnJyksXG4gICAgICAgICAgICB2YWx1ZTogbWF0Y2hbMV0sXG4gICAgICAgICAgICBjYXRlZ29yeTogJ2Fubm90YXRpb24nXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBnZXQgdGhlIG5leHQgbWF0Y2hcbiAgICAgICAgbWF0Y2ggPSByZWdFeFNwZWN0cmEuZXhlYyhibG9ja3NbMl0pO1xuICAgICAgfVxuXG4gICAgICAvLyBhc3NpZ24gdGhlIHRyaW1tZWQgc3BlY3RyYVxuICAgICAgc3BlY3RyYS5zcGVjdHJ1bSA9IHRoaXMudHJpbShzcGVjdHJhLnNwZWN0cnVtKTtcblxuICAgICAgLy8gbWFrZSBzdXJlIHdlIGhhdmUgYXQgbGVhc3QgYSBzcGVjdHJ1bSBhbmQgYSBuYW1lXG4gICAgICBpZiAoc3BlY3RyYS5zcGVjdHJ1bSAhPSBudWxsICYmIHNwZWN0cmEubmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBpbnZva2UgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgIGNhbGxiYWNrKHNwZWN0cmEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignaW52YWxpZCBzcGVjdHJhIGZvdW5kIC0+IGlnbm9yZWQnKTtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkKTtcbiAgICAgIH1cblxuICAgICAgLy8gZmV0Y2ggdGhlIG5leHQgbWF0Y2hpbmcgYmxvY2tcbiAgICAgIGJsb2NrcyA9IGJsb2NrUmVnRXguZXhlYyhidWYpO1xuICAgIH1cblxuICAgIHJldHVybiBmb3VuZEJsb2NrcztcbiAgfVxuXG4gIC8qKlxuICAgKiBjb252ZXJ0cyB0aGUgZGF0YSB1c2luZyBhIGNhbGxiYWNrXG4gICAqL1xuICBjb252ZXJ0RnJvbURhdGEgPSAoZGF0YSwgY2FsbGJhY2spID0+IHtcbiAgICByZXR1cm4gdGhpcy5jb252ZXJ0V2l0aENhbGxiYWNrKGRhdGEsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBjb3VudHMgdGhlIG51bWJlciBvZiBtYXNzIHNwZWN0cmEgaW4gdGhpcyBsaWJyYXJ5IGZpbGVcbiAgICovXG4gIGNvdW50U3BlY3RyYSA9IChkYXRhKSA9PiB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBsZXQgcG9zID0gMDtcblxuICAgIHdoaWxlIChwb3MgIT09IC0xKSB7XG4gICAgICBjb3VudCsrO1xuICAgICAgcG9zID0gZGF0YS5pbmRleE9mKCdOdW0gUGVha3MnLCBwb3MgKyAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY291bnQ7XG4gIH1cbn1cbiJdfQ==