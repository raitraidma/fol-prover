describe("FolSolver", function() {
	var solver;
	beforeEach(function() {
		solver = new FOL.FolSolver();
		solver.initialize();
		FOL.traceOn = false;
		FOL.clauseId = 0;
	});

	describe("applySubstitution", function() {
		it("does not change expression when substitution is empty", function() {
			var expression = [[1, "X"],[2, "y"]];
			expect(solver.applySubstitution([], expression)).toEqual(expression);
		});

		it("substitutes in expression", function() {
			var expression = [[1, "X"], [2, "y"], [3, "f", [3, "k", [2, "b"], [1, "X"]]]];
			var substitution = [[[2,"a"],[1,"X"]]];
			var expressionAfterSubstitution = [[2, "a"], [2, "y"], [3, "f", [3, "k", [2, "b"], [2, "a"]]]];
			expect(solver.applySubstitution(substitution, expression)).toEqual(expressionAfterSubstitution);
		});

		it("substitudes in function", function() {
			var expression = [[2,"a"],[3,"f",[1,"X_1"]]];
			var substitution = [[[2,"b"],[1,"X_1"]]];
			var expressionAfterSubstitution = [[2,"a"],[3,"f",[2,"b"]]];
			expect(solver.applySubstitution(substitution, expression)).toEqual(expressionAfterSubstitution);
		});
	});

	describe("unify", function() {
		it("returns empty substitution when both expressions are constants and have same value", function() {
			expect(solver.unify([2, "x"], [2, "x"])).toEqual([]);
		});

		it("returns false when both expressions are constants but have different value", function() {
			expect(solver.unify([2, "x"], [2, "y"])).toBe(false);
		});

		it("returns substitution where expression1 is substituted with expression2 when expression1 is variable", function() {
			var expression1 = [1, "X"];
			var expression2 = [2, "c"];
			expect(solver.unify(expression1, expression2)).toEqual([[expression2, expression1]]);
		});

		it("returns substitution where expression2 is substituted with expression1 when expression2 is variable", function() {
			var expression1 = [2, "c"];
			var expression2 = [1, "X"];
			expect(solver.unify(expression1, expression2)).toEqual([[expression1, expression2]]);
		});

		it("returns list of substitutions", function() {
			var expression1 = [[1, "X"],[2, "y"]];
			var expression2 = [[2, "a"],[1, "B"]];
			var substitutions = [[[2, "a"],[1, "X"]], [[2, "y"],[1, "B"]]];
			expect(solver.unify(expression1, expression2)).toEqual(substitutions);
		});
	});

	it("clausesAreSame", function() {
		expect(solver.clausesAreSame([1], [1])).toBe(true);
		expect(solver.clausesAreSame([2], [1])).toBe(false);
	});

	it("predicatesHaveSameNames", function() {
		expect(solver.predicatesHaveSameNames([0,0,"P"], [1,1,"P"])).toBe(true);
		expect(solver.predicatesHaveSameNames([0,0,"P"], [1,1,"Q"])).toBe(false);
	});

	it("getPredicateTerms", function() {
		var predicate = [1, 1, "P", [1, "X"], [2, "y"], [3, "g", [2, "d"], [1, "X"]]];
		var terms = solver.getPredicateTerms(predicate);
		expect(terms).toEqual([[1, "X"],[2, "y"],[3, "g", [2, "d"], [1, "X"]]]);
		terms[2][3][1] = "X_2";
		expect(predicate).toEqual([1, 1, "P", [1, "X"], [2, "y"], [3, "g", [2, "d"], [1, "X"]]]);
	});

	it("getStatistics", function() {
		solver.initialClauseCount = 3;
		solver.keptClauseCount = 4;
		solver.result = true;
		solver.timeTaken = 34;
		expect(JSON.stringify(solver.getStatistics())).toEqual('{"initialClauseCount":3,"keptClauseCount":4,"result":true,"timeTaken":34}');
	});

	describe("createNewClause", function() {
		it("creates new clause from two predicates and two substitutions", function() {
			var clause1 = [1, [0, 1, "p", [1, "X_1"], [1, "X_1"]]]; // p(X_1, X_1)
			FOL.clauseId++;
			var clause2 = [2, [0, -1, "p", [1, "Z_2"], [1, "Q_2"]]]; // -p(Z_2, Q_2)
			FOL.clauseId++;
			var substitutions = [[[1,"Z_2"],[1,"X_1"]], [[1,"Q_2"],[1,"Z_2"]]]; // {Z_2\X_1, Q_2\Z_2}

			var newClause = [3, [0, 1, "p", [1, "A_3"], [1, "A_3"]], [0, -1, "p", [1, "A_3"], [1, "A_3"]]];
			expect(solver.createNewClause(clause1, clause2, substitutions)).toEqual(newClause);
		});
		it("creates new clause that contain functions", function() {
			var clause1 = [1, [0, 1, "p", [2, "a"], [3, "f", [1, "X_1"]]]]; // p(a, f(X_1))
			FOL.clauseId++;
			var clause2 = [2, [0, -1, "p", [1, "Z_2"], [1, "Q_2"]]]; // -p(Z_2, Q_2)
			FOL.clauseId++;
			var substitutions = [[[2,"a"],[1,"Z_2"]], [[2,"b"],[1,"X_1"]], [[3,"f", [2, "b"]],[1,"Q_2"]]]; // {a\Z_2, b\X_1, f(b)\Q_2}

			var newClause = [3, [0, 1, "p", [2, "a"], [3, "f", [2, "b"]]], [0, -1, "p", [2, "a"], [3,"f", [2, "b"]]]];
			expect(solver.createNewClause(clause1, clause2, substitutions)).toEqual(newClause);
		});
	});
	
	describe("run", function() {
		it("should find contradiction", function() {
			var clause1 = [1, [0, 1, "p", [1, "X_1"], [1, "X_1"]]];
			var clause2 = [2, [0, -1, "p", [1, "Z_1"], [1, "Q_1"]]];
			solver.clauses.push(clause1);
			solver.clauses.push(clause2);
			expect(solver.run()).toBe(false);
		});
		it("should not find contradiction", function() {
			var clause1 = [1, [0, 1, "p", [1, "X_1"], [1, "X_1"]]];
			var clause2 = [2, [0, 1, "p", [1, "Z_1"], [1, "Q_1"]]];
			solver.clauses.push(clause1);
			solver.clauses.push(clause2);
			expect(solver.run()).toBe(true);
		});
	});

	describe("useResolution", function() {
		it("simple resolution", function() {
			var clause = [1, [0, -1, "alergia", [2, "m"], [2, "k"]], [0, 1, "nohu", [2, "m"]], [0, 1, "alergia", [2, "m"], [2, "k"]]];
			var resolutionResult = [true, [1, [0, 1, "nohu", [2, "m"]]]];
			expect(solver.useResolution(clause)).toEqual(resolutionResult);
		});

		it("complex resolution", function() {
			var clause1 = [1, [0, 1, "eq", [1, "A_1"], [1, "B_1"]]
							, [0, 1, "eq", [1, "A_1"], [1, "B_1"]]
							, [0, -1, "eq", [1, "A_1"], [1, "B_1"]]
							, [0, -1, "eq", [1, "A_1"], [1, "C_1"]]
							, [0, -1, "eq", [1, "C_1"], [1, "B_1"]]];
			var resolutionResult = [true, [1, [0, 1, "eq", [1, "A_1"], [1, "B_1"]], [0, -1, "eq", [1, "A_1"], [1, "C_1"]], [0, -1, "eq", [1, "C_1"], [1, "B_1"]]]];
			expect(solver.useResolution(clause1)).toEqual(resolutionResult);
		});
	});
	describe("solve", function() {
		it("should find contradiction 1", function() {
			var cnf = "-alergia(X,Y) | -alergia(X,Z) | -alergia(X,W) | nohu(X)\n"
					+ "alergia(m,k)\n"
					+ "-nohu(m)";
			expect(solver.solve(cnf,-1)).toBe(false);
		});
		it("should find contradiction 2", function() {
			var cnf = "father(john,mary)\n"
					+ "father(john,jim)\n"
					+ "father(rob,john)\n"
					+ "-father(X,Y) | -father(Y,Z) | grandfather(X,Z)\n"
					+ "-grandfather(rob,jim)";
			expect(solver.solve(cnf,-1)).toBe(false);
		});
		it("should find contradiction 3", function() {
			var cnf = "p(X,X,X,X)\n"
					+ "-p(Z,Y,Z,Q)";
			expect(solver.solve(cnf,-1)).toBe(false);
		});

		it("should find contradiction 4", function() {
			var cnf = "-king(X)|-greedy(X)|evil(X)\n"
					+ "king(father(john))\n"
					+ "greedy(father(john))\n"
					+ "-evil(father(john))";
			expect(solver.solve(cnf,-1)).toBe(false);
		});

		it("should not find contradiction", function() {
			var cnf = "father(john,mary)\n"
					+ "father(john,jim)\n"
					+ "father(rob,john)\n"
					+ "-father(X,Y) | -father(Y,Z) | grandfather(X,Z)\n"
					+ "grandfather(rob,jim)";
			expect(solver.solve(cnf,-1)).toBe(true);
		});
	});

	describe("isConstant", function() {
		it("is constant", function() {
			expect(solver.isConstant([2])).toBe(true);
		});
		it("is not constant", function() {
			expect(solver.isConstant([4])).toBe(false);
		});
		it("array is empty", function() {
			expect(solver.isConstant([])).toBe(false);
		});
	});

	describe("isVariable", function() {
		it("is variable", function() {
			expect(solver.isVariable([1])).toBe(true);
		});
		it("is not variable", function() {
			expect(solver.isVariable([4])).toBe(false);
		});
		it("array is empty", function() {
			expect(solver.isVariable([])).toBe(false);
		});
	});

	describe("isFunction", function() {
		it("is function", function() {
			expect(solver.isFunction([3])).toBe(true);
		});
		it("is not function", function() {
			expect(solver.isFunction([4])).toBe(false);
		});
		it("array is empty", function() {
			expect(solver.isFunction([])).toBe(false);
		});
	});

	describe("isPredicate", function() {
		it("is predicate", function() {
			expect(solver.isPredicate([0])).toBe(true);
		});
		it("is not predicate", function() {
			expect(solver.isPredicate([4])).toBe(false);
		});
		it("array is empty", function() {
			expect(solver.isPredicate([])).toBe(false);
		});
	});

	describe("occursIn", function() {
		it("variable occurs in variable", function() {
			var variable = [1, "X_1"];
			expect(solver.occursIn(variable, variable)).toBe(true);
		});
		it("variable does not occur in variable", function() {
			var variable1 = [1, "X_1"];
			var variable2 = [1, "X_2"];
			expect(solver.occursIn(variable1, variable2)).toBe(false);
		});
		it("variable does not occur in constant", function() {
			var variable1 = [1, "X_1"];
			var constant1 = [2, "a"];
			expect(solver.occursIn(variable1, constant1)).toBe(false);
		});
		it("variable does not occur in function", function() {
			var variable1 = [1, "X_1"];
			var function1 = [3, "f", [1, "X_2"], [1, "X_3"]];
			expect(solver.occursIn(variable1, function1)).toBe(false);
		});
		it("variable occurs in function on first position", function() {
			var variable1 = [1, "X_1"];
			var function1 = [3, "f", [1, "X_1"], [1, "X_3"]];
			expect(solver.occursIn(variable1, function1)).toBe(true);
		});
		it("variable occurs in function on last position", function() {
			var variable1 = [1, "X_1"];
			var function1 = [3, "f", [1, "X_2"], [1, "X_1"]];
			expect(solver.occursIn(variable1, function1)).toBe(true);
		});
		it("variable occurs in nested function", function() {
			var variable1 = [1, "X_1"];
			var function1 = [3, "f", [1, "X_2"], [3, "f", [2, "a"], [2, "b"], [3, "g", [2, "d"], [1, "X_1"]]], [1, "X_3"]];
			expect(solver.occursIn(variable1, function1)).toBe(true);
		});
		it("variable does not occur in nested function", function() {
			var variable1 = [1, "X_0"];
			var function1 = [3, "f", [1, "X_2"], [3, "f", [2, "a"], [2, "b"], [3, "g", [2, "d"], [1, "X_1"]]], [1, "X_3"]];
			expect(solver.occursIn(variable1, function1)).toBe(false);
		});
	});
});