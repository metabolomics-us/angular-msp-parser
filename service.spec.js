/**
 * Created by Gert on 6/16/2014.
 */
describe('gwMspService test', function () {

	describe('when I call gwMspService.convert', function () {
		beforeEach(module('wohlgemuth.msp.parser'));


		it('should return an empty array', inject(function (gwMspService) {

			expect(gwMspService.convert()).toEqual([]);
		}));




		it('should return one spectra for the given data', inject(function (gwMspService) {

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

			var result = gwMspService.convert(data);

			console.log(result);
			expect(result.length).toEqual(1);

			console.log(result[0].name);
			expect(result[0].name).toEqual('glutamate');
			expect(result[0].meta);
		}))

	})

});