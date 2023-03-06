// A* Search Algorithm
import { Node, createNode } from "../utilities/Position";
import { TraversableMap } from "./TraversableMap";
import { equals } from '../utilities/Util'

// Node structure
type gNode = {
    node: Node,
    g: number, // distance/movement cost from start to node
    h: number, // distance/movement cost from node to end
    f: number, // the sum of g and h
    parent?: gNode // A parent node, i.e. the previous node in the path
}
let searchedNodes: gNode[];


/**
 * Runs the A* algorithm on a map of nodes, returning the shortest path from the origin to the end.
 * @param {TraversableMap} traversableMap - TraversableMap
 * @returns an array of gNodes.
 */
export function runAStar(traversableMap: TraversableMap): gNode[] {
    const origin: Node = traversableMap.get().fixedNodes.origin;
    const end: Node = traversableMap.get().fixedNodes.end;
    const obstacles: Node[] = traversableMap.get().allNodes[0].obstacles;
    const bounds: Node[] = getBounds(traversableMap);
    return aStar(origin, end, obstacles, bounds);
}

/**
 * Gets the bounds of an image with 0,0 to start
 * @param traversableMap The map to get bounds
 * @returns The maps bounds
 */
function getBounds(traversableMap: TraversableMap): Node[] {
    return [createNode(0,0), createNode(traversableMap.get().image.dimension.width - 1, 
                                        traversableMap.get().image.dimension.height - 1)];
}

/**
 * It takes a start node, an end node, an array of obstacles and an array of bounds, and returns an
 * array of nodes that form the shortest path from the start node to the end node
 * @param {Node} start - The start node
 * @param {Node} end - The end node
 * @param {Node[]} obstacles - An array of nodes that are obstacles
 * @param {Node[]} bounds - The bounds of the grid, in the form of two nodes, the first being the
 * top-left corner, the second being the bottom-right corner.
 * @returns The path from start to end.
 */
function aStar(start: Node, end: Node, obstacles: Node[], bounds: Node[]): gNode[] {
    let openList: gNode[] = [{node: start, g: 0, h: 0, f: 0}]; // Open list contains nodes to be evaluated, start node is its initial node
    let closedList: gNode[] = []; // Closed list contains nodes already evaluated

    // Loop until open list is empty (or end node is reached)
    while (openList.length > 0) {
        let current = openList[0]; // Current node is initially the first node in the open list

        // Compares f-costs of each node in the open list, saves lowest as current
        for (let i = 1; i < openList.length; i++) {
            if (current.f > openList[i].f || current.f === openList[i].f && current.h > openList[i].h) { // If current node has greater f-cost OR if equal AND current has greater h-cost
                current = openList[i];
            }
        }

        openList.splice(openList.indexOf(current), 1); // Removes current node from the open list
        closedList.push(current); // Adds current node to the closed list

        // Checks if current node is end node, and if so, constructs the path to it
        if (equals(current.node, end)) {
            let path: gNode[] = [];
            let currentNode: gNode | undefined = current;

            while (currentNode) { // While current node exists, add current to path, then set current to its parent
                path.push(currentNode);
                currentNode = currentNode.parent;
            }
            searchedNodes = closedList;
            return  path.reverse(); // Returns the path from start to end rather than end to start
        }

        // Retrieves the adjacent node coordinates in eight directions (up/down/left/right/diagonals)
        let adjacentNodeCoordinates: Node[] = getAdjacentNodes(bounds, current.node);
        // Filters adjacent node coordinates to those within bounds, that also aren't obstacles
        adjacentNodeCoordinates = adjacentNodeCoordinates.filter(coordinates => {
            let x = current.node.x;
            let y = current.node.y;

            return (
                x >= bounds[0].x && x <= bounds[1].x &&
                y >= bounds[0].y && y <= bounds[1].y &&
                !obstacles.some(obstacle => equals(obstacle, createNode(x, y)))
            );
        });

        let adjacentNodes: gNode[] = [];

        // Constructs adjacent nodes for each adjacent node coordinate
        for (let i = 0; i < adjacentNodeCoordinates.length; i++) {
            let x = adjacentNodeCoordinates[i].x;
            let y = adjacentNodeCoordinates[i].y;

            // Assumed distance/movement cost for straight movement is 1, diagonal movement is sqrt(2)
            // For g-, h- and f-costs, if x- or y-values remain unchanged, movement is straight, otherwise it's diagonal
            let currentAdjacent: gNode = {
                node: createNode(x, y),
                g: current.g + Math.sqrt(2 - (x === current.node.x || y === current.node.y ? 1 : 0)),
                h: Math.sqrt(Math.abs(x - end.x) + Math.abs(y - end.y)),
                f: current.g + Math.sqrt(2 - (x === current.node.x || y === current.node.y ? 1 : 0)) + Math.sqrt(Math.abs(x - end.x) + Math.abs(y - end.y)), // If possible, could be defined more simply as g + h
                parent: current
            }

            adjacentNodes.push(currentAdjacent);
        }

        // For each adjacent node
        for (let i = 0; i < adjacentNodes.length; i++) {
            let adjacent = adjacentNodes[i];

            // Check if adjacent node is in the closed list, if so, skip it
            if (closedList.some(node => equals(node.node, adjacent.node))) {
                continue;
            } else {
                let openNode = openList.find(node => equals(node.node, adjacent.node)); // If a node with the same x- and y-coordinates as the adjacent node exists, create open node
                
                if (openNode) { // If open node exists
                    // Check if current path (g-cost of current + h-cost of current to adjacent) is shorter than the adjacent node's previously stored g-cost in the open list
                    // (this can happen if an adjacent node is generated with a different current node)
                    if (openNode.g > adjacent.g) {
                        openNode.g = adjacent.g;
                        openNode.f = adjacent.f;
                        openNode.parent = current;
                    }
                } else { // If not, add adjacent node to the open list
                    openList.push(adjacent);
                }
            }
        }
    }

    return []; // Returns empty if no path exists
}

/**
 * It returns an array of nodes that are adjacent to the given node.
 * @param {Node[]} bounds - The bounds of the grid.
 * @param {Node} node - The node to get the adjacent nodes of.
 * @returns A list of nodes that are adjacent to the node passed in.
 */
function getAdjacentNodes(bounds: Node[], node: Node): Node[] {
    const adjacentNodes: Node[] = [];
    for (let x = node.x - 1; x <= node.x + 1; x++) {
        for (let y = node.y - 1; y <= node.y + 1; y++) {
            if(x < bounds[0].x || x > bounds[1].x || y < bounds[0].y || y > bounds[1].y) {
                continue;
            }
                
            adjacentNodes.push(createNode(x, y))
        }
    }
    return adjacentNodes;
}