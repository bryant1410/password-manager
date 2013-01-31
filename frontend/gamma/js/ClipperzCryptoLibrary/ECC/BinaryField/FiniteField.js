/*

Copyright 2008-2013 Clipperz Srl

This file is part of Clipperz, the online password manager.
For further information about its features and functionalities please
refer to http://www.clipperz.com.

* Clipperz is free software: you can redistribute it and/or modify it
  under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or 
  (at your option) any later version.

* Clipperz is distributed in the hope that it will be useful, but 
  WITHOUT ANY WARRANTY; without even the implied warranty of 
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  See the GNU Affero General Public License for more details.

* You should have received a copy of the GNU Affero General Public
  License along with Clipperz. If not, see http://www.gnu.org/licenses/.

*/

//try { if (typeof(Clipperz.ByteArray) == 'undefined') { throw ""; }} catch (e) {
//	throw "Clipperz.Crypto.ECC depends on Clipperz.ByteArray!";
//}  
if (typeof(Clipperz.Crypto.ECC) == 'undefined') { Clipperz.Crypto.ECC = {}; }
if (typeof(Clipperz.Crypto.ECC.BinaryField) == 'undefined') { Clipperz.Crypto.ECC.BinaryField = {}; }

Clipperz.Crypto.ECC.BinaryField.FiniteField = function(args) {
	args = args || {};
	this._modulus = args.modulus;

	return this;
}

