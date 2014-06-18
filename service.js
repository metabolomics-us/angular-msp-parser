/**
 * Created by Gert on 6/16/2014.
 */

angular.module('wohlgemuth.msp.parser', []).
	service('gwMspService', function () {

		/**
		 * converts the given data to an array of spectra
		 * @param data
		 * @parm spectraModificationCallBack a function taking a spectra object and returning the given object with
		 * @returns {*}
		 */
		this.convert = function (data, spectraModificationCallBack) {
			if (angular.isDefined(data)) {

				//trim white spaces
				var trim = function (str) {
					return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
				};

				//console.log(data);
				//contains our result
				var result = [];

				var spectra = {meta: []};

				//regular expression for getting the attributes
				var regEx = /\s*(\w+):(.+)\s/g;

				//regular expression to extract the spectra
				var regExSpectra = /(\d+)\s+(\d+);/g;

				var buf = data.toString('utf8');

				var match = regEx.exec(buf);

				//builds our metadata object
				while (match != null) {
					console.log(match[1] + ' - ' + match[2]);

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

					match = regEx.exec(buf);
				}

				//builds the actual spectra
				match = regExSpectra.exec(buf);
				spectra.spectrum = "";
				while (match != null) {
					spectra.spectrum = spectra.spectrum + " " + match[1] + ":" + match[2];
					match = regExSpectra.exec(buf);
				}

				//assign the trimmed spectra
				spectra.spectrum = trim(spectra.spectrum);

				//make sure we have at least a spectrum and a name
				if (spectra.spectrum != null && spectra.name != null) {
					//modify the resulting spectra object with our callback
					if (angular.isDefined(spectraModificationCallBack)) {
						spectra = spectraModificationCallBack(spectra);
					}

					//add the spectra to the array
					result.push(spectra);
				}
				else{
					console.log('invalid spectra found -> ignored');
				}
				return result;

			}
			else {
				return [];
			}
		}
	});