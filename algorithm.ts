// A* Search Algorithm

// Node structure
type gNode = {
    x: number, // x-coordinate
    y: number, // y-coordinate
    g: number, // distance/movement cost from start to node
    h: number, // distance/movement cost from node to end
    f: number, // the sum of g and h
    parent?: gNode // A parent node, i.e. the previous node in the path
}

type Coordinates = {
    x: number,
    y: number
}

// Enter desired values
const startPos: Coordinates = {x: 7, y: 1};
const endPos: Coordinates = {x: 4, y: 4};
const obstacles: Coordinates[] = [{x: 3, y: 3}, {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3}, {x: 7, y: 3}, {x: 3, y: 4}];
const bounds: Coordinates[] = [{x: 0, y: 0}, {x: 10, y: 5}];

// Only x- and y-coordinates are of relevance
const startNode: gNode = {
    x: startPos.x,
    y: startPos.y,
    g: 0,
    h: 0,
    f: 0,
    parent: undefined
};

// Only x- and y-coordinates are of relevance
const endNode: gNode =  {
    x: endPos.x,
    y: endPos.y,
    g: 0,
    h: 0,
    f: 0,
    parent: undefined
}

function aStar(start: gNode, end: gNode): gNode[] {
    let openList: gNode[] = [start]; // Open list contains nodes to be evaluated, start node is its initial node
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
        if (current.x === end.x && current.y === end.y) {
            let path: gNode[] = [];
            let currentNode: gNode | undefined = current;

            while (currentNode) { // While current node exists, add current to path, then set current to its parent
                path.push(currentNode);
                currentNode = currentNode.parent;
            }

            return path.reverse(); // Returns the path from start to end rather than end to start
        }

        // Retrieves the adjacent node coordinates in eight directions (up/down/left/right/diagonals)
        let adjacentNodeCoordinates: Coordinates[] = [
            {x: current.x - 1, y: current.y - 1},
            {x: current.x - 1, y: current.y},
            {x: current.x - 1, y: current.y + 1},
            {x: current.x, y: current.y - 1},
            {x: current.x, y: current.y + 1},
            {x: current.x + 1, y: current.y - 1},
            {x: current.x + 1, y: current.y},
            {x: current.x + 1, y: current.y + 1},
        ];

        // Filters adjacent node coordinates to those within bounds, that also aren't obstacles
        adjacentNodeCoordinates = adjacentNodeCoordinates.filter(coordinates => {
            let x = current.x;
            let y = current.y;

            return (
                x >= bounds[0].x && x <= bounds[1].x &&
                y >= bounds[0].y && y <= bounds[1].y &&
                !obstacles.some(obstacle => obstacle.x === x && obstacle.y === y)
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
                x: x,
                y: y,
                g: current.g + Math.sqrt(2 - (x === current.x || y === current.y ? 1 : 0)),
                h: Math.sqrt(Math.abs(x - end.x) + Math.abs(y - end.y)),
                f: current.g + Math.sqrt(2 - (x === current.x || y === current.y ? 1 : 0)) + Math.sqrt(Math.abs(x - end.x) + Math.abs(y - end.y)), // If possible, could be defined more simply as g + h
                parent: current
            }

            adjacentNodes.push(currentAdjacent);
        }

        // For each adjacent node
        for (let i = 0; i < adjacentNodes.length; i++) {
            let adjacent = adjacentNodes[i];

            // Check if adjacent node is in the closed list, if so, skip it
            if (closedList.some(node => node.x === adjacent.x && node.y === adjacent.y)) {
                continue;
            } else {
                let openNode = openList.find(node => node.x === adjacent.x && node.y === adjacent.y); // If a node with the same x- and y-coordinates as the adjacent node exists, create open node

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

const path: Coordinates[] = [];
const nodes: gNode[] = aStar(startNode, endNode);

// Extracts x- and y-coordinates from nodes, then flips the y-coordinates
for (let i = 0; i < nodes.length; i++) {
    path.push({x: nodes[i].x, y: nodes[i].y});
    path[i].y = bounds[1].y - path[i].y;
}

// Flips y-coordinates of obstacles
for (let i = 0; i < obstacles.length; i++) {
    obstacles[i].y = bounds[1].y - obstacles[i].y;
}

export const pathCoordinates = path;
export const obstacleCoordinates = obstacles;

// Tests
console.log(pathCoordinates);
console.log(obstacleCoordinates);