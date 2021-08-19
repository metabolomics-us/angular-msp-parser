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
            const blockRegEx = /((?:.*:\s*[^\n]*\n?)+)\n((?:\s*[0-9]*\.?[0-9]+\s+[0-9]*\.?[0-9]+[;\n]?.*\n?)*)/g;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXNwLXBhcnNlci1saWIuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIvaG9tZS9ub2xhbi9EZXZlbG9wbWVudC9tb25hLXNlcnZpY2VzL2FuZ3VsYXItbXNwLXBhcnNlci9wcm9qZWN0cy9tc3AtcGFyc2VyLWxpYi9zcmMvIiwic291cmNlcyI6WyJsaWIvbXNwLXBhcnNlci1saWIuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNuRCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDaEQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFlBQVksQ0FBQzs7OztBQUtyQyxNQUFNLE9BQU8sbUJBQW1CO0lBQzlCLFlBQXdDLElBQWdCLEVBQTZCLE1BQWlCO1FBQTlELFNBQUksR0FBSixJQUFJLENBQVk7UUFBNkIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUV0Rzs7V0FFRztRQUNILGVBQVUsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUM5Qix1REFBdUQ7WUFDdkQsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxNQUFNLDJCQUEyQixHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVwRSxJQUFJLFNBQVMsRUFBRTtnQkFDYixvQkFBb0I7Z0JBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFNUMsNkJBQTZCO2dCQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDZixFQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENB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R0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUNuQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFBO1FBRUQ7O1dBRUc7UUFDSCxpQkFBWSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDdEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBRVosT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pCLEtBQUssRUFBRSxDQUFDO2dCQUNSLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDMUM7WUFFRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQTtJQS9SeUcsQ0FBQzs7c0ZBRGhHLG1CQUFtQixjQUNWLFVBQVUsZUFBb0MsU0FBUzsyREFEaEUsbUJBQW1CLFdBQW5CLG1CQUFtQixtQkFGbEIsTUFBTTtrREFFUCxtQkFBbUI7Y0FIL0IsVUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25COztzQkFFYyxNQUFNO3VCQUFDLFVBQVU7O3NCQUE2QixNQUFNO3VCQUFDLFNBQVMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlLCBJbmplY3QgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7SHR0cENsaWVudH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL2h0dHAnO1xuaW1wb3J0IHtOR1hMb2dnZXJ9IGZyb20gJ25neC1sb2dnZXInO1xuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCBjbGFzcyBNc3BQYXJzZXJMaWJTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IoQEluamVjdChIdHRwQ2xpZW50KSBwcml2YXRlIGh0dHA6IEh0dHBDbGllbnQsIEBJbmplY3QoTkdYTG9nZ2VyKSBwcml2YXRlIGxvZ2dlcjogTkdYTG9nZ2VyKSB7IH1cblxuICAvKipcbiAgICogcGFyc2VzIHRoZSBuYW1lIGZpZWxkIGNvbnRlbnQgYW5kIG1vZGlmaWVzIHRoZSBzcGVjdHJhIG9iamVjdCBhY2NvcmRpbmdseVxuICAgKi9cbiAgaGFuZGxlTmFtZSA9ICh2YWx1ZSwgc3BlY3RyYSkgPT4ge1xuICAgIC8vIGNoZWNrIGlmIHdlIGhhdmUgYSBSZXRlbnRpb24gSW5kZXggaW4gdGhlIG5hbWUgZmllbGRcbiAgICBjb25zdCBuYW1lTWF0Y2ggPSAvKC4rKV9SSSguKikvLmV4ZWModmFsdWUpO1xuICAgIGNvbnN0IG5hbWVDb21iaW5lZFdpdGhJbnN0cnVtZW50cyA9IC9cXHMqKFs6XFx3XFxkXFxzLV0rKTsvLmV4ZWModmFsdWUpO1xuXG4gICAgaWYgKG5hbWVNYXRjaCkge1xuICAgICAgLy8gc2V0cyB0aGUgbmV3IG5hbWVcbiAgICAgIHNwZWN0cmEubmFtZXMucHVzaCh0aGlzLnRyaW0obmFtZU1hdGNoWzFdKSk7XG5cbiAgICAgIC8vIGFkZHMgaXQgYXMgcmV0ZW50aW9uIGluZGV4XG4gICAgICBzcGVjdHJhLm1ldGEucHVzaChcbiAgICAgICAge25hbWU6ICdSZXRlbnRpb24gSW5kZXgnLCB2YWx1ZTogdGhpcy50cmltKG5hbWVNYXRjaFsyXSksIGNhdGVnb3J5OiB0aGlzLmZpbmRDYXRlZ29yeSgnUmV0ZW50aW9uIEluZGV4Jyl9XG4gICAgICApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNwZWN0cmEubmFtZXMucHVzaCh0aGlzLnRyaW0odmFsdWUpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3BlY3RyYTtcbiAgfVxuXG4gIC8qKlxuICAgKiBoYW5kbGVzIGEgZ2l2ZW4gbWV0YWRhdGEgZmllbGQgYW5kIG1pZ2h0IGRvZXMgYWRkaXRpb25hbCBtb2RpZmljYXRpb25zXG4gICAqL1xuICBoYW5kbGVNZXRhRGF0YUZpZWxkID0gKHZhbHVlLCBzcGVjdHJhLCByZWdleCwgY2F0ZWdvcnkpID0+IHtcbiAgICBpZiAoIWNhdGVnb3J5KSB7XG4gICAgICBjYXRlZ29yeSA9ICdub25lJztcbiAgICB9XG5cbiAgICBjb25zdCBleHRyYWN0VmFsdWUgPSByZWdleDtcbiAgICBsZXQgbWF0Y2ggPSBleHRyYWN0VmFsdWUuZXhlYyh2YWx1ZSk7XG5cbiAgICB3aGlsZSAobWF0Y2ggIT0gbnVsbCkge1xuICAgICAgY29uc3QgbmFtZSA9IHRoaXMudHJpbShtYXRjaFsxXSk7XG4gICAgICBjb25zdCBwYXJzZWRWYWx1ZSA9IHRoaXMudHJpbShtYXRjaFsyXSk7XG5cbiAgICAgIGlmICh0aGlzLmlnbm9yZUZpZWxkKG5hbWUsIHBhcnNlZFZhbHVlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgc3BlY3RyYS5tZXRhLnB1c2goe25hbWUsIHZhbHVlOiBwYXJzZWRWYWx1ZSwgY2F0ZWdvcnl9KTtcbiAgICAgIH1cbiAgICAgIG1hdGNoID0gZXh0cmFjdFZhbHVlLmV4ZWModmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBzcGVjdHJhO1xuICB9XG5cbiAgLyoqXG4gICAqIHNpbXBsZSB0cmltbWluZyBmdW5jdGlvblxuICAgKi9cbiAgdHJpbSA9IChzdHIpID0+IHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHNcXHMqLywgJycpLnJlcGxhY2UoL1xcc1xccyokLywgJycpLnJlcGxhY2UoL15cIiguKilcIiQvLCAnJDEnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBpbnNwZWN0cyBvdXIgbWV0YWRhdGEgZmllbGRzIGFuZCBkb2VzIGFkZGl0aW9uYWwgbW9kaWZpY2F0aW9ucywgYXMgcmVxdWlyZWRcbiAgICovXG4gIGluc3BlY3RGaWVsZHMgPSAobWF0Y2gsIHNwZWN0cmEpID0+IHtcbiAgICBjb25zdCByZWdleEluY2hJS2V5ID0gLy4qKFtBLVpdezE0fS1bQS1aXXsxMH0tW0EtWiwwLTldKSsuKi87XG4gICAgLy8gdmFyIHJlZ2V4U21pbGVzID0gL14oW15KXVswLTlCQ09ITlNPUHJJRmxhQCtcXC1cXFtcXF1cXChcXClcXFxcXFwvJT0jJCwufiYhXXs2LH0pJC87XG4gICAgY29uc3QgcmVnZXhTbWlsZXMgPSAvXihbXkpdWzAtOUEtWmEtekArXFwtXFxbXFxdXFwoXFwpXFxcXFxcLyU9IyQsLn4mIV17Nix9KSQvO1xuXG4gICAgLy8gaWYgd2UgY29udGFpbiBhbiBpbmNoaSBrZXkgaW4gYW55IHByb3B0ZXJ0eSBvZiB0aGlzIGZpZWxkXG4gICAgaWYgKHJlZ2V4SW5jaElLZXkuZXhlYyhtYXRjaFsyXSkpe1xuICAgICAgc3BlY3RyYS5pbmNoaUtleSA9IHJlZ2V4SW5jaElLZXkuZXhlYyhtYXRjaFsyXSlbMV07XG4gICAgfVxuXG4gICAgLy8gZ2V0IGFuIGluY2hpXG4gICAgZWxzZSBpZiAobWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2luY2hpJyB8fCBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnaW5jaGljb2RlJyB8fCBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnaW5jaGkgY29kZScpIHtcbiAgICAgIHNwZWN0cmEuaW5jaGkgPSB0aGlzLnRyaW0obWF0Y2hbMl0pO1xuICAgIH1cblxuICAgIC8vIGdldCBhbiBpbmNoaSBmcm9tIGEgc21pbGVcbiAgICBlbHNlIGlmIChtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnc21pbGVzJyAmJiByZWdleFNtaWxlcy5leGVjKG1hdGNoWzJdKSkge1xuICAgICAgc3BlY3RyYS5zbWlsZXMgPSByZWdleFNtaWxlcy5leGVjKG1hdGNoWzJdKVsxXTtcbiAgICB9XG5cbiAgICAvLyBjb21tZW50IGZpZWxkcyBoYXZlIHF1aXRlIG9mdGVuIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gaW4gdGhlbVxuICAgIGVsc2UgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdjb21tZW50Jykge1xuICAgICAgc3BlY3RyYSA9IHRoaXMuaGFuZGxlTWV0YURhdGFGaWVsZChtYXRjaFsyXSwgc3BlY3RyYSwgLyhcXHcrKVxccyo9XFxzKihbMC05XSpcXC4/WzAtOV0rKS9nLCB1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIC8vIGNhbiBjb250YWluIGEgbG90IG9mIGRpZmZlcmVudCBpZCdzIGluIGNhc2Ugb2YgbWFzc2JhbmsgZ2VuZXJhdGVkIG1zcCBmaWxlc1xuICAgIGVsc2UgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdzZWFyY2hpZCcpIHtcbiAgICAgIHNwZWN0cmEgPSB0aGlzLmhhbmRsZU1ldGFEYXRhRmllbGQobWF0Y2hbMl0sIHNwZWN0cmEsIC8oXFx3K1xccz9cXHcqKSs6XFxzKihbXFx3XFxkXStbIFxcd1xcZC1dKykvZywgJ0RhdGFiYXNlIElkZW50aWZpZXInKTtcbiAgICB9XG5cbiAgICAvLyB0aGlzIG1hc3MgYmFuayBzcGVjaWFsIGZsYWcgcHJvdmlkZXMgc29tZSBkZXJpdmF0aXphdGlvbiBpbmZvcm1hdGlvblxuICAgIGVsc2UgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdtcyRmb2N1c2VkX2lvbicpIHtcbiAgICAgIHNwZWN0cmEgPSB0aGlzLmhhbmRsZU1ldGFEYXRhRmllbGQobWF0Y2hbMl0sIHNwZWN0cmEsIC9cXHMqKC4rKTooLispL2csICdEZXJpdmF0aXphdGlvbicpO1xuICAgIH1cblxuICAgIC8vIGFueSBvdGhlciBtZXRhZGF0YSBmaWVsZFxuICAgIGVsc2Uge1xuICAgICAgY29uc3QgbmFtZSA9IG1hdGNoWzFdO1xuICAgICAgY29uc3QgdmFsdWUgPSBtYXRjaFsyXTtcblxuICAgICAgaWYgKHRoaXMuaWdub3JlRmllbGQobmFtZSwgdmFsdWUpID09PSBmYWxzZSkge1xuICAgICAgICAvLyBhc3NpZ24gbWV0YWRhdGFcbiAgICAgICAgc3BlY3RyYS5tZXRhLnB1c2goXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IHRoaXMuZmluZENhdGVnb3J5KG5hbWUpXG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzcGVjdHJhO1xuICB9XG5cbiAgLyoqXG4gICAqIGZpbmRzIHRoZSByZWxhdGVkIGNhdGVnb3J5IGZvciB0aGUgZ2l2ZW4gbmFtZSwgV2lsbCBiZSBhbiBhZGRpdGlvbmFsIG1vZHVsZSBhdCBhIGxhdGVyIHBvaW50IFRPRE9cbiAgICovXG4gIGZpbmRDYXRlZ29yeSA9IChuYW1lKSA9PiB7XG4gICAgbGV0IGNhdGVnb3J5ID0gJ25vbmUnO1xuICAgIG5hbWUgPSBuYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCk7XG5cbiAgICAvLyBtYXNzIHNwZWN0cmFsIHByb3BlcnRpZXNcbiAgICBpZiAobmFtZSA9PT0gJycpIHt9XG5cbiAgICBlbHNlIGlmIChuYW1lID09PSAnbnVtIHBlYWtzJyB8fCBuYW1lID09PSAncmV0ZW50aW9uaW5kZXgnIHx8IG5hbWUgPT09ICdyZXRlbnRpb250aW1lJykge1xuICAgICAgY2F0ZWdvcnkgPSAnc3BlY3RyYWwgcHJvcGVydGllcyc7XG4gICAgfVxuXG4gICAgLy8gYWNxdWlzaXRpb24gcHJvcGVydGllc1xuICAgIGVsc2UgaWYgKG5hbWUgPT09ICdpbnN0cnVtZW50JyB8fCBuYW1lID09PSAnaW5zdHJ1bWVudHR5cGUnIHx8IG5hbWUgPT09ICdpb25tb2RlJyB8fCBuYW1lID09PSAncHJlY3Vyc29ybXonKSB7XG4gICAgICBjYXRlZ29yeSA9ICdhY3F1aXNpdGlvbiBwcm9wZXJ0aWVzJztcbiAgICB9XG5cbiAgICByZXR1cm4gY2F0ZWdvcnk7XG4gIH1cblxuICAvKipcbiAgICogaWdub3JlcyBhIGdpdmVuIGZpZWxkLCBpZiBhIGNlcnRhaW4gdmFsdWUgaXMgbm90IGFzIGV4c3BlY3RlZC4gV2lsbCBiZSBhbiBhZGRpdGlvbmFsIG1vZHVsZSBhdCBhIGxhdGVyIHBvaW50IFRPRE9cbiAgICovXG4gIGlnbm9yZUZpZWxkID0gKG5hbWUsIHZhbHVlKSA9PiB7XG4gICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmIChuYW1lID09PSAnbnVtIHBlYWtzJyB8fCBuYW1lID09PSAnbnVtcGVha3MnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBjb252ZXJ0cyB0aGUgZGF0YSB1c2luZyBhIGNhbGxiYWNrXG4gICAqL1xuICBjb252ZXJ0V2l0aENhbGxiYWNrID0gKGRhdGEsIGNhbGxiYWNrKSA9PiB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ3N0YXJ0aW5nIHdpdGggcGFyc2luZyBuZXcgZGF0YSBzZXQuLi4nKTtcblxuICAgIC8qKlxuICAgICAqIGNoZWNrcyBmb3IgYSBjb21wbGV0ZSBibG9jayBvZiBtc3AgZGF0YS5cbiAgICAgKi9cbiAgICBjb25zdCBibG9ja1JlZ0V4ID0gLygoPzouKjpcXHMqW15cXG5dKlxcbj8pKylcXG4oKD86XFxzKlswLTldKlxcLj9bMC05XStcXHMrWzAtOV0qXFwuP1swLTldK1s7XFxuXT8uKlxcbj8pKikvZztcblxuICAgIC8qKlxuICAgICAqIGV4dHJhY3RzIHRoZSBhdHRyaWJ1cmVzIGxpa2UgJ25hbWUnIGFuZCAndmFsdWUnIGZyb20gYSBmb3VuZCBsaW5lXG4gICAgICovXG4gICAgY29uc3QgcmVnRXhBdHRyaWJ1dGVzID0gL1xccyooW2EtekEtWiBfJFxcL10rKTooLispXFxzL2c7XG5cbiAgICAvKipcbiAgICAgKiBmaXJzdCBibG9jayBjYXB0dXJlcyBtZXRhIGRhdGFcbiAgICAgKiBzZWNvbmQgYmxvY2sgY2FwdXR1cmVzIHNwZWN0cmEgaW5jbHVkaW5nIGZsb2F0c1xuICAgICAqIG9wdGlvbmFsIHRoaXJkIGJsb2NrIGFyZSBpZGVudGlmaWNhdGlvbnMgb2YgdGhpcyBpb25cbiAgICAgKi9cbiAgICBjb25zdCByZWdFeFNwZWN0cmEgPSAvKFswLTldK1xcLj9bMC05XSopWyBcXHRdKyhbMC05XSpcXC4/WzAtOV0rKSg/OlxccyooPzpbO1xcbl0pfCg/OlwiPyguKylcIj9cXG4/KSk/L2c7XG4gICAgLy8gcmVnRXhTcGVjdHJhID0gLyhbMC05XSpcXC4/WzAtOV0rKVsgXFx0XSsoWzAtOV0qXFwuP1swLTldKykoPzpcXHMqKC4qKVxcbj8pPy9nO1xuICAgIC8vIHJlZ0V4U3BlY3RyYSA9IC8oWzAtOV0qXFwuP1swLTldKylcXHMrKFswLTldKlxcLj9bMC05XSspKD86XFxzKlwiPyguKilcIj9cXG4pPzs/L2c7XG5cbiAgICAvKipcbiAgICAgKiBpcyB0aGlzIGFuIGFjY3VyYXRlIG1hc3NcbiAgICAgKi9cbiAgICBjb25zdCByZWdFeEFjY3VyYXRlTWFzcyA9IC8oWzAtOV0qXFwuP1swLTldezMsfSkvO1xuXG4gICAgY29uc3QgYnVmID0gZGF0YS50b1N0cmluZygndXRmOCcpO1xuXG4gICAgbGV0IGJsb2NrcyA9IGJsb2NrUmVnRXguZXhlYyhidWYpO1xuXG4gICAgLy8gcmV0dXJuIGNvZGVcbiAgICBsZXQgZm91bmRCbG9ja3MgPSBmYWxzZTtcblxuICAgIC8vIGdvIG92ZXIgYWxsIGF2YWlsYWJsZSBibG9ja3NcbiAgICB3aGlsZSAoYmxvY2tzICE9IG51bGwpIHtcbiAgICAgIC8vIGNvbnRhaW5zIHRoZSByZXN1bHRpbmcgc3BlY3RyYSBvYmplY3RcbiAgICAgIGxldCBzcGVjdHJhID0ge21ldGE6IFtdLCBuYW1lczogW10sIHNwZWN0cnVtOiAnJywgYWNjdXJhdGU6IGZhbHNlfTtcblxuICAgICAgLy8gcGFyc2UgdGhlIGZpcnN0IGJsb2NrIGFuZCBhc3NpZ25cbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBibG9ja3NbMF07XG4gICAgICBsZXQgbWF0Y2ggPSByZWdFeEF0dHJpYnV0ZXMuZXhlYyhjdXJyZW50KTtcblxuICAgICAgLy8gYnVpbGRzIG91ciBtZXRhZGF0YSBvYmplY3RcbiAgICAgIHdoaWxlIChtYXRjaCAhPSBudWxsKSB7XG4gICAgICAgIG1hdGNoWzFdID0gdGhpcy50cmltKG1hdGNoWzFdKTtcbiAgICAgICAgbWF0Y2hbMl0gPSB0aGlzLnRyaW0obWF0Y2hbMl0pO1xuXG4gICAgICAgIGlmIChtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnbmFtZScgfHwgbWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ3N5bm9uJykge1xuICAgICAgICAgIC8vIGluIGNhc2UgdGhlcmUgYXJlIFJJIGVuY29kZWQgd2UgZXh0cmFjdCB0aGlzIGluZm9ybWF0aW9uXG4gICAgICAgICAgc3BlY3RyYSA9IHRoaXMuaGFuZGxlTmFtZShtYXRjaFsyXSwgc3BlY3RyYSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3BlY3RyYSA9IHRoaXMuaW5zcGVjdEZpZWxkcyhtYXRjaCwgc3BlY3RyYSk7XG4gICAgICAgIH1cblxuICAgICAgICBtYXRjaCA9IHJlZ0V4QXR0cmlidXRlcy5leGVjKGN1cnJlbnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBrZWVwIG9ubHkgdW5pcXVlIG5hbWVzXG4gICAgICBzcGVjdHJhLm5hbWVzID0gc3BlY3RyYS5uYW1lcy5yZWR1Y2UoKHAsIGMpID0+IHtcbiAgICAgICAgaWYgKHAuaW5kZXhPZihjKSA8IDApIHsgcC5wdXNoKGMpOyB9XG4gICAgICAgIHJldHVybiBwO1xuICAgICAgfSwgW10pO1xuXG4gICAgICAvLyBidWlsZHMgdGhlIGFjdHVhbCBzcGVjdHJhXG4gICAgICBtYXRjaCA9IHJlZ0V4U3BlY3RyYS5leGVjKGJsb2Nrc1syXSk7XG4gICAgICBzcGVjdHJhLnNwZWN0cnVtID0gJyc7XG4gICAgICBzcGVjdHJhLmFjY3VyYXRlID0gdHJ1ZTtcblxuICAgICAgd2hpbGUgKG1hdGNoICE9IG51bGwpIHtcbiAgICAgICAgZm91bmRCbG9ja3MgPSB0cnVlO1xuXG4gICAgICAgIHNwZWN0cmEuc3BlY3RydW0gPSBzcGVjdHJhLnNwZWN0cnVtICsgJyAnICsgbWF0Y2hbMV0gKyAnOicgKyBtYXRjaFsyXTtcblxuICAgICAgICAvLyB1c2VkIHRvIGRldGVybWluZSBpZiB0aGlzIGlzIGFuIGFjY3VyYXRlIG1hc3Mgc3BlY3RyYSBvciBub3RcbiAgICAgICAgaWYgKCFyZWdFeEFjY3VyYXRlTWFzcy50ZXN0KG1hdGNoWzFdKSkge1xuICAgICAgICAgIHNwZWN0cmEuYWNjdXJhdGUgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaFszXSkge1xuICAgICAgICAgIHNwZWN0cmEubWV0YS5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMudHJpbShtYXRjaFszXSkucmVwbGFjZSgvKF5cInxcIiQpL2csICcnKSxcbiAgICAgICAgICAgIHZhbHVlOiBtYXRjaFsxXSxcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnYW5ub3RhdGlvbidcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGdldCB0aGUgbmV4dCBtYXRjaFxuICAgICAgICBtYXRjaCA9IHJlZ0V4U3BlY3RyYS5leGVjKGJsb2Nrc1syXSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGFzc2lnbiB0aGUgdHJpbW1lZCBzcGVjdHJhXG4gICAgICBzcGVjdHJhLnNwZWN0cnVtID0gdGhpcy50cmltKHNwZWN0cmEuc3BlY3RydW0pO1xuXG4gICAgICAvLyBtYWtlIHN1cmUgd2UgaGF2ZSBhdCBsZWFzdCBhIHNwZWN0cnVtIGFuZCBhIG5hbWVcbiAgICAgIGlmIChzcGVjdHJhLnNwZWN0cnVtICE9IG51bGwgJiYgc3BlY3RyYS5uYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIGludm9rZSB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgY2FsbGJhY2soc3BlY3RyYSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjaygnVEhJUyBJUyBBIFRFU1QnKTtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignaW52YWxpZCBzcGVjdHJhIGZvdW5kIC0+IGlnbm9yZWQnKTtcbiAgICAgIH1cblxuICAgICAgLy8gZmV0Y2ggdGhlIG5leHQgbWF0Y2hpbmcgYmxvY2tcbiAgICAgIGJsb2NrcyA9IGJsb2NrUmVnRXguZXhlYyhidWYpO1xuICAgIH1cblxuICAgIHJldHVybiBmb3VuZEJsb2NrcztcbiAgfVxuXG4gIC8qKlxuICAgKiBjb252ZXJ0cyB0aGUgZGF0YSB1c2luZyBhIGNhbGxiYWNrXG4gICAqL1xuICBjb252ZXJ0RnJvbURhdGEgPSAoZGF0YSwgY2FsbGJhY2spID0+IHtcbiAgICByZXR1cm4gdGhpcy5jb252ZXJ0V2l0aENhbGxiYWNrKGRhdGEsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBjb3VudHMgdGhlIG51bWJlciBvZiBtYXNzIHNwZWN0cmEgaW4gdGhpcyBsaWJyYXJ5IGZpbGVcbiAgICovXG4gIGNvdW50U3BlY3RyYSA9IChkYXRhKSA9PiB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBsZXQgcG9zID0gMDtcblxuICAgIHdoaWxlIChwb3MgIT09IC0xKSB7XG4gICAgICBjb3VudCsrO1xuICAgICAgcG9zID0gZGF0YS5pbmRleE9mKCdOdW0gUGVha3MnLCBwb3MgKyAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY291bnQ7XG4gIH1cbn1cbiJdfQ==