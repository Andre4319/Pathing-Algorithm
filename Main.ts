import { runAStar } from './core/algorithm';
import { TraversableMap, ColorDefenitions, ColorKey } from './core/TraversableMap';
import { createGrid, type Node, createNode, getRelativeNode } from './utilities/Position';
import { equals } from './utilities/Util';

const first2DMap = new TraversableMap({fileName: 'Maze.png'}, createGrid(1, 1));
run(first2DMap);


function run(traversableMap: TraversableMap) {
    const quickest = runAStar(traversableMap);
    const path: Node[] = [];

    for (let i = 0; i < quickest.length; i++) {
        const node: Node = createNode(quickest[i].node.x, quickest[i].node.y);
        if (!equals(node, traversableMap.get().fixedNodes.origin) && !equals(node, traversableMap.get().fixedNodes.end)) {
            path.push(node);
        }
    }
    traversableMap.drawPath(path, ColorDefenitions.get(ColorKey.PathCorrect));
}
