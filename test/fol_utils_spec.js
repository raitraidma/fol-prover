describe("FolUtils", function() {
	beforeEach(function() {
		FOL.traceOn = false;
	});

	describe("arraysAreEqual", function() {
		it("is not equal", function() {
			expect(FOL.Utils.arraysAreEqual(["a", "b"], ["b", "a"])).toBe(false);
		});

		it("is equal", function() {
			var array = ["a", "b"];
			expect(FOL.Utils.arraysAreEqual(array, array)).toBe(true);
		});

		it("is equal when both arrays are empty", function() {
			expect(FOL.Utils.arraysAreEqual([], [])).toBe(true);
		});

		it("is equal when both arrays have nested arrays", function() {
			var array = ["a", ["b", ["d"]], ["c"]];
			expect(FOL.Utils.arraysAreEqual(array, array)).toBe(true);
		});
	});
});