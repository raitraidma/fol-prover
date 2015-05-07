"use strict";
var FOL = FOL || {};

FOL.clauseId = 0;

FOL.POLARITY_TRUE = 1;
FOL.POLARITY_FALSE = -1;

FOL.TYPE_PREDICATE = 0;
FOL.TYPE_VARIABLE = 1; // (variables are in upper case)
FOL.TYPE_CONSTANT = 2; // (constants are in lower case)
FOL.TYPE_FUNCTION = 3; // (functions are in lower case)

FOL.FolSolver = function() {
	/**
	 * cnf - Clauses (string)
	 * maxPredicatesInNewClause - How many predicates can be in kept clauses.
	 *                            Only those clauses are kept that change during resolution.
	 *                            If there are more predicates, then new clause is not added to clauses list.
	 */
	this.solve = function(cnf, maxPredicatesInNewClause) {
		this.initialize();
		try {
			var startTime = new Date().getTime();
			this.maxPredicatesInNewClause = parseInt(maxPredicatesInNewClause) || -1;
			this.clauses = FOL.FolParser.parseCNF(cnf);
			this.initialClauseCount = this.clauses.length;
			this.result = this.run();
            var finishTime = new Date().getTime();
            this.timeTaken = finishTime - startTime;
			return this.result;
		} catch (error) {
			FOL.Utils.error(error);
		}
	};

	this.initialize = function() {
		/*
		 Contains initial and kept clauses.
		*/
		this.clauses = [];

		/*
		 Every caluse gets unique id.
		 This id is also used to make clause's variables unique.
		*/
		FOL.clauseId = 0;

		// For statistics only
		this.initialClauseCount = 0;
		this.keptClauseCount = 0;
		this.result = null;
		this.timeTaken = 0;
	};

	this.getStatistics = function() {
		return {
			"initialClauseCount" : this.initialClauseCount,
			"keptClauseCount" : this.keptClauseCount,
			"result" : this.result,
			"timeTaken" : this.timeTaken
		};
	};

	/**
	 * Returns clause as a string.
	 * Used for trace only.
	 */
	this.clauseOutput = function(clause) {
		var clauseOutput = '';
		clauseOutput += 'Clause ' + clause[0] + ': ';
		for (var p = 1; p < clause.length; p++) {
			clauseOutput += (p === 1) ? '' : '|';
			clauseOutput += this.expressionsOutput(clause[p]);
		}
		return clauseOutput;
	};

	/**
	 * Returns terms output for trace.
	 * Expression is predicate, variable, function or constant.
	 */
	this.expressionsOutput = function(expression) {
		if (this.isConstant(expression) || this.isVariable(expression)) return expression[1];
		var output = "";
		var t = 0;
		if (this.isPredicate(expression)) {
			t = 3;
			output += (expression[1] === FOL.POLARITY_FALSE) ? '-' : '';
			output += expression[2];
		} else if (this.isFunction(expression)) {
			t = 2;
			output += expression[1];
		}
		var firstPosition = t;

		output += "(";
		for (; t < expression.length; t++) {
			output += (t === firstPosition) ? '' : ', ';
			output += this.expressionsOutput(expression[t]);
		}
		output += ")";
		return output;
	};

	/**
	 * Returns substitution as a string.
	 * Used for trace only.
	 */
	this.substitutionOutput = function(substitution) {
		if (substitution === false) return 'FALSE';
		var substitutionOutput = '{';
		for (var s = 0; s < substitution.length; s++) {
			substitutionOutput += (s === 0) ? '' : ', ';
			substitutionOutput += this.substitutionTermOutput(substitution[s][0]);
			substitutionOutput += '\\';
			substitutionOutput += substitution[s][1][1];
		}
		substitutionOutput += '}';
		return substitutionOutput;
	};

	this.substitutionTermOutput = function(expression) {
		if (this.isVariable(expression) || this.isConstant(expression)) {
			return expression[1];
		}
		var term = expression[1];
		term += "(";
		for (var t = 2; t < expression.length; t++) {
			term += (t === 2) ? "" : ", ";
			term += this.substitutionTermOutput(expression[t]);
		}
		term += ")";
		return term;
	};

	/**
	 * Does all the work.
	 * It goes through given and generated clauses.
	 * If predicates match, then it tries to unify those predicates.
	 */
	this.run = function() {
		var currentClauseId = 0;
		while (true) {
			if (this.clauses.length <= currentClauseId+1) {
				FOL.Utils.trace("No more clauses to use");
				break;
			}
			var currentClause = this.clauses[currentClauseId++];

			for (var c in this.clauses) {
				var otherClause = this.clauses[c];
				if (this.clausesAreSame(currentClause, otherClause)) continue;
				FOL.Utils.trace("Matching clauses:");
				FOL.Utils.trace('  ' + this.clauseOutput(currentClause));
				FOL.Utils.trace('  ' + this.clauseOutput(otherClause));

				// Loop over predicates of currentClause
				for (var p1 = 1; p1 < currentClause.length; p1++) {
					// Loop over predicates of otherClause
					for (var p2 = 1; p2 < otherClause.length; p2++) {
						// If polarities are same then skip
						if (currentClause[p1][1] === otherClause[p2][1]) continue;
						// If both predicates have the same name
						if (this.predicatesHaveSameNames(currentClause[p1], otherClause[p2])) {
							// Unify terms of these two predicates - find what substitutions you can make
							var substitutions = this.unify(this.getPredicateTerms(currentClause[p1]), this.getPredicateTerms(otherClause[p2]));
							FOL.Utils.trace("    Substitutions: " + this.substitutionOutput(substitutions));
							if (substitutions !== false) {
								var newClause = this.createNewClause(currentClause, otherClause, substitutions);
								var resolutionResult = this.useResolution(newClause);
								if (resolutionResult[1].length === 1) {
									FOL.Utils.trace('$F');
									return false;
								}

								// If it was possible to use resolution, then keep the clause you got after resolution
								if (resolutionResult[0] === true) {
									if ((this.maxPredicatesInNewClause === -1) || ((resolutionResult[1].length-1) < this.maxPredicatesInNewClause)) {
										this.clauses.push(resolutionResult[1]);
										this.keptClauseCount++;
										FOL.Utils.trace('      Resolution: ' + this.clauseOutput(resolutionResult[1]));
									}
								}
							}
						}
					}
				}
			}
		}
		FOL.Utils.trace('$T');
		return true;
	};

	/**
	 * Takes clause. Goes through all predicates in it.
	 * If predicate has same name and same terms but different polarity than other predidate, then remove them from the clause.
	 */
	this.useResolution = function(clause) {
		var usedResolution = false;
		// Loop over predicates predicates in clause
		p1_loop: for (var p1 = 1; p1 < clause.length-1; p1++) {
			var predicate1 = clause[p1];

			for (var p2 = p1+1; p2 < clause.length; p2++) {
				var predicate2 = clause[p2];

				if (predicate1[1] === predicate2[1]) continue; // Must have diferent polarities

				if (this.predicatesHaveSameNames(predicate1, predicate2)) {
					var match = true;
					/* 
					 Loop over terms in predicate.
					 If terms are not same, then don't remove those predicates.
					*/
					for (var t = 3; t < predicate1.length; t++) {
						if (!FOL.Utils.arraysAreEqual(predicate1[t], predicate2[t])) {
							match = false;
							break;
						}
					}
					// If terms match, then predicates are same (but with different polarity) and will be removed
					if (match) {
						usedResolution = true;
						// Remove from the end first
						if (p2 > p1) {
							clause.splice(p2,1);
							clause.splice(p1,1);
						} else {
							clause.splice(p1,1);
							clause.splice(p2,1);
						}
						break p1_loop;
					}
				}
			}
		}
		return [usedResolution, clause];
	};

	/**
	 * Concat two clauses and apply substitutions
	 */
	this.createNewClause = function(clause1, clause2, substitutions) {
		var clause = [];
		var uniqueVariables = {"length" : 0, "variables" : {}};
		clause.push(++FOL.clauseId); // Unique ID for new clause
		var clauses = [clause1, clause2];
		for (var c in clauses) {
			// Loop over predicates in clause
			for (var p = 1; p < clauses[c].length; p++) {
				var predicate = clauses[c][p];
				var newPredicate = [FOL.TYPE_PREDICATE, predicate[1], predicate[2]];
				var terms = this.getPredicateTerms(predicate);
				// Apply substitution to all terms in predicate
				for (var s in substitutions) {
					terms = this.applySubstitution([substitutions[s]], terms); 
				}
				// Add substituted terms to new predicate
				for (var t in terms) {
					newPredicate.push(this.createNewTerm(terms[t], uniqueVariables));
				}
				// Add new predicate to clause
				clause.push(newPredicate);
			}
		}
		return clause;
	};

	this.createNewTerm = function(oldTerm, uniqueVariables) {
		var newTerm = [this.getExpressionType(oldTerm)];
		if (this.isConstant(oldTerm)) {
			newTerm.push(oldTerm[1]);
		} else if (this.isVariable(oldTerm)) {
			var uniqueVariableName = '';
			if (uniqueVariables["variables"].hasOwnProperty(oldTerm[1])) {
				uniqueVariableName = uniqueVariables["variables"][oldTerm[1]];
			} else {
				uniqueVariableName = String.fromCharCode(uniqueVariables["length"] + 65) + "_" + FOL.clauseId; 
				uniqueVariables["variables"][oldTerm[1]] = uniqueVariableName;
				uniqueVariables["length"] = uniqueVariables["length"] + 1;
			}
			newTerm.push(uniqueVariableName);
		} else if (this.isFunction(oldTerm)) {
			newTerm.push(oldTerm[1]);
			for (var t = 2; t < oldTerm.length; t++) {
				newTerm.push(this.createNewTerm(oldTerm[t], uniqueVariables));
			}
		}

		return newTerm;
	};

	/**
	 * Get only terms part from predicate.
	 */
	this.getPredicateTerms = function(predicate) {
		return this.copyTerms(predicate.slice(3, predicate.length));
	};

	/**
	 * Creates deep copy. Copy is needed because current unification method changes terms.
	 * If we wouldn't copy then we would change values of references.
	 */
	this.copyTerms = function(expression) {
		if (!(expression instanceof Array)) return expression;
		var terms = [];
		for (var i = 0; i < expression.length; i++) {
			terms.push(this.copyTerms(expression[i]));
		}
		return terms;
	};

	this.getFunctionTerms = function(func) {
		return func.slice(2, func.length);
	};

	this.predicatesHaveSameNames = function(predicate1, predicate2) {
		if (predicate1.length < 3 || predicate2.length < 3) return false;
		return predicate1[2] === predicate2[2];
	};

	/**
	 * Clauses are same if they have same clause id
	 */
	this.clausesAreSame = function(clause1, clause2) {
		if (clause1.length < 1 || clause2.length < 1) return false;
		return clause1[0] === clause2[0];
	};

	/**
	 * Returns whether expression is predicate, constant, variable or function.
	 */
	this.getExpressionType = function(expression) {
		if (!Array.isArray(expression) || expression.length < 1) return null;
		return expression[0];
	};

	this.isConstant = function(expression) {
		return this.getExpressionType(expression) === FOL.TYPE_CONSTANT;
	};

	this.isVariable = function(expression) {
		return this.getExpressionType(expression) === FOL.TYPE_VARIABLE;
	};

	this.isFunction = function(expression) {
		return this.getExpressionType(expression) === FOL.TYPE_FUNCTION;
	};

	this.isPredicate = function(expression) {
		return this.getExpressionType(expression) === FOL.TYPE_PREDICATE;
	};

	/**
	 * Expression is list of terms or terms itself
	 * http://www.cs.trincoll.edu/~ram/cpsc352/notes/unification.html
	 * http://www.doc.ic.ac.uk/~sgc/teaching/pre2012/v231/lecture8.html
	 * http://www.cs.bham.ac.uk/research/projects/poplog/paradigms_lectures/lecture20.html#unification
	 * Expression is list of terms or a term.
	 */
	this.unify = function(expression1, expression2) {
		if ((expression1.length === 0 && expression2.length === 0) ||
			(this.isConstant(expression1) && this.isConstant(expression2))) {
			if (FOL.Utils.arraysAreEqual(expression1, expression2)) { return []; }
			return false;
		}

		if (this.isVariable(expression1) && this.isVariable(expression2) && FOL.Utils.arraysAreEqual(expression1, expression2)) {
			return [];
		}

		if (this.isVariable(expression1)) {
			if (this.occursIn(expression1, expression2)) {
				return false;
			}
			return [[expression2, expression1]];
		}

		if (this.isVariable(expression2)) {
			if (this.occursIn(expression2, expression1)) {
				return false;
			}
			return [[expression1, expression2]];
		}

		if ((this.isConstant(expression1) && this.isFunction(expression2)) ||
			this.isFunction(expression1) && this.isConstant(expression2)) {
			return false;
		}

		if (this.isFunction(expression1)) {
			if (this.isFunction(expression2)) {
				if (expression1[1] === expression2[1]) {
					expression1 = this.getFunctionTerms(expression1);
					expression2 = this.getFunctionTerms(expression2);
				} else {
					return false;
				}
			}
		}

		try {
			var headOfExpression1 = expression1.shift(); // Take first term from the list
		} catch (e) {
			throw e;
		}
		var headOfExpression2 = expression2.shift();
		var substitution1 = this.unify(headOfExpression1, headOfExpression2); // Unify terms. Recursion.
		if(substitution1 === false) { return false; }
		var tailOfExpression1 = this.applySubstitution(substitution1, expression1); // Make substitutions in terms
		var tailOfExpression2 = this.applySubstitution(substitution1, expression2);
		var substitution2 = this.unify(tailOfExpression1, tailOfExpression2); // Unify rest of the lists
		if (substitution2 === false) { return false; }
		return (substitution1).concat(substitution2); // Return list of substitutions
	};

	/**
	 * Checks wheather expression1 occurs in expression2.
	 */
	this.occursIn = function(expression1, expression2) {
		if (this.isVariable(expression2)) {
			if (FOL.Utils.arraysAreEqual(expression1, expression2)) {
				return true;
			}
		}
		if (this.isFunction(expression2)) {
			for (var t = 2; t < expression2.length; t++) {
				if (this.occursIn(expression1, expression2[t])) return true;
			}
		}
		return false;
	};

	/**
	 * Expression is list of terms.
	 * Makes replacement in expression.
	 */
	this.applySubstitution = function(substitution, expression) {
		if (substitution.length === 0) return expression; // If there is nothing to substitude
		for (var e in expression) {
			if (this.isVariable(expression[e])) {
				if (expression[e][1] == substitution[0][1][1]) { // if variables have same name
					expression[e] = substitution[0][0]; // replace variable with other term
				}
			} else if (this.isFunction(expression[e])) {
				for (var t = 2; t < expression[e].length; t++) {
					expression[e][t] = this.applySubstitution(substitution, [expression[e][t]])[0];
				}
			}
		}
		return expression;
	};
};
