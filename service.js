/**
 * Created by Gert on 6/16/2014.
 */
'use strict';

angular.module('wohlgemuth.msp.parser', []).
    service('gwMspService', function ($log) {
        /**
         * parses the name field content and modifies the spectra object accordingly
         * @param value
         * @param spectra
         * @returns {*}
         */
        function handleName(value, spectra) {
            //check if we have a Retention Index in the name field
            var nameMatch = /(.+)_RI(.*)/.exec(value);
            var nameCombinedWithInstruments = /\s*([:\w\d\s-]+);/.exec(value);

            if (nameMatch) {
                //sets the new name
                spectra.names.push(trim(nameMatch[1]));

                //adds it as retention index
                spectra.meta.push(
                    {name: 'Retention Index', value: trim(nameMatch[2]), category: findCategory('Retention Index')}
                )
            }
            //else if (nameCombinedWithInstruments) {
            //    spectra.names.push(trim(nameCombinedWithInstruments[1]));
            //}
            else {
                spectra.names.push(trim(value));
            }

            return spectra;
        }

        /**
         * handles a given metadata field and might does additional modifications
         * @param value
         * @param spectra
         * @param regex regular expression, must provide 2 groups!
         * @param category
         * @returns {*}
         */
        function handleMetaDataField(value, spectra, regex, category) {
            if (angular.isUndefined(category)) {
                category = "none"
            }

            var extractValue = regex;
            var match = extractValue.exec(value);

            while (match != null) {
                var name = trim(match[1]);
                var parsedValue = trim(match[2]);

                 if (ignoreField(name, parsedValue) == false) {
                    spectra.meta.push({name: name, value: parsedValue, category: category });
                }
                match = extractValue.exec(value);
            }

            return spectra;
        }

        /**
         * simple trimming function
         * @param str
         */
        function trim(str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/^"(.*)"$/, '$1');
        }

        /**
         * inspects our metadata fields and does additional modifications, as required
         * @param match
         * @param spectra
         * @returns {*}
         */
        function inspectFields(match, spectra) {
            var regexInchIKey = /.*([A-Z]{14}-[A-Z]{10}-[A-Z,0-9])+.*/;
            //var regexSmiles = /^([^J][0-9BCOHNSOPrIFla@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
            var regexSmiles = /^([^J][0-9A-Za-z@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;

            //if we contain an inchi key in any propterty of this field
            if(regexInchIKey.exec(match[2])){
                spectra.inchiKey = regexInchIKey.exec(match[2])[1];
            }

            //get an inchi
            else if(match[1].toLowerCase() == 'inchi' || match[1].toLowerCase() == 'inchicode' || match[1].toLowerCase() == 'inchi code') {
                spectra.inchi = trim(match[2]);
            }

            //get an inchi from a smile
            else if(match[1].toLowerCase() == 'smiles' && regexSmiles.exec(match[2])){
                spectra.smiles = regexSmiles.exec(match[2])[1];
            }

            //comment fields have quite often additional infomation in them
            else if (match[1].toLowerCase() === 'comment') {
                spectra = handleMetaDataField(match[2], spectra, /(\w+)\s*=\s*([0-9]*\.?[0-9]+)/g);
            }

            //can contain a lot of different id's in case of massbank generated msp files
            else if (match[1].toLowerCase() === 'searchid') {
                spectra = handleMetaDataField(match[2], spectra, /(\w+\s?\w*)+:\s*([\w\d]+[ \w\d-]+)/g, "Database Identifier");
            }

            //this mass bank special flag provides some derivatization information
            else if (match[1].toLowerCase() === 'ms$focused_ion') {
                spectra = handleMetaDataField(match[2], spectra, /\s*(.+):(.+)/g, "Derivatization");
            }

            //any other metadata field
            else {
                var name = match[1];
                var value = match[2];

                if (ignoreField(name, value) == false) {
                    //assign metadata
                    spectra.meta.push(
                        {
                            name: name,
                            value: value,
                            category: findCategory(name)
                        }
                    )
                }
            }

            return spectra;
        }

        /**
         * finds the related category for the given name, Will be an additional module at a later point TODO
         * @param name
         */
        function findCategory(name) {
            var category = "none";
            name = name.toLocaleLowerCase();

            //mass spectral properties
            if (name === '') {}

            else if (name === 'num peaks' || name === 'retentionindex' || name === 'retentiontime') {
                category = "spectral properties";
            }

            // acquisition properties
            else if (name === 'instrument' || name === 'instrumenttype' || name == 'ionmode' || name == 'precursormz') {
                category = "acquisition properties";
            }

            return category
        }

        /**
         * ignores a given field, if a certain value is not as exspected. Will be an additional module at a later point TODO
         * @param name
         * @param value
         * @returns {boolean}
         */
        function ignoreField(name, value) {
            if (value.length == 0) {
                return true;
            }

            name = name.toLowerCase();

            if (name == "num peaks" || name == "numpeaks") {
                return true
            } else {
                return false;
            }
        }

        /**
         * converts the data using a callback
         * @param data
         * @param callback
         */
        this.convertWithCallback = function (data, callback) {
            $log.debug("starting with parsing new data set...");

            /**
             * checks for a complete block of msp data.
             * @type {RegExp}
             */
            var blockRegEx = /((?:.*:\s*[^\n]*\n?)+)\n((?:\s*[0-9]*\.?[0-9]+\s+[0-9]*\.?[0-9]+[;\n]?.*\n?)+)/g;

            /**
             * extracts the attribures like 'name' and 'value' from a found line
             * @type {RegExp}
             */
            var regExAttributes = /\s*([a-zA-Z _$\/]+):(.+)\s/g;

            /**
             * first block captures meta data
             * second block caputures spectra including floats
             * optional third block are identifications of this ion
             * @type {RegExp}
             */
            var regExSpectra = /([0-9]*\.?[0-9]+)[ \t]+([0-9]*\.?[0-9]+)(?:.*\"(.*)\"\n)?/g;

            /**
             * is this an accurate mass
             * @type {RegExp}
             */
            var regExAccurateMass = /([0-9]*\.?[0-9]{3,})/;

            var buf = data.toString('utf8');

            var blocks = blockRegEx.exec(buf);

            //return code
            var foundBlocks = false;
            //go over all available blocks

            while (blocks != null) {

                //contains the resulting spectra object
                var spectra = {meta: [], names: []};

                //parse the first block and assign
                var current = blocks[0];
                var match = regExAttributes.exec(current);

                //builds our metadata object
                while (match != null) {
                    if (match[1].toLowerCase() === 'name' || match[1].toLowerCase() === 'synon') {
                        //in case there are RI encoded we extract this information
                        spectra = handleName(match[2], spectra);
                    } else {
                        spectra = inspectFields(match, spectra);
                    }

                    match = regExAttributes.exec(current);
                }

                //builds the actual spectra
                match = regExSpectra.exec(current);
                spectra.spectrum = "";
                spectra.accurate = true;

                while (match != null) {
                    foundBlocks = true;

                    spectra.spectrum = spectra.spectrum + " " + match[1] + ":" + match[2];

                    //used to determine if this is an accurate mass spectra or not
                    if (!regExAccurateMass.test(match[1])) {
                        spectra.accurate = false;
                    }

                    if (angular.isDefined(match[3])) {
                        spectra.meta.push({name: trim(match[3]).replace(/(^"|"$)/g, ''), value: match[1], category: 'annotation'});
                    }

                    //get the next match
                    match = regExSpectra.exec(current);
                }

                //assign the trimmed spectra
                spectra.spectrum = trim(spectra.spectrum);

                //make sure we have at least a spectrum and a name
                if (spectra.spectrum != null && spectra.names.length > 0) {
                    //invoke the callback function
                    callback(spectra);
                }
                else {
                    $log.warn('invalid spectra found -> ignored');
                }

                //fetch the next matching block
                blocks = blockRegEx.exec(buf);
            }

            return foundBlocks;
        };

        /**
         * converts the data using a callback
         * @param data
         * @param callback
         */
        this.convertFromData = function (data, callback) {
            return this.convertWithCallback(data, callback);
        };

        /**
         * counts the number of mass spectra in this library file
         * @param data
         * @returns {number}
         */
        this.countSpectra = function(data) {
            var count = 0;
            var pos = -1;

            while((pos = data.indexOf('Num Peaks', pos + 1)) != -1) {
                count++;
            }

            return count;
        };
    });