/**
 * Created by Gert on 6/16/2014.
 */
'use strict';

angular.module('wohlgemuth.msp.parser', []).
    service('gwMspService', function () {

        //reference to our service
        var self = this;

        /**
         * converts the data using a callback
         * @param data
         * @param callback
         */
        this.convertWithCallback = function (data, callback) {
            //trim white spaces
            var trim = function (str) {
                return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            };

            //console.log(data);
            //contains our result
            var result = [];

            //defines the complete block of a msp object
            var blockRegEx = /((?:[\w\s]+:\s*[^\n]*\n?)+)\n((?:\s*\d+\s+\d+;\n?)+)/g;

            //regular expression for getting the attributes
            var regEx = /\s*(\w+):(.+)\s/g;

            //regular expression to extract the spectra
            var regExSpectra = /(\d+)\s+(\d+);/g;

            var buf = data.toString('utf8');

            var blocks = blockRegEx.exec(buf);

            //go over all available blocks
            while (blocks != null) {

                //contains the resulting spectra object
                var spectra = {meta: []};

                //parse the first block and assign
                var current = blocks[0];
                var match = regEx.exec(current);

                //builds our metadata object
                while (match != null) {

                    if (match[1].toLowerCase() === 'name') {
                        //in case there are RI encoded we extract this information
                        var nameMatch = /(.+)_RI(.*)/.exec(match[2]);
                        if (nameMatch) {
                            spectra.name = trim(nameMatch[1]);

                            spectra.meta.push({name: 'fiehnRi', value: trim(nameMatch[1])})
                        }
                        else {
                            spectra.name = trim(match[2]);
                        }
                    }
                    else {
                        //assign metadata
                        spectra.meta.push({name: trim(match[1]), value: trim(match[2])})
                    }

                    match = regEx.exec(current);
                }

                //builds the actual spectra
                match = regExSpectra.exec(current);
                spectra.spectrum = "";
                while (match != null) {
                    spectra.spectrum = spectra.spectrum + " " + match[1] + ":" + match[2];
                    match = regExSpectra.exec(current);
                }

                //assign the trimmed spectra
                spectra.spectrum = trim(spectra.spectrum);

                //make sure we have at least a spectrum and a name
                if (spectra.spectrum != null && spectra.name != null) {
                    callback(spectra);
                }
                else {
                    console.log('invalid spectra found -> ignored');
                }

                //fetch the next matching block
                blocks = blockRegEx.exec(buf);
            }
        };

        /**
         * converts the given data to an array of spectra objects and it's just a convinience method
         * @param data
         * @returns {*}
         */
        this.convertToArray = function (data) {
            if (angular.isDefined(data)) {

                var result = [];

                this.convertWithCallback(data, function (spectra) {
                    result.push(spectra);
                });


                return result;

            }
            else {
                return [];
            }
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
                    self.convertWithCallback(data,callback);
                };

                reader.readAsText(file);
            }
        }
    });