import { getNode, loadImage } from "../maps";

describe("2D Test", () => {
    const test = loadImage({name: 'test.png', path: './resources'}, 9, 9);
    it("'Origin' should be: [1, 7, 0] and 'End' should be [7, 1, 0] ", () => {
        expect(test.static).toStrictEqual({ origin: getNode(1, 7, 0), end: getNode(7, 1, 0)});
    });
    
    it("Should only be 1 map ", () => {
        expect(test.allNodes.size).toEqual(1);
    });

    it("Should have traversable nodes ", () => {
        expect(test.allNodes.get(0).traversable.length).toBeGreaterThan(0);
    });

})

describe("3D Test #1 ( Multiple start and end point )", () => {
    const test = loadImage({name: '3d_test.png', path: './resources'}, 9, 9);
    it("'Origin' should be: [11, 17, 3] and 'End' should be [17, 11, 3] ", () => {
        expect(test.static).toStrictEqual({ origin: getNode(11, 17, 3), end: getNode(17, 11, 3)});
    });
    
    it("Should only be 4 maps ", () => {
        expect(test.allNodes.size).toEqual(4);
    });

    it("Should have traversable nodes ", () => {
        expect(test.allNodes.get(1).traversable.length).toBeGreaterThan(0);
    });

})

describe("3D Test #2 ( One start and end point )", () => {
    const test = loadImage({name: '3d_test2.png', path: './resources'}, 9, 9);
    it("'Origin' should be: [11, 7, 1] and 'End' should be [17, 1, 1] ", () => {
        expect(test.static).toStrictEqual({ origin: getNode(11, 7, 1), end: getNode(17, 1, 1)});
    });
    
    it("Should only be 4 maps ", () => {
        expect(test.allNodes.size).toEqual(4);
    });

    it("Should have traversable nodes ", () => {
        expect(test.allNodes.get(2).traversable.length).toBeGreaterThan(0);
    });

})

describe("3D Test #3 ( Non-cubed dimensions & Different zIndex for both start and end points )", () => {
    const test = loadImage({name: '3d_test3.png', path: './resources'}, 9, 18);
    it("'Origin' should be: [11, 17, 1] and 'End' should be [17, 21, 3] ", () => {
        expect(test.static).toStrictEqual({ origin: getNode(11, 17, 1), end: getNode(17, 21, 3)});
    });
    
    it("Should only be 4 maps ", () => {
        expect(test.allNodes.size).toEqual(4);
    });

    it("Should have traversable nodes ", () => {
        expect(test.allNodes.get(3).traversable.length).toBeGreaterThan(0);
    });
})