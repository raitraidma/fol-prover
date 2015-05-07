"use strict";
var FOL = FOL || {};
/**
 * Parses CNF (string) and returns it as an array.
 *
 * father(john,jim)
 * father(rob,john)
 * -father(X,Y) | -father(Y,Z) | grandfather(X,Z)
 * -grandfather(rob,jim)
 *
 * Turns into:
 * [
 *   [1, [0, 1, "father", [2, "john"], [2, "jim"]]],
 *   [2, [0, 1, "father", [2, "rob"], [2, "john"]]],
 *   [3, [0, -1, "father", [1, "X_3"], [1, "Y_3"]], [0, -1, "father", [1, "Y_3"], [1, "Z_3"]], [0, 1, "grandfather", [1, "X_3"], [1, "Z_3"]]],
 *   [4, [0, -1, "grandfather", [2, "rob"], [2, "jim"]]],
 * ]
 *
 * p(f(X,a), f(Y,b))
 * p(f(f(X,a)))
 *
 * Turns into:
 * [
 *   [1, [0, 1, "p", [3, "f", [1, "X_1"], [2, "a"]], [3, "f", [1, "Y_1"], [2, "b"]]]],
 *   [2, [0, 1, "p", [3, "f", [3, "f", [1, "X_2"], [2, "a"]]]]]
 * ]
 */

FOL.FolParser = {
	/**
	 * Input is in conjunctive normal form.
	 * Every new line is disjunct.
	 * Returns list of clauses [clause1, clause2, ...]
	 */
	parseCNF: function(cnf) {
		var rawClauses = cnf.split("\n");
		var clauses = [];
		for (var c in rawClauses) {
			var clauseDnf = rawClauses[c].trim();
			try {
				if (clauseDnf !== '') {
					if (clauseDnf.substring(0,1) !== '%') {
						clauses.push(FOL.FolParser.parseClause(clauseDnf));
					}
				} 
			} catch (error) {
				// Parsing error
				throw "Error on line " + (parseInt(c)+1) + ": " + error;
			}
		}
		return clauses;
	},

	/**
	 * Input is disjunctive normal form
	 * Disjuncts are separated by |
	 * Returns clause as a list: [clauseId, predicate1, predicate2, ...]
	 */
	parseClause: function(rawClause) {
		var rawPredicates = rawClause.split("|");
		var clause = [];
		clause.push(++FOL.clauseId); // Unique ID for clause
		for (var p in rawPredicates) {
			clause.push(FOL.FolParser.parsePredicate(rawPredicates[p], FOL.clauseId));
		}
		return clause;
	},

	/**
	 * Returns predicate as a list:
	 * [0 (type, unnecessary), polarity, predicateName, term1, term2, ...]
	 */
	parsePredicate: function(rawPredicate, clauseId) {
		var predicate = [FOL.TYPE_PREDICATE, FOL.POLARITY_TRUE];
		var parsablePredicate = rawPredicate.trim();
		if (parsablePredicate === '') throw "Wrong clause format: predicate missing";
		if (parsablePredicate.indexOf("(") === -1 || parsablePredicate.indexOf(")") === -1) {
			throw "Predicate must contain parentheses"
		} 

		// Polarity
		if (parsablePredicate[0] === '-') {
			predicate[1] = FOL.POLARITY_FALSE;
			parsablePredicate = parsablePredicate.substring(1);
		}

		// Name
		var predicateName = parsablePredicate.split("(")[0].trim();
		if (predicateName === '') throw "Wrong clause format: predicate name missing";
		predicate.push(predicateName);

		// Terms
		if (parsablePredicate.lastIndexOf(")") !== (parsablePredicate.indexOf("(") + 1)) { // If not empty predicate: P()
			var firstParenthesisLoction = parsablePredicate.indexOf("(");
			var lastParenthesisLoction = parsablePredicate.lastIndexOf(")");
			var rawTerms = parsablePredicate.substring(firstParenthesisLoction + 1, lastParenthesisLoction);

			var term = "";
			var parenthesesCount = 0;
			for (var p in rawTerms) {
				if (rawTerms[p] == "(") { parenthesesCount++; }
				if (rawTerms[p] == ")") { parenthesesCount--; }
				if (rawTerms[p] == "," && parenthesesCount === 0) {
					// One term
					predicate.push(FOL.FolParser.parseTerm(term, clauseId));
					term = "";
					continue;
				}
				if (rawTerms[p] == " ") continue;
				term += rawTerms[p];
			}
			predicate.push(FOL.FolParser.parseTerm(term, clauseId));
			if (parenthesesCount > 0) throw "There are more opening parentheses then closing parentheses";
			if (parenthesesCount < 0) throw "There are more closing parentheses then opening parentheses";
		}
		return predicate;
	},

	/**
	 * Term can be either:
	 * - variable (in upper case)
	 * - constant (in lower case)
	 * - function (in lower case)
	 * Returns term as a list:
	 * - variable: [1, termValue_clauseId]
	 * - constant: [2, termValue]
	 * - function: [3, functionName, [...parsedTerms...]]
	 */
	parseTerm: function(rawTerm, clauseId) {
		rawTerm = rawTerm.trim();
		if (rawTerm === '') throw "Term expected";
		if (rawTerm.indexOf('_') !== -1) throw "Term may not contain underscore";

		// Variable or constant
		if (rawTerm.indexOf("(") == -1 && rawTerm.indexOf(")") == -1 ) {
			if (rawTerm.toLowerCase() !== rawTerm && rawTerm.toUpperCase() !== rawTerm) {
				throw "Term must be only upper case (variable) or only lower case (value, function): " + rawTerm;
			}
			if (rawTerm.toUpperCase() === rawTerm) return [FOL.TYPE_VARIABLE, rawTerm + "_" + clauseId]; // Variable
			return [FOL.TYPE_CONSTANT, rawTerm]; // Constant
		}

		// Function
		var functionTerm = [FOL.TYPE_FUNCTION];
		var functionName = rawTerm.substring(0, rawTerm.indexOf("("));
		if (functionName.toLowerCase() !== functionName) throw "Function name must be lower case";
		functionTerm.push(functionName);

		var firstParenthesisLoction = rawTerm.indexOf("(");
		var lastParenthesisLoction = rawTerm.lastIndexOf(")");
		var rawFunctionAttributes = rawTerm.substring(firstParenthesisLoction + 1, lastParenthesisLoction);

		var term = "";
		var parenthesesCount = 0;
		for (var p in rawFunctionAttributes) {
			if (rawFunctionAttributes[p] == "(") { parenthesesCount++; }
			if (rawFunctionAttributes[p] == ")") { parenthesesCount--; }
			if (rawFunctionAttributes[p] == "," && parenthesesCount === 0) {
				// One term
				functionTerm.push(FOL.FolParser.parseTerm(term, clauseId));
				term = "";
				continue;
			}
			if (rawFunctionAttributes[p] == " ") continue;
			term += rawFunctionAttributes[p];
		}
		functionTerm.push(FOL.FolParser.parseTerm(term, clauseId));
		if (parenthesesCount > 0) throw "There are more opening parentheses then closing parentheses";
		if (parenthesesCount < 0) throw "There are more closing parentheses then opening parentheses";

		return functionTerm;
	}
}