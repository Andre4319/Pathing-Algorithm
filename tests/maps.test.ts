import { TraversableMap } from "../core/TraversableMap";
import { createGrid, createNode } from "../utilities/Position";

const mapPath = './tests/resources';

describe('2D Test', () => {
    const testMap = new TraversableMap({fileName: '2D.png', path: mapPath}, createGrid(1, 1));
    it('Origin node should be [1, 7, 0] and End node should be [7, 1, 0]', () => {
        expect(testMap.get().fixedNodes).toStrictEqual({ origin: createNode(1, 7, 0), end: createNode(7, 1, 0) });
    });

    it('Should only be 1 map', () => {
        expect(testMap.get().allNodes.length).toEqual(1);
    })

    it('Should have 5 obstacles', () => {
        expect(testMap.get().allNodes[0].obstacles.length).toEqual(5);
    });
})

describe('3D Test', () => {
    const testMap = new TraversableMap({fileName: '3D.png', path: mapPath}, createGrid(2, 2));
    it('Origin node should be [1, 7, 3] and End node should be [7, 1, 1]', () => {
        expect(testMap.get().fixedNodes).toStrictEqual({ origin: createNode(1, 7, 3), end: createNode(7, 1, 1) });
    });

    it('Should only be 4 maps', () => {
        expect(testMap.get().allNodes.length).toEqual(4);
    })

    it('Should have 51 obstacles', () => {
        const obstacleCount = (testMap.get().allNodes[0].obstacles.length) + (testMap.get().allNodes[1].obstacles.length) + (testMap.get().allNodes[2].obstacles.length) + (testMap.get().allNodes[3].obstacles.length)
        expect(obstacleCount).toEqual(51);
    })
})

describe('Maze Test', () => {
    const testMap = new TraversableMap({fileName: 'Maze.png', path: mapPath}, createGrid(1, 1));
    it('Origin node should be [2, 2, 0] and End node should be [22, 22, 0]', () => {
        expect(testMap.get().fixedNodes).toStrictEqual({ origin: createNode(2, 2, 0), end: createNode(22, 22, 0) });
    });

    it('Should only be 1 map', () => {
        expect(testMap.get().allNodes.length).toEqual(1);
    })

    it('Should have 279 obstacles', () => {
        expect(testMap.get().allNodes[0].obstacles.length).toEqual(279);
    })
})