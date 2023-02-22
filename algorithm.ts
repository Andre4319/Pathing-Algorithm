// A* Search Algorithm

/* Comments:
 * Unsure if g-cost should be calculated similarly to h-cost or in some way accumulatively
 * Unsure if path from start to end needs its own variable/method, or if the end node's subsequent parents are supposed to form the full path (line 72)
 * Unsure what it means to check "If new path to adjacent node is shorter" (line 80)
 */

// Node structure
type gNode = {
    x: number; // x-coordinate
    y: number; // y-coordinate
    g: number; // distance/movement cost from start to node
    h: number; // distance/movement cost from node to end
    f: number; // the sum of g and h
    parent?: gNode; // A potential parent node consisting of several nodes, thus forming a path
}

// Placeholder values
const startPos: number[] = [0, 0];
const endPos: number[] = [2, 2];
const obstacles: number[][] = [[1, 1], [2, 1]];
const map: number[][] = [];

// Placeholder values
const startNode: gNode = {
    x: startPos[0],
    y: startPos[1],
    g: 0,
    h: 0,
    f: 0,
    parent: undefined
};

// Placeholder values
const endNode: gNode = {
    x: endPos[0],
    y: endPos[1],
    g: 0,
    h: 0,
    f: 0,
    parent: undefined
}

// Creates a 10x10 grid saved to 'map', excluding nontraversable points (obstacles)
for (let x = 0; x <= 9; x++) {
    for (let y = 0; y <= 9; y++) {
        if (obstacles.indexOf([x, y]) === -1) {
            map.push([x, y]);
        }
    }
}

// Returns an array of nodes that make up the most efficient path from start to end node
function aStar(start:gNode, end:gNode): gNode[] {
    const openList = [start]; // Start node is the initial node in the open list
    const closedList = [];
    let current = openList[0]; // Current node is initially the first node in the open list

    while (openList.length > 0) {
        // Compares f costs of every node in the open list, saves lowest as current
        for (let i = 0; i < openList.length; i++) {
            if (current.f < openList[i].f) {
                current = openList[i];
            }
        }

        openList.splice(openList.indexOf(current), 1); // Removes current node from open list
        closedList.push(current); // Adds current node to closed list

        if (current.x === end.x && current.y === end.y) {
            return [current]; // Returns current node including its parents (path) (?)
        } else {
            let adjacentNodes = getAdjacentNodes(current);

            for (let i = 0; i < adjacentNodes.length; i++) {
                if (closedList.includes(adjacentNodes[i])) {
                    continue;
                } else {
                    if (true || !openList.includes(adjacentNodes[i])) { // If new path to adjacent node is shorter OR adjacent node is NOT in open list (?)
                        adjacentNodes[i].parent = current;

                        if (!openList.includes(adjacentNodes[i])) {
                            openList.push(adjacentNodes[i]);
                        }
                    }
                }
            }
        }

    }
    
    return []; // Returns empty array if no path exists
}

// Gets adjacent nodes of current within map confinements and sets current as their parent
function getAdjacentNodes(current: gNode): gNode[] {
    const x = current.x;
    const y = current.y;
    
    // Gets coordinates of adjacent nodes, filtered to only traversable points
    const adjacentNodeCoordinates = [
        [x - 1, y - 1],
        [x - 1, y],
        [x - 1, y + 1],
        [x, y - 1],
        [x, y + 1],
        [x + 1, y - 1],
        [x + 1, y],
        [x + 1, y + 1],
    ].filter(item => map.includes(item));

    let currentAdjacent: gNode = current;
    const adjacentNodes: gNode[] = [];

    for (let i = 0; i < adjacentNodeCoordinates.length; i++) {
        currentAdjacent = {
            x: adjacentNodeCoordinates[i][0],
            y: adjacentNodeCoordinates[i][1],
            g: 0, // Placeholder
            h: heuristic(currentAdjacent, endNode),
            f: 0, // Placeholder
            parent: current
        };

        adjacentNodes.push(currentAdjacent);
    }

    return adjacentNodes;
}

// Calculates the distance/movement cost from current to end node (h-cost) for the movement in eight directions (up/down/left/right/diagonal)
// Assumes length of 1 between nodes in up/down/left/right directions, sqrt(2) diagonally
function heuristic(current: gNode, end: gNode): number {
    const dx: number = Math.abs(current.x - end.x);
    const dy: number = Math.abs(current.y - end.y);
    
    const h = (dx + dy) + (Math.sqrt(2) - 2) * Math.min(dx, dy);

    return h;
}