Clipperz.Crypto.ECC.BinaryField.FiniteField.prototype = MochiKit.Base.update(null, {

	'asString': function() {
		return "Clipperz.Crypto.ECC.BinaryField.FiniteField (" + this.modulus().asString() + ")";
	},

	//-----------------------------------------------------------------------------

	'modulus': function() {
		return this._modulus;
	},
	
	//-----------------------------------------------------------------------------

	'_module': function(aValue) {
		var	result;
		var modulusComparison;
//console.log(">>> binaryField.finiteField.(standard)module");
		
		modulusComparison = Clipperz.Crypto.ECC.BinaryField.Value._compare(aValue, this.modulus()._value);

		if (modulusComparison < 0) {
			result = aValue;
		} else if (modulusComparison == 0) {
			result = [0];
		} else {
			var modulusBitSize;
			var resultBitSize;
			
			result = aValue;

			modulusBitSize = this.modulus().bitSize();
			resultBitSize = Clipperz.Crypto.ECC.BinaryField.Value._bitSize(result);
			while (resultBitSize >= modulusBitSize) {
				Clipperz.Crypto.ECC.BinaryField.Value._overwriteXor(result, Clipperz.Crypto.ECC.BinaryField.Value._shiftLeft(this.modulus()._value, resultBitSize - modulusBitSize));
				resultBitSize = Clipperz.Crypto.ECC.BinaryField.Value._bitSize(result);
			}
		}
//console.log("<<< binaryField.finiteField.(standard)module");
		
		return result;
	},
	
	'module': function(aValue) {
		return new Clipperz.Crypto.ECC.BinaryField.Value(this._module(aValue._value.slice(0)));
	},
	
	//-----------------------------------------------------------------------------

	'_add': function(a, b) {
		return Clipperz.Crypto.ECC.BinaryField.Value._xor(a, b);
	},

	'_overwriteAdd': function(a, b) {
		Clipperz.Crypto.ECC.BinaryField.Value._overwriteXor(a, b);
	},
	
	'add': function(a, b) {
		return new Clipperz.Crypto.ECC.BinaryField.Value(this._add(a._value, b._value));
	},
	
	//-----------------------------------------------------------------------------

	'negate': function(aValue) {
		return aValue.clone();
	},

	//-----------------------------------------------------------------------------

	'_multiply': function(a, b) {
		var result;
		var valueToXor;
		var i,c;

		result = [0];
		valueToXor = b;
		c = Clipperz.Crypto.ECC.BinaryField.Value._bitSize(a);
		for (i=0; i<c; i++) {
			if (Clipperz.Crypto.ECC.BinaryField.Value._isBitSet(a, i) === true) {
				Clipperz.Crypto.ECC.BinaryField.Value._overwriteXor(result, valueToXor);
			}
			valueToXor = Clipperz.Crypto.ECC.BinaryField.Value._overwriteShiftLeft(valueToXor, 1);
		}
		result = this._module(result);

		return result;
	},

	'multiply': function(a, b) {
		return new Clipperz.Crypto.ECC.BinaryField.Value(this._multiply(a._value, b._value));
	},

	//-----------------------------------------------------------------------------

	'_fastMultiply': function(a, b) {
		var result;
		var B;
		var i,c;
		
		result = [0];
		B = b.slice(0);	//	Is this array copy avoidable?
		c = 32;
		for (i=0; i<c; i++) {
			var ii, cc;
			
			cc = a.length;
			for (ii=0; ii<cc; ii++) {
				if (((a[ii] >>> i) & 0x01) == 1) {
					Clipperz.Crypto.ECC.BinaryField.Value._overwriteXor(result, B, ii);
				}
			}
			
			if (i < (c-1)) {
				B = Clipperz.Crypto.ECC.BinaryField.Value._overwriteShiftLeft(B, 1);
			}
		}
		result = this._module(result);
		
		return result;
	},
	
	'fastMultiply': function(a, b) {
		return new Clipperz.Crypto.ECC.BinaryField.Value(this._fastMultiply(a._value, b._value));
	},
	
	//-----------------------------------------------------------------------------
	//
	//	Guide to Elliptic Curve Cryptography
	//	Darrel Hankerson, Alfred Menezes, Scott Vanstone
	//	- Pag: 49, Alorithm 2.34
	//	
	//-----------------------------------------------------------------------------

	'_square': function(aValue) {
		var result;
		var value;
		var c,i;
		var precomputedValues;
		
		value = aValue;
		result = new Array(value.length * 2);
		precomputedValues = Clipperz.Crypto.ECC.BinaryField.FiniteField.squarePrecomputedBytes;
		
		c = value.length;
		for (i=0; i<c; i++) {
			result[i*2]  = precomputedValues[(value[i] & 0x000000ff)];
			result[i*2] |= ((precomputedValues[(value[i] & 0x0000ff00) >>> 8]) << 16);

			result[i*2 + 1]  = precomputedValues[(value[i] & 0x00ff0000) >>> 16];
			result[i*2 + 1] |= ((precomputedValues[(value[i] & 0xff000000) >>> 24]) << 16);
		}

		return this._module(result);
	},
	
	'square': function(aValue) {
		return new Clipperz.Crypto.ECC.BinaryField.Value(this._square(aValue._value));
	},
	
	//-----------------------------------------------------------------------------

	'_inverse': function(aValue) {
		var	result;
		var b, c;
		var u, v;
		
//		b = Clipperz.Crypto.ECC.BinaryField.Value.I._value;
		b = [1];
//		c = Clipperz.Crypto.ECC.BinaryField.Value.O._value;
		c = [0];
		u = this._module(aValue);
		v = this.modulus()._value.slice(0);
		
		while (Clipperz.Crypto.ECC.BinaryField.Value._bitSize(u) > 1) {
			var	bitDifferenceSize;
			
			bitDifferenceSize = Clipperz.Crypto.ECC.BinaryField.Value._bitSize(u) - Clipperz.Crypto.ECC.BinaryField.Value._bitSize(v);
			if (bitDifferenceSize < 0) {
				var swap;
				
				swap = u;
				u = v;
				v = swap;
				
				swap = c;
				c = b;
				b = swap;
				
				bitDifferenceSize = -bitDifferenceSize;
			}

			u = this._add(u, Clipperz.Crypto.ECC.BinaryField.Value._shiftLeft(v, bitDifferenceSize));
			b = this._add(b, Clipperz.Crypto.ECC.BinaryField.Value._shiftLeft(c, bitDifferenceSize));
//			this._overwriteAdd(u, Clipperz.Crypto.ECC.BinaryField.Value._shiftLeft(v, bitDifferenceSize));
//			this._overwriteAdd(b, Clipperz.Crypto.ECC.BinaryField.Value._shiftLeft(c, bitDifferenceSize));
		}

		result = this._module(b);
		
		return result;
	},
	
	'inverse': function(aValue) {
		return new Clipperz.Crypto.ECC.BinaryField.Value(this._inverse(aValue._value));
	},

	//-----------------------------------------------------------------------------
	__syntaxFix__: "syntax fix"
});


