describe("FolParser", function() {
	beforeEach(function() {
		FOL.traceOn = false;
		FOL.clauseId = 0;
	});

	describe("parseTerm", function() {
		it("throws an exception when term is empty", function() {
			expect(function() { FOL.FolParser.parseTerm("", 10) }).toThrow("Term expected");
			expect(function() { FOL.FolParser.parseTerm(" ", 10) }).toThrow("Term expected");
		});

		it("throws an exception when term is not fully upper case or lower case", function() {
			expect(function() { FOL.FolParser.parseTerm("TeSt", 10) }).toThrow("Term must be only upper case (variable) or only lower case (value, function): TeSt");
		});

		it("throws an exception when term contains underscore", function() {
			expect(function() { FOL.FolParser.parseTerm("X_Y", 10) }).toThrow("Term may not contain underscore");
		});

		it("returns constant", function() {
			expect(FOL.FolParser.parseTerm("x", 10)).toEqual([2, "x"]);
		});

		it("returns variable", function() {
			expect(FOL.FolParser.parseTerm("X", 10)).toEqual([1, "X_10"]);
		});
	});

	it("parseClause", function() {
		FOL.clauseId = 0;
		spyOn(FOL.FolParser, "parsePredicate").and.returnValue("predicate");
		expect(FOL.FolParser.parseClause("P(x,y)|A(C)")).toEqual([1, "predicate", "predicate"]);
		expect(FOL.FolParser.parsePredicate).toHaveBeenCalledWith("P(x,y)", 1);
		expect(FOL.FolParser.parsePredicate).toHaveBeenCalledWith("A(C)", 1);
	});

	describe("parseCNF", function() {
		it("passes by an exception", function() {
			spyOn(FOL.FolParser, "parseClause").and.throwError("my error");
			expect(function() { FOL.FolParser.parseCNF("disjunct") }).toThrow("Error on line 1: Error: my error");
		});

		it("returns list of clauses", function() {
			spyOn(FOL.FolParser, "parseClause").and.returnValue("clause");
			expect(FOL.FolParser.parseCNF("P(x,y)\nA(C)")).toEqual(["clause", "clause"]);
			expect(FOL.FolParser.parseClause).toHaveBeenCalledWith("P(x,y)");
			expect(FOL.FolParser.parseClause).toHaveBeenCalledWith("A(C)");
		});
	});

	describe("parsePredicate", function() {
		it("throws an exception when predicate is empty", function() {
			expect(function() { FOL.FolParser.parsePredicate("") }).toThrow("Wrong clause format: predicate missing");
		});
		
		it("throws an exception when parentheses are missing", function() {
			expect(function() { FOL.FolParser.parsePredicate("A(") }).toThrow("Predicate must contain parentheses");
			expect(function() { FOL.FolParser.parsePredicate("A)") }).toThrow("Predicate must contain parentheses");
		});
		
		it("throws an exception when predicate name is missing", function() {
			expect(function() { FOL.FolParser.parsePredicate("-()") }).toThrow("Wrong clause format: predicate name missing");
		});

		it("returns predicate as a list", function() {
			spyOn(FOL.FolParser, "parseTerm").and.returnValue("term");
			expect(FOL.FolParser.parsePredicate("P(x,Y)", 10)).toEqual([0, 1, "P", "term", "term"]);
			expect(FOL.FolParser.parsePredicate("-P(x,Y)", 10)).toEqual([0, -1, "P", "term", "term"]);
			expect(FOL.FolParser.parseTerm).toHaveBeenCalledWith("x", 10);
			expect(FOL.FolParser.parseTerm).toHaveBeenCalledWith("Y", 10);
		});

	});

	it("end to end test", function() {
		var cnf =	"p() | -q(X,a)\n" +
					"r( f(z(Y,Z),T), z(X,a) )";
		var parsedCLauses = [
			[1, [0, 1, "p"], [0, -1, "q", [1, "X_1"], [2, "a"]]],
			[2, [0, 1, "r", [3, "f", [3, "z", [1, "Y_2"], [1, "Z_2"]], [1, "T_2"]], [3, "z", [1, "X_2"], [2, "a"]]]]
		];
		expect(FOL.FolParser.parseCNF(cnf)).toEqual(parsedCLauses);
	});
});