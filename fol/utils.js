"use strict";
var FOL = FOL || {};

FOL.traceOn = true;
FOL.Utils = {
	trace: function(msg) {
		if (FOL.traceOn) console.log(msg);
	},

	error: function(msg) {
		console.error(msg);
	},

	arraysAreEqual: function(array1, array2) {
	    // if the array is a falsy value, return
	    if (!array1) return false;
	    if (!array2) return false;

	    // compare lengths
	    if (array1.length != array2.length) return false;

	    for (var i = 0, l = array1.length; i < l; i++) {
	        // Check if we have nested arrays
	        if (array1[i] instanceof Array && array2[i] instanceof Array) {
	            // recurse into the nested arrays
	            if (!FOL.Utils.arraysAreEqual(array1[i], array2[i])) return false;       
	        }           
	        else if (array1[i] != array2[i]) { // However two objects will still not be equal
	            return false;
	        }           
	    }       
	    return true;
	}
};

/*
// Can't use because karma tests start to fail
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array) return false;

    // compare lengths
    if (this.length != array.length) return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i])) return false;       
        }           
        else if (this[i] != array[i]) { // However two objects will still not be equal
            return false;
        }           
    }       
    return true;
};
*/