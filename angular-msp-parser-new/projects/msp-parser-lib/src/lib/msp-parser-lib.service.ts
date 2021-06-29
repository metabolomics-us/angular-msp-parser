import { Injectable, Inject } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {NGXLogger} from "ngx-logger";

@Injectable({
  providedIn: 'root'
})
export class MspParserLibService {
  constructor(@Inject(HttpClient) private http: HttpClient, @Inject(NGXLogger) private logger: NGXLogger) { }

  /**
   * parses the name field content and modifies the spectra object accordingly
   * @param value
   * @param spectra
   * @returns {*}
   */
  handleName = (value, spectra) => {
    //check if we have a Retention Index in the name field
    let nameMatch = /(.+)_RI(.*)/.exec(value);
    let nameCombinedWithInstruments = /\s*([:\w\d\s-]+);/.exec(value);

    if (nameMatch) {
      //sets the new name
      spectra.names.push(this.trim(nameMatch[1]));

      //adds it as retention index
      spectra.meta.push(
        {name: 'Retention Index', value: this.trim(nameMatch[2]), category: this.findCategory('Retention Index')}
      )
    }
      //else if (nameCombinedWithInstruments) {
      //    spectra.names.push(trim(nameCombinedWithInstruments[1]));
    //}
    else {
      spectra.names.push(this.trim(value));
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
  handleMetaDataField = (value, spectra, regex, category) => {
    if (!category) {
      category = "none"
    }

    let extractValue = regex;
    let match = extractValue.exec(value);

    while (match != null) {
      let name = this.trim(match[1]);
      let parsedValue = this.trim(match[2]);

      if (this.ignoreField(name, parsedValue) == false) {
        spectra.meta.push({name: name, value: parsedValue, category: category});
      }
      match = extractValue.exec(value);
    }

    return spectra;
  }

  /**
   * simple trimming function
   * @param str
   */
  trim = (str) => {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/^"(.*)"$/, '$1');
  }

  /**
   * inspects our metadata fields and does additional modifications, as required
   * @param match
   * @param spectra
   * @returns {*}
   */
  inspectFields = (match, spectra) => {
    let regexInchIKey = /.*([A-Z]{14}-[A-Z]{10}-[A-Z,0-9])+.*/;
    //var regexSmiles = /^([^J][0-9BCOHNSOPrIFla@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
    let regexSmiles = /^([^J][0-9A-Za-z@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;

    //if we contain an inchi key in any propterty of this field
    if (regexInchIKey.exec(match[2])){
      spectra.inchiKey = regexInchIKey.exec(match[2])[1];
    }

    //get an inchi
    else if (match[1].toLowerCase() == 'inchi' || match[1].toLowerCase() == 'inchicode' || match[1].toLowerCase() == 'inchi code') {
      spectra.inchi = this.trim(match[2]);
    }

    //get an inchi from a smile
    else if (match[1].toLowerCase() == 'smiles' && regexSmiles.exec(match[2])) {
      spectra.smiles = regexSmiles.exec(match[2])[1];
    }

    //comment fields have quite often additional infomation in them
    else if (match[1].toLowerCase() === 'comment') {
      spectra = this.handleMetaDataField(match[2], spectra, /(\w+)\s*=\s*([0-9]*\.?[0-9]+)/g, undefined);
    }

    //can contain a lot of different id's in case of massbank generated msp files
    else if (match[1].toLowerCase() === 'searchid') {
      spectra = this.handleMetaDataField(match[2], spectra, /(\w+\s?\w*)+:\s*([\w\d]+[ \w\d-]+)/g, "Database Identifier");
    }

    //this mass bank special flag provides some derivatization information
    else if (match[1].toLowerCase() === 'ms$focused_ion') {
      spectra = this.handleMetaDataField(match[2], spectra, /\s*(.+):(.+)/g, "Derivatization");
    }

    //any other metadata field
    else {
      let name = match[1];
      let value = match[2];

      if (this.ignoreField(name, value) == false) {
        //assign metadata
        spectra.meta.push(
          {
            name: name,
            value: value,
            category: this.findCategory(name)
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
  findCategory = (name) => {
    let category = "none";
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
  ignoreField = (name, value) => {
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
  convertWithCallback = (data, callback) => {
    this.logger.debug("starting with parsing new data set...");

    /**
     * checks for a complete block of msp data.
     * @type {RegExp}
     */
    let blockRegEx = /((?:.*:\s*[^\n]*\n?)+)\n((?:\s*[0-9]*\.?[0-9]+\s+[0-9]*\.?[0-9]+[;\n]?.*\n?)+)/g;

    /**
     * extracts the attribures like 'name' and 'value' from a found line
     * @type {RegExp}
     */
    let regExAttributes = /\s*([a-zA-Z _$\/]+):(.+)\s/g;

    /**
     * first block captures meta data
     * second block caputures spectra including floats
     * optional third block are identifications of this ion
     * @type {RegExp}
     */
    let regExSpectra = /([0-9]+\.?[0-9]*)[ \t]+([0-9]*\.?[0-9]+)(?:\s*(?:[;\n])|(?:"?(.+)"?\n?))?/g;
    //regExSpectra = /([0-9]*\.?[0-9]+)[ \t]+([0-9]*\.?[0-9]+)(?:\s*(.*)\n?)?/g;
    //regExSpectra = /([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)(?:\s*"?(.*)"?\n)?;?/g;

    /**
     * is this an accurate mass
     * @type {RegExp}
     */
    let regExAccurateMass = /([0-9]*\.?[0-9]{3,})/;

    let buf = data.toString('utf8');

    let blocks = blockRegEx.exec(buf);

    //return code
    let foundBlocks = false;

    //go over all available blocks
    while (blocks != null) {
      //contains the resulting spectra object
      let spectra = {meta: [], names: []};

      //parse the first block and assign
      let current = blocks[0];
      let match = regExAttributes.exec(current);

      //builds our metadata object
      while (match != null) {
        match[1] = this.trim(match[1]);
        match[2] = this.trim(match[2]);

        if (match[1].toLowerCase() === 'name' || match[1].toLowerCase() === 'synon') {
          //in case there are RI encoded we extract this information
          spectra = this.handleName(match[2], spectra);
        } else {
          spectra = this.inspectFields(match, spectra);
        }

        match = regExAttributes.exec(current);
      }

      // keep only unique names
      spectra["names"] = spectra["names"].reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
      }, []);

      //builds the actual spectra
      match = regExSpectra.exec(blocks[2]);
      spectra["spectrum"] = "";
      spectra["accurate"] = true;

      while (match != null) {
        foundBlocks = true;

        spectra["spectrum"] = spectra["spectrum"] + " " + match[1] + ":" + match[2];

        //used to determine if this is an accurate mass spectra or not
        if (!regExAccurateMass.test(match[1])) {
          spectra["accurate"] = false;
        }

        if (match[3]) {
          spectra["meta"].push({
            name: this.trim(match[3]).replace(/(^"|"$)/g, ''),
            value: match[1],
            category: 'annotation'
          });
        }

        //get the next match
        match = regExSpectra.exec(blocks[2]);
      }

      //assign the trimmed spectra
      spectra["spectrum "]= this.trim(spectra["spectrum"]);

      //make sure we have at least a spectrum and a name
      if (spectra["spectrum"] != null && spectra.names.length > 0) {
        //invoke the callback function
        callback(spectra);
      } else {
        this.logger.warn('invalid spectra found -> ignored');
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
  convertFromData = (data, callback) => {
    return this.convertWithCallback(data, callback);
  };

  /**
   * counts the number of mass spectra in this library file
   * @param data
   * @returns {number}
   */
  countSpectra = (data) => {
    let count = 0;
    let pos = -1;

    while ((pos = data.indexOf('Num Peaks', pos + 1)) != -1) {
      count++;
    }

    return count;
  };
}