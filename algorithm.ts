// A* Search Algorithm

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

function aStar(start:gNode, end:gNode): gNode[] { // Returns an array of nodes that make up the most efficient path from start to end node
    const openList = [start]; // Starting node is the initial node in the open list
    const closedList = [];

    while (openList.length > 0) {
        let current = openList[0]; // Current node is initially the first node in the open list

        // Compares f costs of every node in the open list, saves lowest as current
        for (let i = 1; i < openList.length; i++) {
            if (current.f > openList[i].f) {
                current = openList[i];
            }
        }

        // Removes current node (with lowest f cost) from open list
        openList.splice(openList.indexOf(current), 1);

        
        // Generates adjacent nodes of current
        // For each adjacent:
            // if end node, return array of parents
            // else calculate f cost
                // if adjacent is in open list but not the lowest f cost, skip
                // if adjacent is in closed list, 

        let adjacentNodes = getAdjacentNodes(current);

        for (let i = 0; i < adjacentNodes.length; i++) {
            if (adjacentNodes[i].x === end.x && adjacentNodes[i].y === end.y) { // If adjacent is end node, successively moves current parent to the beginning of the array 'path'
                let path: gNode[] = [current];

                while (current.parent) {
                    current = current.parent;
                    path.unshift(current);
                }
    
                return path;
            } else {
                // *** NOT YET WRITTEN ***
            }
        }

        // Moves current node to closed list
        closedList.push(current);
    }

    return []; // Returns empty array if no path exists
}

// Gets adjacent nodes of current, within map confinements and sets current as their parent
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

// Calculates the distance/movement cost from node to end (h-cost) for the movement in eight directions (up/down/left/right/diagonal)
// Assumes length of 1 between nodes in up/down/left/right directions, sqrt(2) diagonally
function heuristic(current: gNode, end: gNode): number {
    const dx: number = Math.abs(current.x - end.x);
    const dy: number = Math.abs(current.y - end.y);
    
    const h = (dx + dy) + (Math.sqrt(2) - 2) * Math.min(dx, dy);

    return h;
}