Clipperz.Crypto.ECC.BinaryField.FiniteField.squarePrecomputedBytes = [
	0x0000,	//	  0 = 0000 0000 -> 0000 0000 0000 0000
	0x0001,	//	  1 = 0000 0001 -> 0000 0000 0000 0001
	0x0004,	//	  2 = 0000 0010 -> 0000 0000 0000 0100
	0x0005,	//	  3 = 0000 0011 -> 0000 0000 0000 0101
	0x0010,	//	  4 = 0000 0100 -> 0000 0000 0001 0000
	0x0011,	//	  5 = 0000 0101 -> 0000 0000 0001 0001
	0x0014,	//	  6 = 0000 0110 -> 0000 0000 0001 0100
	0x0015,	//	  7 = 0000 0111 -> 0000 0000 0001 0101
	0x0040,	//	  8 = 0000 1000 -> 0000 0000 0100 0000
	0x0041,	//	  9 = 0000 1001 -> 0000 0000 0100 0001
	0x0044,	//	 10 = 0000 1010 -> 0000 0000 0100 0100
	0x0045,	//	 11 = 0000 1011 -> 0000 0000 0100 0101
	0x0050,	//	 12 = 0000 1100 -> 0000 0000 0101 0000
	0x0051,	//	 13 = 0000 1101 -> 0000 0000 0101 0001
	0x0054,	//	 14 = 0000 1110 -> 0000 0000 0101 0100
	0x0055,	//	 15 = 0000 1111 -> 0000 0000 0101 0101

	0x0100,	//	 16 = 0001 0000 -> 0000 0001 0000 0000
	0x0101,	//	 17 = 0001 0001 -> 0000 0001 0000 0001
	0x0104,	//	 18 = 0001 0010 -> 0000 0001 0000 0100
	0x0105,	//	 19 = 0001 0011 -> 0000 0001 0000 0101
	0x0110,	//	 20 = 0001 0100 -> 0000 0001 0001 0000
	0x0111,	//	 21 = 0001 0101 -> 0000 0001 0001 0001
	0x0114,	//	 22 = 0001 0110 -> 0000 0001 0001 0100
	0x0115,	//	 23 = 0001 0111 -> 0000 0001 0001 0101
	0x0140,	//	 24 = 0001 1000 -> 0000 0001 0100 0000
	0x0141,	//	 25 = 0001 1001 -> 0000 0001 0100 0001
	0x0144,	//	 26 = 0001 1010 -> 0000 0001 0100 0100
	0x0145,	//	 27 = 0001 1011 -> 0000 0001 0100 0101
	0x0150,	//	 28 = 0001 1100 -> 0000 0001 0101 0000
	0x0151,	//	 28 = 0001 1101 -> 0000 0001 0101 0001
	0x0154,	//	 30 = 0001 1110 -> 0000 0001 0101 0100
	0x0155,	//	 31 = 0001 1111 -> 0000 0001 0101 0101

	0x0400,	//	 32 = 0010 0000 -> 0000 0100 0000 0000
	0x0401,	//	 33 = 0010 0001 -> 0000 0100 0000 0001
	0x0404,	//	 34 = 0010 0010 -> 0000 0100 0000 0100
	0x0405,	//	 35 = 0010 0011 -> 0000 0100 0000 0101
	0x0410,	//	 36 = 0010 0100 -> 0000 0100 0001 0000
	0x0411,	//	 37 = 0010 0101 -> 0000 0100 0001 0001
	0x0414,	//	 38 = 0010 0110 -> 0000 0100 0001 0100
	0x0415,	//	 39 = 0010 0111 -> 0000 0100 0001 0101
	0x0440,	//	 40 = 0010 1000 -> 0000 0100 0100 0000
	0x0441,	//	 41 = 0010 1001 -> 0000 0100 0100 0001
	0x0444,	//	 42 = 0010 1010 -> 0000 0100 0100 0100
	0x0445,	//	 43 = 0010 1011 -> 0000 0100 0100 0101
	0x0450,	//	 44 = 0010 1100 -> 0000 0100 0101 0000
	0x0451,	//	 45 = 0010 1101 -> 0000 0100 0101 0001
	0x0454,	//	 46 = 0010 1110 -> 0000 0100 0101 0100
	0x0455,	//	 47 = 0010 1111 -> 0000 0100 0101 0101

	0x0500,	//	 48 = 0011 0000 -> 0000 0101 0000 0000
	0x0501,	//	 49 = 0011 0001 -> 0000 0101 0000 0001
	0x0504,	//	 50 = 0011 0010 -> 0000 0101 0000 0100
	0x0505,	//	 51 = 0011 0011 -> 0000 0101 0000 0101
	0x0510,	//	 52 = 0011 0100 -> 0000 0101 0001 0000
	0x0511,	//	 53 = 0011 0101 -> 0000 0101 0001 0001
	0x0514,	//	 54 = 0011 0110 -> 0000 0101 0001 0100
	0x0515,	//	 55 = 0011 0111 -> 0000 0101 0001 0101
	0x0540,	//	 56 = 0011 1000 -> 0000 0101 0100 0000
	0x0541,	//	 57 = 0011 1001 -> 0000 0101 0100 0001
	0x0544,	//	 58 = 0011 1010 -> 0000 0101 0100 0100
	0x0545,	//	 59 = 0011 1011 -> 0000 0101 0100 0101
	0x0550,	//	 60 = 0011 1100 -> 0000 0101 0101 0000
	0x0551,	//	 61 = 0011 1101 -> 0000 0101 0101 0001
	0x0554,	//	 62 = 0011 1110 -> 0000 0101 0101 0100
	0x0555,	//	 63 = 0011 1111 -> 0000 0101 0101 0101

	0x1000,	//	 64 = 0100 0000 -> 0001 0000 0000 0000
	0x1001,	//	 65 = 0100 0001 -> 0001 0000 0000 0001
	0x1004,	//	 66 = 0100 0010 -> 0001 0000 0000 0100
	0x1005,	//	 67 = 0100 0011 -> 0001 0000 0000 0101
	0x1010,	//	 68 = 0100 0100 -> 0001 0000 0001 0000
	0x1011,	//	 69 = 0100 0101 -> 0001 0000 0001 0001
	0x1014,	//	 70 = 0100 0110 -> 0001 0000 0001 0100
	0x1015,	//	 71 = 0100 0111 -> 0001 0000 0001 0101
	0x1040,	//	 72 = 0100 1000 -> 0001 0000 0100 0000
	0x1041,	//	 73 = 0100 1001 -> 0001 0000 0100 0001
	0x1044,	//	 74 = 0100 1010 -> 0001 0000 0100 0100
	0x1045,	//	 75 = 0100 1011 -> 0001 0000 0100 0101
	0x1050,	//	 76 = 0100 1100 -> 0001 0000 0101 0000
	0x1051,	//	 77 = 0100 1101 -> 0001 0000 0101 0001
	0x1054,	//	 78 = 0100 1110 -> 0001 0000 0101 0100
	0x1055,	//	 79 = 0100 1111 -> 0001 0000 0101 0101

	0x1100,	//	 80 = 0101 0000 -> 0001 0001 0000 0000
	0x1101,	//	 81 = 0101 0001 -> 0001 0001 0000 0001
	0x1104,	//	 82 = 0101 0010 -> 0001 0001 0000 0100
	0x1105,	//	 83 = 0101 0011 -> 0001 0001 0000 0101
	0x1110,	//	 84 = 0101 0100 -> 0001 0001 0001 0000
	0x1111,	//	 85 = 0101 0101 -> 0001 0001 0001 0001
	0x1114,	//	 86 = 0101 0110 -> 0001 0001 0001 0100
	0x1115,	//	 87 = 0101 0111 -> 0001 0001 0001 0101
	0x1140,	//	 88 = 0101 1000 -> 0001 0001 0100 0000
	0x1141,	//	 89 = 0101 1001 -> 0001 0001 0100 0001
	0x1144,	//	 90 = 0101 1010 -> 0001 0001 0100 0100
	0x1145,	//	 91 = 0101 1011 -> 0001 0001 0100 0101
	0x1150,	//	 92 = 0101 1100 -> 0001 0001 0101 0000
	0x1151,	//	 93 = 0101 1101 -> 0001 0001 0101 0001
	0x1154,	//	 94 = 0101 1110 -> 0001 0001 0101 0100
	0x1155,	//	 95 = 0101 1111 -> 0001 0001 0101 0101
                                           
	0x1400,	//	 96 = 0110 0000 -> 0001 0100 0000 0000
	0x1401,	//	 97 = 0110 0001 -> 0001 0100 0000 0001
	0x1404,	//	 98 = 0110 0010 -> 0001 0100 0000 0100
	0x1405,	//	 99 = 0110 0011 -> 0001 0100 0000 0101
	0x1410,	//	100 = 0110 0100 -> 0001 0100 0001 0000
	0x1411,	//	101 = 0110 0101 -> 0001 0100 0001 0001
	0x1414,	//	102 = 0110 0110 -> 0001 0100 0001 0100
	0x1415,	//	103 = 0110 0111 -> 0001 0100 0001 0101
	0x1440,	//	104 = 0110 1000 -> 0001 0100 0100 0000
	0x1441,	//	105 = 0110 1001 -> 0001 0100 0100 0001
	0x1444,	//	106 = 0110 1010 -> 0001 0100 0100 0100
	0x1445,	//	107 = 0110 1011 -> 0001 0100 0100 0101
	0x1450,	//	108 = 0110 1100 -> 0001 0100 0101 0000
	0x1451,	//	109 = 0110 1101 -> 0001 0100 0101 0001
	0x1454,	//	110 = 0110 1110 -> 0001 0100 0101 0100
	0x1455,	//	111 = 0110 1111 -> 0001 0100 0101 0101

	0x1500,	//	112 = 0111 0000 -> 0001 0101 0000 0000
	0x1501,	//	113 = 0111 0001 -> 0001 0101 0000 0001
	0x1504,	//	114 = 0111 0010 -> 0001 0101 0000 0100
	0x1505,	//	115 = 0111 0011 -> 0001 0101 0000 0101
	0x1510,	//	116 = 0111 0100 -> 0001 0101 0001 0000
	0x1511,	//	117 = 0111 0101 -> 0001 0101 0001 0001
	0x1514,	//	118 = 0111 0110 -> 0001 0101 0001 0100
	0x1515,	//	119 = 0111 0111 -> 0001 0101 0001 0101
	0x1540,	//	120 = 0111 1000 -> 0001 0101 0100 0000
	0x1541,	//	121 = 0111 1001 -> 0001 0101 0100 0001
	0x1544,	//	122 = 0111 1010 -> 0001 0101 0100 0100
	0x1545,	//	123 = 0111 1011 -> 0001 0101 0100 0101
	0x1550,	//	124 = 0111 1100 -> 0001 0101 0101 0000
	0x1551,	//	125 = 0111 1101 -> 0001 0101 0101 0001
	0x1554,	//	126 = 0111 1110 -> 0001 0101 0101 0100
	0x1555,	//	127 = 0111 1111 -> 0001 0101 0101 0101

	0x4000,	//	128 = 1000 0000 -> 0100 0000 0000 0000
	0x4001,	//	129 = 1000 0001 -> 0100 0000 0000 0001
	0x4004,	//	130 = 1000 0010 -> 0100 0000 0000 0100
	0x4005,	//	131 = 1000 0011 -> 0100 0000 0000 0101
	0x4010,	//	132 = 1000 0100 -> 0100 0000 0001 0000
	0x4011,	//	133 = 1000 0101 -> 0100 0000 0001 0001
	0x4014,	//	134 = 1000 0110 -> 0100 0000 0001 0100
	0x4015,	//	135 = 1000 0111 -> 0100 0000 0001 0101
	0x4040,	//	136 = 1000 1000 -> 0100 0000 0100 0000
	0x4041,	//	137 = 1000 1001 -> 0100 0000 0100 0001
	0x4044,	//	138 = 1000 1010 -> 0100 0000 0100 0100
	0x4045,	//	139 = 1000 1011 -> 0100 0000 0100 0101
	0x4050,	//	140 = 1000 1100 -> 0100 0000 0101 0000
	0x4051,	//	141 = 1000 1101 -> 0100 0000 0101 0001
	0x4054,	//	142 = 1000 1110 -> 0100 0000 0101 0100
	0x4055,	//	143 = 1000 1111 -> 0100 0000 0101 0101

	0x4100,	//	144 = 1001 0000 -> 0100 0001 0000 0000
	0x4101,	//	145 = 1001 0001 -> 0100 0001 0000 0001
	0x4104,	//	146 = 1001 0010 -> 0100 0001 0000 0100
	0x4105,	//	147 = 1001 0011 -> 0100 0001 0000 0101
	0x4110,	//	148 = 1001 0100 -> 0100 0001 0001 0000
	0x4111,	//	149 = 1001 0101 -> 0100 0001 0001 0001
	0x4114,	//	150 = 1001 0110 -> 0100 0001 0001 0100
	0x4115,	//	151 = 1001 0111 -> 0100 0001 0001 0101
	0x4140,	//	152 = 1001 1000 -> 0100 0001 0100 0000
	0x4141,	//	153 = 1001 1001 -> 0100 0001 0100 0001
	0x4144,	//	154 = 1001 1010 -> 0100 0001 0100 0100
	0x4145,	//	155 = 1001 1011 -> 0100 0001 0100 0101
	0x4150,	//	156 = 1001 1100 -> 0100 0001 0101 0000
	0x4151,	//	157 = 1001 1101 -> 0100 0001 0101 0001
	0x4154,	//	158 = 1001 1110 -> 0100 0001 0101 0100
	0x4155,	//	159 = 1001 1111 -> 0100 0001 0101 0101

	0x4400,	//	160 = 1010 0000 -> 0100 0100 0000 0000
	0x4401,	//	161 = 1010 0001 -> 0100 0100 0000 0001
	0x4404,	//	162 = 1010 0010 -> 0100 0100 0000 0100
	0x4405,	//	163 = 1010 0011 -> 0100 0100 0000 0101
	0x4410,	//	164 = 1010 0100 -> 0100 0100 0001 0000
	0x4411,	//	165 = 1010 0101 -> 0100 0100 0001 0001
	0x4414,	//	166 = 1010 0110 -> 0100 0100 0001 0100
	0x4415,	//	167 = 1010 0111 -> 0100 0100 0001 0101
	0x4440,	//	168 = 1010 1000 -> 0100 0100 0100 0000
	0x4441,	//	169 = 1010 1001 -> 0100 0100 0100 0001
	0x4444,	//	170 = 1010 1010 -> 0100 0100 0100 0100
	0x4445,	//	171 = 1010 1011 -> 0100 0100 0100 0101
	0x4450,	//	172 = 1010 1100 -> 0100 0100 0101 0000
	0x4451,	//	173 = 1010 1101 -> 0100 0100 0101 0001
	0x4454,	//	174 = 1010 1110 -> 0100 0100 0101 0100
	0x4455,	//	175 = 1010 1111 -> 0100 0100 0101 0101

	0x4500,	//	176 = 1011 0000 -> 0100 0101 0000 0000
	0x4501,	//	177 = 1011 0001 -> 0100 0101 0000 0001
	0x4504,	//	178 = 1011 0010 -> 0100 0101 0000 0100
	0x4505,	//	179 = 1011 0011 -> 0100 0101 0000 0101
	0x4510,	//	180 = 1011 0100 -> 0100 0101 0001 0000
	0x4511,	//	181 = 1011 0101 -> 0100 0101 0001 0001
	0x4514,	//	182 = 1011 0110 -> 0100 0101 0001 0100
	0x4515,	//	183 = 1011 0111 -> 0100 0101 0001 0101
	0x4540,	//	184 = 1011 1000 -> 0100 0101 0100 0000
	0x4541,	//	185 = 1011 1001 -> 0100 0101 0100 0001
	0x4544,	//	186 = 1011 1010 -> 0100 0101 0100 0100
	0x4545,	//	187 = 1011 1011 -> 0100 0101 0100 0101
	0x4550,	//	188 = 1011 1100 -> 0100 0101 0101 0000
	0x4551,	//	189 = 1011 1101 -> 0100 0101 0101 0001
	0x4554,	//	190 = 1011 1110 -> 0100 0101 0101 0100
	0x4555,	//	191 = 1011 1111 -> 0100 0101 0101 0101

	0x5000,	//	192 = 1100 0000 -> 0101 0000 0000 0000
	0x5001,	//	193 = 1100 0001 -> 0101 0000 0000 0001
	0x5004,	//	194 = 1100 0010 -> 0101 0000 0000 0100
	0x5005,	//	195 = 1100 0011 -> 0101 0000 0000 0101
	0x5010,	//	196 = 1100 0100 -> 0101 0000 0001 0000
	0x5011,	//	197 = 1100 0101 -> 0101 0000 0001 0001
	0x5014,	//	198 = 1100 0110 -> 0101 0000 0001 0100
	0x5015,	//	199 = 1100 0111 -> 0101 0000 0001 0101
	0x5040,	//	200 = 1100 1000 -> 0101 0000 0100 0000
	0x5041,	//	201 = 1100 1001 -> 0101 0000 0100 0001
	0x5044,	//	202 = 1100 1010 -> 0101 0000 0100 0100
	0x5045,	//	203 = 1100 1011 -> 0101 0000 0100 0101
	0x5050,	//	204 = 1100 1100 -> 0101 0000 0101 0000
	0x5051,	//	205 = 1100 1101 -> 0101 0000 0101 0001
	0x5054,	//	206 = 1100 1110 -> 0101 0000 0101 0100
	0x5055,	//	207 = 1100 1111 -> 0101 0000 0101 0101

	0x5100,	//	208 = 1101 0000 -> 0101 0001 0000 0000
	0x5101,	//	209 = 1101 0001 -> 0101 0001 0000 0001
	0x5104,	//	210 = 1101 0010 -> 0101 0001 0000 0100
	0x5105,	//	211 = 1101 0011 -> 0101 0001 0000 0101
	0x5110,	//	212 = 1101 0100 -> 0101 0001 0001 0000
	0x5111,	//	213 = 1101 0101 -> 0101 0001 0001 0001
	0x5114,	//	214 = 1101 0110 -> 0101 0001 0001 0100
	0x5115,	//	215 = 1101 0111 -> 0101 0001 0001 0101
	0x5140,	//	216 = 1101 1000 -> 0101 0001 0100 0000
	0x5141,	//	217 = 1101 1001 -> 0101 0001 0100 0001
	0x5144,	//	218 = 1101 1010 -> 0101 0001 0100 0100
	0x5145,	//	219 = 1101 1011 -> 0101 0001 0100 0101
	0x5150,	//	220 = 1101 1100 -> 0101 0001 0101 0000
	0x5151,	//	221 = 1101 1101 -> 0101 0001 0101 0001
	0x5154,	//	222 = 1101 1110 -> 0101 0001 0101 0100
	0x5155,	//	223 = 1101 1111 -> 0101 0001 0101 0101

	0x5400,	//	224 = 1110 0000 -> 0101 0100 0000 0000
	0x5401,	//	225 = 1110 0001 -> 0101 0100 0000 0001
	0x5404,	//	226 = 1110 0010 -> 0101 0100 0000 0100
	0x5405,	//	227 = 1110 0011 -> 0101 0100 0000 0101
	0x5410,	//	228 = 1110 0100 -> 0101 0100 0001 0000
	0x5411,	//	229 = 1110 0101 -> 0101 0100 0001 0001
	0x5414,	//	230 = 1110 0110 -> 0101 0100 0001 0100
	0x5415,	//	231 = 1110 0111 -> 0101 0100 0001 0101
	0x5440,	//	232 = 1110 1000 -> 0101 0100 0100 0000
	0x5441,	//	233 = 1110 1001 -> 0101 0100 0100 0001
	0x5444,	//	234 = 1110 1010 -> 0101 0100 0100 0100
	0x5445,	//	235 = 1110 1011 -> 0101 0100 0100 0101
	0x5450,	//	236 = 1110 1100 -> 0101 0100 0101 0000
	0x5451,	//	237 = 1110 1101 -> 0101 0100 0101 0001
	0x5454,	//	238 = 1110 1110 -> 0101 0100 0101 0100
	0x5455,	//	239 = 1110 1111 -> 0101 0100 0101 0101

	0x5500,	//	240 = 1111 0000 -> 0101 0101 0000 0000
	0x5501,	//	241 = 1111 0001 -> 0101 0101 0000 0001
	0x5504,	//	242 = 1111 0010 -> 0101 0101 0000 0100
	0x5505,	//	243 = 1111 0011 -> 0101 0101 0000 0101
	0x5510,	//	244 = 1111 0100 -> 0101 0101 0001 0000
	0x5511,	//	245 = 1111 0101 -> 0101 0101 0001 0001
	0x5514,	//	246 = 1111 0110 -> 0101 0101 0001 0100
	0x5515,	//	247 = 1111 0111 -> 0101 0101 0001 0101
	0x5540,	//	248 = 1111 1000 -> 0101 0101 0100 0000
	0x5541,	//	249 = 1111 1001 -> 0101 0101 0100 0001
	0x5544,	//	250 = 1111 1010 -> 0101 0101 0100 0100
	0x5545,	//	251 = 1111 1011 -> 0101 0101 0100 0101
	0x5550,	//	252 = 1111 1100 -> 0101 0101 0101 0000
	0x5551,	//	253 = 1111 1101 -> 0101 0101 0101 0001
	0x5554,	//	254 = 1111 1110 -> 0101 0101 0101 0100
	0x5555	//	255 = 1111 1111 -> 0101 0101 0101 0101
	
]
