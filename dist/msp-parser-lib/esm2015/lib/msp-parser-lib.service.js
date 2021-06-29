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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXNwLXBhcnNlci1saWIuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIvaG9tZS9ub2xhbi9EZXZlbG9wbWVudC9tb25hLXNlcnZpY2VzL2FuZ3VsYXItbXNwLXBhcnNlci9wcm9qZWN0cy9tc3AtcGFyc2VyLWxpYi9zcmMvIiwic291cmNlcyI6WyJsaWIvbXNwLXBhcnNlci1saWIuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNuRCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDaEQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFlBQVksQ0FBQzs7OztBQUtyQyxNQUFNLE9BQU8sbUJBQW1CO0lBQzlCLFlBQXdDLElBQWdCLEVBQTZCLE1BQWlCO1FBQTlELFNBQUksR0FBSixJQUFJLENBQVk7UUFBNkIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUV0Rzs7V0FFRztRQUNILGVBQVUsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUM5Qix1REFBdUQ7WUFDdkQsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxNQUFNLDJCQUEyQixHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVwRSxJQUFJLFNBQVMsRUFBRTtnQkFDYixvQkFBb0I7Z0JBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFNUMsNkJBQTZCO2dCQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDZixFQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENB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O1lBQ25DLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUE7UUFFRDs7V0FFRztRQUNILGlCQUFZLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN0QixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDZCxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFFWixPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRTtnQkFDakIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUMxQztZQUVELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFBO0lBOVJ5RyxDQUFDOztzRkFEaEcsbUJBQW1CLGNBQ1YsVUFBVSxlQUFvQyxTQUFTOzJEQURoRSxtQkFBbUIsV0FBbkIsbUJBQW1CLG1CQUZsQixNQUFNO2tEQUVQLG1CQUFtQjtjQUgvQixVQUFVO2VBQUM7Z0JBQ1YsVUFBVSxFQUFFLE1BQU07YUFDbkI7O3NCQUVjLE1BQU07dUJBQUMsVUFBVTs7c0JBQTZCLE1BQU07dUJBQUMsU0FBUyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEluamVjdGFibGUsIEluamVjdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtIdHRwQ2xpZW50fSBmcm9tICdAYW5ndWxhci9jb21tb24vaHR0cCc7XG5pbXBvcnQge05HWExvZ2dlcn0gZnJvbSAnbmd4LWxvZ2dlcic7XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIE1zcFBhcnNlckxpYlNlcnZpY2Uge1xuICBjb25zdHJ1Y3RvcihASW5qZWN0KEh0dHBDbGllbnQpIHByaXZhdGUgaHR0cDogSHR0cENsaWVudCwgQEluamVjdChOR1hMb2dnZXIpIHByaXZhdGUgbG9nZ2VyOiBOR1hMb2dnZXIpIHsgfVxuXG4gIC8qKlxuICAgKiBwYXJzZXMgdGhlIG5hbWUgZmllbGQgY29udGVudCBhbmQgbW9kaWZpZXMgdGhlIHNwZWN0cmEgb2JqZWN0IGFjY29yZGluZ2x5XG4gICAqL1xuICBoYW5kbGVOYW1lID0gKHZhbHVlLCBzcGVjdHJhKSA9PiB7XG4gICAgLy8gY2hlY2sgaWYgd2UgaGF2ZSBhIFJldGVudGlvbiBJbmRleCBpbiB0aGUgbmFtZSBmaWVsZFxuICAgIGNvbnN0IG5hbWVNYXRjaCA9IC8oLispX1JJKC4qKS8uZXhlYyh2YWx1ZSk7XG4gICAgY29uc3QgbmFtZUNvbWJpbmVkV2l0aEluc3RydW1lbnRzID0gL1xccyooWzpcXHdcXGRcXHMtXSspOy8uZXhlYyh2YWx1ZSk7XG5cbiAgICBpZiAobmFtZU1hdGNoKSB7XG4gICAgICAvLyBzZXRzIHRoZSBuZXcgbmFtZVxuICAgICAgc3BlY3RyYS5uYW1lcy5wdXNoKHRoaXMudHJpbShuYW1lTWF0Y2hbMV0pKTtcblxuICAgICAgLy8gYWRkcyBpdCBhcyByZXRlbnRpb24gaW5kZXhcbiAgICAgIHNwZWN0cmEubWV0YS5wdXNoKFxuICAgICAgICB7bmFtZTogJ1JldGVudGlvbiBJbmRleCcsIHZhbHVlOiB0aGlzLnRyaW0obmFtZU1hdGNoWzJdKSwgY2F0ZWdvcnk6IHRoaXMuZmluZENhdGVnb3J5KCdSZXRlbnRpb24gSW5kZXgnKX1cbiAgICAgICk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc3BlY3RyYS5uYW1lcy5wdXNoKHRoaXMudHJpbSh2YWx1ZSkpO1xuICAgIH1cblxuICAgIHJldHVybiBzcGVjdHJhO1xuICB9XG5cbiAgLyoqXG4gICAqIGhhbmRsZXMgYSBnaXZlbiBtZXRhZGF0YSBmaWVsZCBhbmQgbWlnaHQgZG9lcyBhZGRpdGlvbmFsIG1vZGlmaWNhdGlvbnNcbiAgICovXG4gIGhhbmRsZU1ldGFEYXRhRmllbGQgPSAodmFsdWUsIHNwZWN0cmEsIHJlZ2V4LCBjYXRlZ29yeSkgPT4ge1xuICAgIGlmICghY2F0ZWdvcnkpIHtcbiAgICAgIGNhdGVnb3J5ID0gJ25vbmUnO1xuICAgIH1cblxuICAgIGNvbnN0IGV4dHJhY3RWYWx1ZSA9IHJlZ2V4O1xuICAgIGxldCBtYXRjaCA9IGV4dHJhY3RWYWx1ZS5leGVjKHZhbHVlKTtcblxuICAgIHdoaWxlIChtYXRjaCAhPSBudWxsKSB7XG4gICAgICBjb25zdCBuYW1lID0gdGhpcy50cmltKG1hdGNoWzFdKTtcbiAgICAgIGNvbnN0IHBhcnNlZFZhbHVlID0gdGhpcy50cmltKG1hdGNoWzJdKTtcblxuICAgICAgaWYgKHRoaXMuaWdub3JlRmllbGQobmFtZSwgcGFyc2VkVmFsdWUpID09PSBmYWxzZSkge1xuICAgICAgICBzcGVjdHJhLm1ldGEucHVzaCh7bmFtZSwgdmFsdWU6IHBhcnNlZFZhbHVlLCBjYXRlZ29yeX0pO1xuICAgICAgfVxuICAgICAgbWF0Y2ggPSBleHRyYWN0VmFsdWUuZXhlYyh2YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwZWN0cmE7XG4gIH1cblxuICAvKipcbiAgICogc2ltcGxlIHRyaW1taW5nIGZ1bmN0aW9uXG4gICAqL1xuICB0cmltID0gKHN0cikgPT4ge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvXlxcc1xccyovLCAnJykucmVwbGFjZSgvXFxzXFxzKiQvLCAnJykucmVwbGFjZSgvXlwiKC4qKVwiJC8sICckMScpO1xuICB9XG5cbiAgLyoqXG4gICAqIGluc3BlY3RzIG91ciBtZXRhZGF0YSBmaWVsZHMgYW5kIGRvZXMgYWRkaXRpb25hbCBtb2RpZmljYXRpb25zLCBhcyByZXF1aXJlZFxuICAgKi9cbiAgaW5zcGVjdEZpZWxkcyA9IChtYXRjaCwgc3BlY3RyYSkgPT4ge1xuICAgIGNvbnN0IHJlZ2V4SW5jaElLZXkgPSAvLiooW0EtWl17MTR9LVtBLVpdezEwfS1bQS1aLDAtOV0pKy4qLztcbiAgICAvLyB2YXIgcmVnZXhTbWlsZXMgPSAvXihbXkpdWzAtOUJDT0hOU09QcklGbGFAK1xcLVxcW1xcXVxcKFxcKVxcXFxcXC8lPSMkLC5+JiFdezYsfSkkLztcbiAgICBjb25zdCByZWdleFNtaWxlcyA9IC9eKFteSl1bMC05QS1aYS16QCtcXC1cXFtcXF1cXChcXClcXFxcXFwvJT0jJCwufiYhXXs2LH0pJC87XG5cbiAgICAvLyBpZiB3ZSBjb250YWluIGFuIGluY2hpIGtleSBpbiBhbnkgcHJvcHRlcnR5IG9mIHRoaXMgZmllbGRcbiAgICBpZiAocmVnZXhJbmNoSUtleS5leGVjKG1hdGNoWzJdKSl7XG4gICAgICBzcGVjdHJhLmluY2hpS2V5ID0gcmVnZXhJbmNoSUtleS5leGVjKG1hdGNoWzJdKVsxXTtcbiAgICB9XG5cbiAgICAvLyBnZXQgYW4gaW5jaGlcbiAgICBlbHNlIGlmIChtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnaW5jaGknIHx8IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdpbmNoaWNvZGUnIHx8IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdpbmNoaSBjb2RlJykge1xuICAgICAgc3BlY3RyYS5pbmNoaSA9IHRoaXMudHJpbShtYXRjaFsyXSk7XG4gICAgfVxuXG4gICAgLy8gZ2V0IGFuIGluY2hpIGZyb20gYSBzbWlsZVxuICAgIGVsc2UgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdzbWlsZXMnICYmIHJlZ2V4U21pbGVzLmV4ZWMobWF0Y2hbMl0pKSB7XG4gICAgICBzcGVjdHJhLnNtaWxlcyA9IHJlZ2V4U21pbGVzLmV4ZWMobWF0Y2hbMl0pWzFdO1xuICAgIH1cblxuICAgIC8vIGNvbW1lbnQgZmllbGRzIGhhdmUgcXVpdGUgb2Z0ZW4gYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBpbiB0aGVtXG4gICAgZWxzZSBpZiAobWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICBzcGVjdHJhID0gdGhpcy5oYW5kbGVNZXRhRGF0YUZpZWxkKG1hdGNoWzJdLCBzcGVjdHJhLCAvKFxcdyspXFxzKj1cXHMqKFswLTldKlxcLj9bMC05XSspL2csIHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgLy8gY2FuIGNvbnRhaW4gYSBsb3Qgb2YgZGlmZmVyZW50IGlkJ3MgaW4gY2FzZSBvZiBtYXNzYmFuayBnZW5lcmF0ZWQgbXNwIGZpbGVzXG4gICAgZWxzZSBpZiAobWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ3NlYXJjaGlkJykge1xuICAgICAgc3BlY3RyYSA9IHRoaXMuaGFuZGxlTWV0YURhdGFGaWVsZChtYXRjaFsyXSwgc3BlY3RyYSwgLyhcXHcrXFxzP1xcdyopKzpcXHMqKFtcXHdcXGRdK1sgXFx3XFxkLV0rKS9nLCAnRGF0YWJhc2UgSWRlbnRpZmllcicpO1xuICAgIH1cblxuICAgIC8vIHRoaXMgbWFzcyBiYW5rIHNwZWNpYWwgZmxhZyBwcm92aWRlcyBzb21lIGRlcml2YXRpemF0aW9uIGluZm9ybWF0aW9uXG4gICAgZWxzZSBpZiAobWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ21zJGZvY3VzZWRfaW9uJykge1xuICAgICAgc3BlY3RyYSA9IHRoaXMuaGFuZGxlTWV0YURhdGFGaWVsZChtYXRjaFsyXSwgc3BlY3RyYSwgL1xccyooLispOiguKykvZywgJ0Rlcml2YXRpemF0aW9uJyk7XG4gICAgfVxuXG4gICAgLy8gYW55IG90aGVyIG1ldGFkYXRhIGZpZWxkXG4gICAgZWxzZSB7XG4gICAgICBjb25zdCBuYW1lID0gbWF0Y2hbMV07XG4gICAgICBjb25zdCB2YWx1ZSA9IG1hdGNoWzJdO1xuXG4gICAgICBpZiAodGhpcy5pZ25vcmVGaWVsZChuYW1lLCB2YWx1ZSkgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIGFzc2lnbiBtZXRhZGF0YVxuICAgICAgICBzcGVjdHJhLm1ldGEucHVzaChcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICBjYXRlZ29yeTogdGhpcy5maW5kQ2F0ZWdvcnkobmFtZSlcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwZWN0cmE7XG4gIH1cblxuICAvKipcbiAgICogZmluZHMgdGhlIHJlbGF0ZWQgY2F0ZWdvcnkgZm9yIHRoZSBnaXZlbiBuYW1lLCBXaWxsIGJlIGFuIGFkZGl0aW9uYWwgbW9kdWxlIGF0IGEgbGF0ZXIgcG9pbnQgVE9ET1xuICAgKi9cbiAgZmluZENhdGVnb3J5ID0gKG5hbWUpID0+IHtcbiAgICBsZXQgY2F0ZWdvcnkgPSAnbm9uZSc7XG4gICAgbmFtZSA9IG5hbWUudG9Mb2NhbGVMb3dlckNhc2UoKTtcblxuICAgIC8vIG1hc3Mgc3BlY3RyYWwgcHJvcGVydGllc1xuICAgIGlmIChuYW1lID09PSAnJykge31cblxuICAgIGVsc2UgaWYgKG5hbWUgPT09ICdudW0gcGVha3MnIHx8IG5hbWUgPT09ICdyZXRlbnRpb25pbmRleCcgfHwgbmFtZSA9PT0gJ3JldGVudGlvbnRpbWUnKSB7XG4gICAgICBjYXRlZ29yeSA9ICdzcGVjdHJhbCBwcm9wZXJ0aWVzJztcbiAgICB9XG5cbiAgICAvLyBhY3F1aXNpdGlvbiBwcm9wZXJ0aWVzXG4gICAgZWxzZSBpZiAobmFtZSA9PT0gJ2luc3RydW1lbnQnIHx8IG5hbWUgPT09ICdpbnN0cnVtZW50dHlwZScgfHwgbmFtZSA9PT0gJ2lvbm1vZGUnIHx8IG5hbWUgPT09ICdwcmVjdXJzb3JteicpIHtcbiAgICAgIGNhdGVnb3J5ID0gJ2FjcXVpc2l0aW9uIHByb3BlcnRpZXMnO1xuICAgIH1cblxuICAgIHJldHVybiBjYXRlZ29yeTtcbiAgfVxuXG4gIC8qKlxuICAgKiBpZ25vcmVzIGEgZ2l2ZW4gZmllbGQsIGlmIGEgY2VydGFpbiB2YWx1ZSBpcyBub3QgYXMgZXhzcGVjdGVkLiBXaWxsIGJlIGFuIGFkZGl0aW9uYWwgbW9kdWxlIGF0IGEgbGF0ZXIgcG9pbnQgVE9ET1xuICAgKi9cbiAgaWdub3JlRmllbGQgPSAobmFtZSwgdmFsdWUpID0+IHtcbiAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKG5hbWUgPT09ICdudW0gcGVha3MnIHx8IG5hbWUgPT09ICdudW1wZWFrcycpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIGNvbnZlcnRzIHRoZSBkYXRhIHVzaW5nIGEgY2FsbGJhY2tcbiAgICovXG4gIGNvbnZlcnRXaXRoQ2FsbGJhY2sgPSAoZGF0YSwgY2FsbGJhY2spID0+IHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1Zygnc3RhcnRpbmcgd2l0aCBwYXJzaW5nIG5ldyBkYXRhIHNldC4uLicpO1xuXG4gICAgLyoqXG4gICAgICogY2hlY2tzIGZvciBhIGNvbXBsZXRlIGJsb2NrIG9mIG1zcCBkYXRhLlxuICAgICAqL1xuICAgIGNvbnN0IGJsb2NrUmVnRXggPSAvKCg/Oi4qOlxccypbXlxcbl0qXFxuPykrKVxcbigoPzpcXHMqWzAtOV0qXFwuP1swLTldK1xccytbMC05XSpcXC4/WzAtOV0rWztcXG5dPy4qXFxuPykrKS9nO1xuXG4gICAgLyoqXG4gICAgICogZXh0cmFjdHMgdGhlIGF0dHJpYnVyZXMgbGlrZSAnbmFtZScgYW5kICd2YWx1ZScgZnJvbSBhIGZvdW5kIGxpbmVcbiAgICAgKi9cbiAgICBjb25zdCByZWdFeEF0dHJpYnV0ZXMgPSAvXFxzKihbYS16QS1aIF8kXFwvXSspOiguKylcXHMvZztcblxuICAgIC8qKlxuICAgICAqIGZpcnN0IGJsb2NrIGNhcHR1cmVzIG1ldGEgZGF0YVxuICAgICAqIHNlY29uZCBibG9jayBjYXB1dHVyZXMgc3BlY3RyYSBpbmNsdWRpbmcgZmxvYXRzXG4gICAgICogb3B0aW9uYWwgdGhpcmQgYmxvY2sgYXJlIGlkZW50aWZpY2F0aW9ucyBvZiB0aGlzIGlvblxuICAgICAqL1xuICAgIGNvbnN0IHJlZ0V4U3BlY3RyYSA9IC8oWzAtOV0rXFwuP1swLTldKilbIFxcdF0rKFswLTldKlxcLj9bMC05XSspKD86XFxzKig/Ols7XFxuXSl8KD86XCI/KC4rKVwiP1xcbj8pKT8vZztcbiAgICAvLyByZWdFeFNwZWN0cmEgPSAvKFswLTldKlxcLj9bMC05XSspWyBcXHRdKyhbMC05XSpcXC4/WzAtOV0rKSg/OlxccyooLiopXFxuPyk/L2c7XG4gICAgLy8gcmVnRXhTcGVjdHJhID0gLyhbMC05XSpcXC4/WzAtOV0rKVxccysoWzAtOV0qXFwuP1swLTldKykoPzpcXHMqXCI/KC4qKVwiP1xcbik/Oz8vZztcblxuICAgIC8qKlxuICAgICAqIGlzIHRoaXMgYW4gYWNjdXJhdGUgbWFzc1xuICAgICAqL1xuICAgIGNvbnN0IHJlZ0V4QWNjdXJhdGVNYXNzID0gLyhbMC05XSpcXC4/WzAtOV17Myx9KS87XG5cbiAgICBjb25zdCBidWYgPSBkYXRhLnRvU3RyaW5nKCd1dGY4Jyk7XG5cbiAgICBsZXQgYmxvY2tzID0gYmxvY2tSZWdFeC5leGVjKGJ1Zik7XG5cbiAgICAvLyByZXR1cm4gY29kZVxuICAgIGxldCBmb3VuZEJsb2NrcyA9IGZhbHNlO1xuXG4gICAgLy8gZ28gb3ZlciBhbGwgYXZhaWxhYmxlIGJsb2Nrc1xuICAgIHdoaWxlIChibG9ja3MgIT0gbnVsbCkge1xuICAgICAgLy8gY29udGFpbnMgdGhlIHJlc3VsdGluZyBzcGVjdHJhIG9iamVjdFxuICAgICAgbGV0IHNwZWN0cmEgPSB7bWV0YTogW10sIG5hbWVzOiBbXSwgc3BlY3RydW06ICcnLCBhY2N1cmF0ZTogZmFsc2V9O1xuXG4gICAgICAvLyBwYXJzZSB0aGUgZmlyc3QgYmxvY2sgYW5kIGFzc2lnblxuICAgICAgY29uc3QgY3VycmVudCA9IGJsb2Nrc1swXTtcbiAgICAgIGxldCBtYXRjaCA9IHJlZ0V4QXR0cmlidXRlcy5leGVjKGN1cnJlbnQpO1xuXG4gICAgICAvLyBidWlsZHMgb3VyIG1ldGFkYXRhIG9iamVjdFxuICAgICAgd2hpbGUgKG1hdGNoICE9IG51bGwpIHtcbiAgICAgICAgbWF0Y2hbMV0gPSB0aGlzLnRyaW0obWF0Y2hbMV0pO1xuICAgICAgICBtYXRjaFsyXSA9IHRoaXMudHJpbShtYXRjaFsyXSk7XG5cbiAgICAgICAgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICduYW1lJyB8fCBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnc3lub24nKSB7XG4gICAgICAgICAgLy8gaW4gY2FzZSB0aGVyZSBhcmUgUkkgZW5jb2RlZCB3ZSBleHRyYWN0IHRoaXMgaW5mb3JtYXRpb25cbiAgICAgICAgICBzcGVjdHJhID0gdGhpcy5oYW5kbGVOYW1lKG1hdGNoWzJdLCBzcGVjdHJhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzcGVjdHJhID0gdGhpcy5pbnNwZWN0RmllbGRzKG1hdGNoLCBzcGVjdHJhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1hdGNoID0gcmVnRXhBdHRyaWJ1dGVzLmV4ZWMoY3VycmVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGtlZXAgb25seSB1bmlxdWUgbmFtZXNcbiAgICAgIHNwZWN0cmEubmFtZXMgPSBzcGVjdHJhLm5hbWVzLnJlZHVjZSgocCwgYykgPT4ge1xuICAgICAgICBpZiAocC5pbmRleE9mKGMpIDwgMCkgeyBwLnB1c2goYyk7IH1cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgICB9LCBbXSk7XG5cbiAgICAgIC8vIGJ1aWxkcyB0aGUgYWN0dWFsIHNwZWN0cmFcbiAgICAgIG1hdGNoID0gcmVnRXhTcGVjdHJhLmV4ZWMoYmxvY2tzWzJdKTtcbiAgICAgIHNwZWN0cmEuc3BlY3RydW0gPSAnJztcbiAgICAgIHNwZWN0cmEuYWNjdXJhdGUgPSB0cnVlO1xuXG4gICAgICB3aGlsZSAobWF0Y2ggIT0gbnVsbCkge1xuICAgICAgICBmb3VuZEJsb2NrcyA9IHRydWU7XG5cbiAgICAgICAgc3BlY3RyYS5zcGVjdHJ1bSA9IHNwZWN0cmEuc3BlY3RydW0gKyAnICcgKyBtYXRjaFsxXSArICc6JyArIG1hdGNoWzJdO1xuXG4gICAgICAgIC8vIHVzZWQgdG8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYW4gYWNjdXJhdGUgbWFzcyBzcGVjdHJhIG9yIG5vdFxuICAgICAgICBpZiAoIXJlZ0V4QWNjdXJhdGVNYXNzLnRlc3QobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgc3BlY3RyYS5hY2N1cmF0ZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoWzNdKSB7XG4gICAgICAgICAgc3BlY3RyYS5tZXRhLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogdGhpcy50cmltKG1hdGNoWzNdKS5yZXBsYWNlKC8oXlwifFwiJCkvZywgJycpLFxuICAgICAgICAgICAgdmFsdWU6IG1hdGNoWzFdLFxuICAgICAgICAgICAgY2F0ZWdvcnk6ICdhbm5vdGF0aW9uJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ2V0IHRoZSBuZXh0IG1hdGNoXG4gICAgICAgIG1hdGNoID0gcmVnRXhTcGVjdHJhLmV4ZWMoYmxvY2tzWzJdKTtcbiAgICAgIH1cblxuICAgICAgLy8gYXNzaWduIHRoZSB0cmltbWVkIHNwZWN0cmFcbiAgICAgIHNwZWN0cmEuc3BlY3RydW0gPSB0aGlzLnRyaW0oc3BlY3RyYS5zcGVjdHJ1bSk7XG5cbiAgICAgIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIGF0IGxlYXN0IGEgc3BlY3RydW0gYW5kIGEgbmFtZVxuICAgICAgaWYgKHNwZWN0cmEuc3BlY3RydW0gIT0gbnVsbCAmJiBzcGVjdHJhLm5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gaW52b2tlIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICBjYWxsYmFjayhzcGVjdHJhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2ludmFsaWQgc3BlY3RyYSBmb3VuZCAtPiBpZ25vcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGZldGNoIHRoZSBuZXh0IG1hdGNoaW5nIGJsb2NrXG4gICAgICBibG9ja3MgPSBibG9ja1JlZ0V4LmV4ZWMoYnVmKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZm91bmRCbG9ja3M7XG4gIH1cblxuICAvKipcbiAgICogY29udmVydHMgdGhlIGRhdGEgdXNpbmcgYSBjYWxsYmFja1xuICAgKi9cbiAgY29udmVydEZyb21EYXRhID0gKGRhdGEsIGNhbGxiYWNrKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMuY29udmVydFdpdGhDYWxsYmFjayhkYXRhLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogY291bnRzIHRoZSBudW1iZXIgb2YgbWFzcyBzcGVjdHJhIGluIHRoaXMgbGlicmFyeSBmaWxlXG4gICAqL1xuICBjb3VudFNwZWN0cmEgPSAoZGF0YSkgPT4ge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgbGV0IHBvcyA9IDA7XG5cbiAgICB3aGlsZSAocG9zICE9PSAtMSkge1xuICAgICAgY291bnQrKztcbiAgICAgIHBvcyA9IGRhdGEuaW5kZXhPZignTnVtIFBlYWtzJywgcG9zICsgMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG59XG4iXX0=