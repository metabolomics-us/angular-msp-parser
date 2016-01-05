/**
 * Created by Gert on 6/16/2014.
 */
describe('gwMspService test', function () {
    describe('when I call gwMspService.convert', function () {
        beforeEach(module('wohlgemuth.msp.parser'));

        it('should return one spectra for the given test file with 1 spectra in it', inject(function (gwMspService, $filter) {
            var data =
                "Name: glutamate_RI 528609 \n" +
                "Synon: ##chromatogram=060121bylcs01 \n" +
                "Formula: n/a \n" +
                "CASNO: 56860 \n" +
                "ID: 483 \n" +
                "Comment: fiehn \n" +
                "Num peaks: 151 \n" +
                "85   78;  86   52;  87   24;  88   15;  89   18; \n" +
                "90    4;  91    3;  92    2;  93    6;  94    2; \n" +
                "95   11;  96    8;  97    9;  98   39;  99   33; \n" +
                "100  308; 101   64; 102   32; 103   52; 104    7; \n" +
                "105   12; 106    1; 107    1; 108    1; 110    7; \n" +
                "111    3; 112   45; 113   42; 114   70; 115   65; \n" +
                "116   28; 117   52; 118   11; 119   19; 120    2; \n" +
                "121    1; 124    2; 125    1; 126    8; 127    5; \n" +
                "128  928; 129  191; 130   81; 131   83; 132   60; \n" +
                "133  191; 134   32; 135   20; 136    2; 139    2; \n" +
                "140  101; 141   15; 142   13; 143   10; 144   11; \n" +
                "145    6; 146    6; 147  558; 148   99; 149  143; \n" +
                "150   20; 151    9; 152    1; 153    1; 154    8; \n" +
                "155    9; 156  498; 157   84; 158   93; 159   19; \n" +
                "160    9; 161    4; 162    2; 163    8; 164    1; \n" +
                "168    4; 169    2; 170    3; 171    1; 172   11; \n" +
                "173    5; 174   18; 175    4; 176    3; 177    5; \n" +
                "178    1; 182    1; 183    1; 184    3; 185    1; \n" +
                "186    5; 187    2; 188    8; 189    8; 190    4; \n" +
                "191    3; 192    1; 193    1; 198    2; 199    1; \n" +
                "200    2; 201    1; 202   20; 203   13; 204   53; \n" +
                "205   13; 206    5; 207    2; 214   21; 215    5; \n" +
                "216   10; 217    2; 218   56; 219   14; 220    5; \n" +
                "221   20; 222    4; 223    2; 228    3; 229    3; \n" +
                "230  187; 231   42; 232   21; 233    3; 244    4; \n" +
                "245   16; 246  999; 247  222; 248   94; 249   15; \n" +
                "250    3; 258   30; 259    7; 260    4; 272    1; \n" +
                "273    2; 274   11; 275    3; 276    1; 320   10; \n" +
                "321    3; 322    1; 332    1; 347    1; 348   42; \n" +
                "349   15; 350    7; 351    1; 363   17; 364    6; \n" +
                "365    2; \n";

            var result = gwMspService.convertFromData(data, function(result) {
                // console.log($filter('json')(result));

                expect(result.names[0]).toEqual('glutamate');
                expect(result.meta.length).toEqual(4);
                expect(result.accurate).toBeFalsy();
                expect(result.spectrum.split(' ').length).toEqual(151);
            });

            expect(result).toBeTruthy();
        }));

        it('should return one spectra for the given test file with 1 spectra in it, which contains double values as spectra object', inject(function (gwMspService, $log, $q, $filter) {
            var data =
                "NAME: 1,2-Dithiane-4,5-diol-S-oxide \n" +
                "PRECURSORMZ: 168.9988 \n" +
                "INSTRUMENTTYPE: QqQ/triple quadrupole \n" +
                "INSTRUMENT: Micromass Quattro Micro \n" +
                "COLLISIONENERGY: 3 \n" +
                "COLLISIONGAS: Ar \n" +
                "FORMULA: C4H8O3S2 \n" +
                "RETENTIONTIME: -1 \n" +
                "IONMODE: P \n" +
                "IN-SOURCEVOLTAGE: 20 \n" +
                "Num Peaks: 7 \n" +
                "85.4	3.14 \n" +
                "86.6	1.86 \n" +
                "87.1	18.6 \n" +
                "87.6	1.38 \n" +
                "133.3	4.96 \n" +
                "151.2	7.96 \n" +
                "169.2	999 \n";


            var result = gwMspService.convertFromData(data, function (result) {
                // console.log($filter('json')(result));

                expect(result.names[0]).toEqual('1,2-Dithiane-4,5-diol-S-oxide');
                expect(result.meta.length).toEqual(9);
                expect(result.accurate).toBeFalsy();
                expect(result.spectrum.split(' ').length).toEqual(7);
            });

            expect(result).toBeTruthy();
        }));

        it('should return one spectra for the given test file with 1 spectra in it, which contains an spectrum from Arpana\'s MS/MS library', inject(function (gwMspService, $log, $q, $filter) {
            var data =
                "Name: Carnosic Acid\n" +
                "InChI: InChI=1S/C20H28O4/c1-11(2)13-10-12-6-7-14-19(3,4)8-5-9-20(14,18(23)24)15(12)17(22)16(13)21/h10-11,14,21-22H,5-9H2,1-4H3,(H,23,24)/t14-,20+/m0/s1\n" +
                "InChIKey: QRYRORQUOLYVBU-VBKZILBWSA-N\n" +
                "Molecular Formula: C20H28O4\n" +
                "Exact Mass: 332.1987488\n" +
                "Instrument: Thermo Finnigan LTQ\n" +
                "Instrument Type: Linear Ion Trap\n" +
                "Ion Source: ESI Ion Max\n" +
                "Capillary Temperature: 275 C\n" +
                "Source Voltage: 3.50 kV\n" +
                "Sample Introduction: Direct Infusion\n" +
                "Collision Energy: 35%\n" +
                "Raw Data File: NP_C1_102_p2_E11_POS_iTree_14.raw\n" +
                "Ion Mode: Positive\n" +
                "Precursor Type: [M+K]+\n" +
                "NumScansAveraged: 39\n" +
                "PrecursorMZ: 371.07\n" +
                "Num Peaks: 11\n" +
                "184.970665 30.729010; 313.005361 16.370305; 327.068559 2393.361486; 329.050559 15.778810;\n" +
                "343.090702 32.622264; 344.077607 12.669677; 353.073218 24.342673; 355.086382 17.221813;\n" +
                "356.084138 41.796034; 357.067589 24.117027; 371.083264 13.116330;"


            var result = gwMspService.convertFromData(data, function (result) {
                // console.log($filter('json')(result));

                expect(result.names[0]).toEqual('Carnosic Acid');
                expect(result.meta.length).toEqual(14);
                expect(result.accurate).toBeTruthy();
                expect(result.spectrum.split(' ').length).toEqual(11);
            });

            expect(result).toBeTruthy();
        }));

        it('should return one spectra for the given test file with 1 spectra in it, which contains double values as spectra object and is an accurate mass spectra', inject(function (gwMspService, $log, $q, $filter) {
            var data =
                "Name: 18:3 Cholesteryl ester; [M+H]+\n" +
                "MW: 646.56888\n" +
                "PRECURSORMZ: 664.60325\n" +
                "RETENTIONTIME: 9.98500\n" +
                "FORMULA: C45H74O2\n" +
                "Comment: Parent=664.60325 Mz_exact=646.56888 ; C45H74O2; [M+NH4]+\n" +
                "Num Peaks: 7\n" +
                "664.60325 100 \"[M+NH4]\"\n" +
                "646.56888 50 \"[M+H]-H2O\"\n" +
                "369.35213 999 \"Sterol Fragments\"\n" +
                "175.14868 200 \"C13H19\"\n" +
                "161.13303 200 \"C12H17\"\n" +
                "147.11738 200 \"C11H15\"\n" +
                "135.11738 200 \"C10H15\"\n";

            var result = gwMspService.convertFromData(data, function (result) {
                // console.log($filter('json')(result));

                expect(result.names[0]).toEqual('18:3 Cholesteryl ester; [M+H]+');
                expect(result.meta.length).toEqual(13);
                expect(result.accurate).toBeTruthy();
                expect(result.spectrum.split(' ').length).toEqual(7);
            });

            expect(result).toBeTruthy();
        }));

        it('should return one spectra for the given test file with 1 spectra in it, which contains double values as spectra object and is an accurate mass spectra and have external ids', inject(function (gwMspService, $log, $q, $filter) {
            var data =
                "NAME: Metamitron-desamino; LC-ESI-ITFT; MS2; CE: 35%; R=7500; [M+H]+\n" +
                "PRECURSORMZ: 188.0818\n" +
                "INSTRUMENTTYPE: LC-ESI-ITFT\n" +
                "INSTRUMENT: LTQ Orbitrap XL Thermo Scientific\n" +
                "License: CC BY-SA\n" +
                "COLLISIONENERGY: 35 % (nominal)\n" +
                "FORMULA: C10H9N3O1\n" +
                "RETENTIONTIME: -1\n" +
                "IONMODE: P\n" +
                "SearchID: MassBank: EA000401; KEGG: ; CAS: CAS 36993-94-9; ChemSpider: 157884; PubChem CID: 181502; PubChem SID:\n" +
                "Num Peaks: 7\n" +
                "77.0385	5\n" +
                "85.0396	17\n" +
                "104.0495	75\n" +
                "119.0604	132\n" +
                "147.0555	3\n" +
                "160.0871	999\n" +
                "188.082	86\n";

            var result = gwMspService.convertFromData(data, function (result) {
                // console.log($filter('json')(result));

                expect(result.names[0]).toEqual('Metamitron-desamino; LC-ESI-ITFT; MS2; CE: 35%; R=7500; [M+H]+');
                expect(result.meta.length).toEqual(12);
                expect(result.accurate).toBeTruthy();
                expect(result.spectrum.split(' ').length).toEqual(7);
            });

            expect(result).toBeTruthy();
        }));

        it('should properly parse the spectrum', inject(function (gwMspService, $log, $q, $filter) {
            var data =
                "Name: C4\n"+
                "RI: 262214\n"+
                "BinId: 21\n"+
                "Column:Restek corporation Rtx-5Sil MS (30 m length x 0.25 mm internal diameter with 0.25 µm film made of 95% dimethyl/5%diphenylpolysiloxane)\n"+
                "Guard Column:10m\n"+
                "Mobile phase:Helium\n"+
                "Column temperature:50-330°C\n"+
                "Flow-rate:1 mL min-1\n"+
                "Injection volume:0.5 µL\n"+
                "Injection:25 splitless time into a multi-baffled glass liner\n"+
                "Injection temperature:50°C ramped to 250°C by 12°C s-1\n"+
                "Oven temperature:50°C for 1 min, then ramped at 20°C min-1 to 330°C, held constant for 5 min.\n"+
                "Mass Resolution:17 spectra/s\n"+
                "scan range m/z:80-500 Da\n"+
                "ionization energy:-70 eV\n"+
                "Detector Voltage:1800V\n"+
                "Ion Source Temperature:250C\n"+
                "Transfer Line Temperature:230C\n"+
                "Instrument:Leco Pegasus IV\n"+
                "Instrument Type:GC-EI-TOF\n"+
                "ion mode:positive\n"+
                "ms type:MS\n"+
                "data processing:BinBase\n"+
                "data processing:WHOLE ChromaTOF ver. 4.x\n"+
                "Num Peaks: 44\n"+
                "74    107551.0;41    99280.0;43    98474.0;71    55655.0;39    33844.0;\n"+
                "59    31302.0;42    22529.0;87    21425.0;55    17454.0;45    7495.0;38    5408.0;\n"+
                "60    4769.0;40    4714.0;72    1974.0;30    1771.0;31    1697.0;33    1335.0;\n"+
                "102    1260.0;37    675.0;101    494.0;58    265.0;88    177.0;86    157.0;\n"+
                "47    154.0;77    128.0;48    127.0;76    121.0;112    97.0;54    88.0;\n"+
                "100    67.0;84    41.0;61    16.0;155    13.0;220    13.0;236    11.0;\n"+
                "371    11.0;351    9.0;160    8.0;330    4.0;180    3.0;260    2.0;\n"+
                "169    1.0;201    1.0;451    1.0;\n";

            var result = gwMspService.convertFromData(data, function (result) {
                // console.log($filter('json')(result));

                expect(result.names[0]).toEqual('C4');
                expect(result.meta.length).toBe(23);
                expect(result.accurate).toBeFalsy();
                expect(result.spectrum.split(' ').length).toEqual(44);
            });

            expect(result).toBeTruthy();
        }));
    });
});