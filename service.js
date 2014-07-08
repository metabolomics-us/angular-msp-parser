/**
 * Created by Gert on 6/16/2014.
 */
'use strict';

angular.module('wohlgemuth.msp.parser', []).
    service('gwMspService', function ($log, $filter) {

        //reference to our service
        var self = this;

        /**
         * parses the name field content and modifies the spectra object accordingly
         * @param value
         * @param spectraObject
         * @returns {*}
         */
        function handleName(value, spectra) {

            //check if we have a Retention Index in the name field
            var nameMatch = /(.+)_RI(.*)/.exec(value);
            if (nameMatch) {
                //sets the new name
                spectra.name = trim(nameMatch[1]);

                //adds it as retention index
                spectra.meta.push(
                    {name: 'Retention Index', value: trim(nameMatch[2])}
                )
            }
            else {
                spectra.name = trim(value);
            }

            return spectra
        }

        /**
         * handles a given metadata field and might does additional modifcations
         * @param value
         * @param spectra
         * @returns {*}
         */
        function handleMetaDataField(value, spectra) {
            var extractValue = /(\w+)\s*=\s*([0-9]*\.?[0-9]+)/g;
            var match = extractValue.exec(value);

            while (match != null) {

                spectra.meta.push(
                    {
                        name: trim(match[1]), value: trim(match[2])
                    }
                );
                match = extractValue.exec(value);
            }
            return spectra;
        }

        /**
         * simple trimming function
         */
        function trim(str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
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
            var regExAttributes = /\s*([a-zA-Z ]+):(.+)\s/g;

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
                var spectra = {meta: [], annotations: []};

                //parse the first block and assign
                var current = blocks[0];
                var match = regExAttributes.exec(current);

                //builds our metadata object
                while (match != null) {

                    if (match[1].toLowerCase() === 'name') {
                        //in case there are RI encoded we extract this information
                        spectra = handleName(match[2], spectra);
                    }
                    else {
                        if (match[1].toLowerCase() === 'comment') {
                            spectra = handleMetaDataField(match[2], spectra);
                        }
                        else {
                            //assign metadata
                            spectra.meta.push(
                                {name: trim(match[1]), value: trim(match[2])}
                            )
                        }
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

                    if(angular.isDefined(match[3])){
                        spectra.meta.push({name: trim(match[3]), value:match[1], category:'annotation'});
                    }

                    //get the next match
                    match = regExSpectra.exec(current);
                }

                //assign the trimmed spectra
                spectra.spectrum = trim(spectra.spectrum);

                //make sure we have at least a spectrum and a name
                if (spectra.spectrum != null && spectra.name != null) {
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
         * reads the given file and try's to convert the data from it to spectra, the callback method is going to take care of the details
         * @param file
         * @param callback
         */
        this.convertFromFile = function (file, callback) {

            //if it's an arry, recrusive approach
            if (angular.isArray(file)) {
                for (var i = 0; i < file.length; i++) {
                    self.convertFromFile(file[i], callback);
                }
            }
            //otherwise just convert it
            else {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var data = e.target.result;
                    self.convertWithCallback(data, callback);
                };

                reader.readAsText(file);
            }
        };

        this.convertFromData = function (data, callback) {
            return this.convertWithCallback(data, callback);
        }
    });