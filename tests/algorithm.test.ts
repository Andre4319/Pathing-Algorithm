import { runAStar } from '../core/algorithm';

describe('runAStar', () => {
  it('should return the shortest path on a simple map with two obstacles', () => {
    const map = {
      image: {
        dimension: { width: 3, height: 3 }
      },
      fixedNodes: {
        origin: { x: 0, y: 0 },
        end: { x: 2, y: 2 }
      },
      allNodes: [
        {
          obstacles: [
            { x: 1, y: 1 },
            { x: 1, y: 2 }
          ]
        }
      ]
    };

    const result = runAStar(map);

    // Check if the expected length is the same as lenght traveled
    expect(result.length).toEqual(4);

    // Check if the expected path is the same as the path traveled
    expect(result[0].node).toEqual({ x: 0, y: 0 });
    expect(result[1].node).toEqual({ x: 1, y: 0 });
    expect(result[2].node).toEqual({ x: 2, y: 1 });
    expect(result[3].node).toEqual({ x: 2, y: 2 });
  });
});
