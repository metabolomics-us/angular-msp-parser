import { HttpClient } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import * as i0 from "@angular/core";
export declare class MspParserLibService {
    private http;
    private logger;
    constructor(http: HttpClient, logger: NGXLogger);
    /**
     * parses the name field content and modifies the spectra object accordingly
     */
    handleName: (value: any, spectra: any) => any;
    /**
     * handles a given metadata field and might does additional modifications
     */
    handleMetaDataField: (value: any, spectra: any, regex: any, category: any) => any;
    /**
     * simple trimming function
     */
    trim: (str: any) => any;
    /**
     * inspects our metadata fields and does additional modifications, as required
     */
    inspectFields: (match: any, spectra: any) => any;
    /**
     * finds the related category for the given name, Will be an additional module at a later point TODO
     */
    findCategory: (name: any) => string;
    /**
     * ignores a given field, if a certain value is not as exspected. Will be an additional module at a later point TODO
     */
    ignoreField: (name: any, value: any) => boolean;
    /**
     * converts the data using a callback
     */
    convertWithCallback: (data: any, callback: any) => boolean;
    /**
     * converts the data using a callback
     */
    convertFromData: (data: any, callback: any) => boolean;
    /**
     * counts the number of mass spectra in this library file
     */
    countSpectra: (data: any) => number;
    static ɵfac: i0.ɵɵFactoryDef<MspParserLibService, never>;
    static ɵprov: i0.ɵɵInjectableDef<MspParserLibService>;
}
//# sourceMappingURL=msp-parser-lib.service.d.ts.map