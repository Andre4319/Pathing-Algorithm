// A* 3D Search Algorithm

// Node structure
type gNode3D = {
    x: number, // x-coordinate
    y: number, // y-coordinate
    z: number, // z-coordinate
    g: number, // distance/movement cost from start to node
    h: number, // distance/movement cost from node to end
    f: number, // the sum of g and h
    parent?: gNode3D // A parent node, i.e. the previous node in the path
}

type Coordinates3D = {
    x: number,
    y: number,
    z: number
}

// Enter desired values
const startPos3D: Coordinates3D = {x: 7, y: 1, z: 0};
const endPos3D: Coordinates3D = {x: 4, y: 4, z: 2};
const obstacles3D: Coordinates3D[] = [
    {x: 3, y: 3, z: 0}, {x: 4, y: 3, z: 0}, {x: 5, y: 3, z: 0}, {x: 6, y: 3, z: 0}, {x: 7, y: 3, z: 0}, {x: 3, y: 4, z: 0}, 
    {x: 3, y: 3, z: 1}, {x: 4, y: 3, z: 1}, {x: 5, y: 3, z: 1}, {x: 6, y: 3, z: 1}, {x: 7, y: 3, z: 1}, {x: 3, y: 4, z: 1}, {x: 5, y: 4, z: 1}, {x: 5, y: 5, z: 1},
    {x: 3, y: 3, z: 2}, {x: 4, y: 3, z: 2}, {x: 5, y: 3, z: 2}, {x: 6, y: 3, z: 2}, {x: 7, y: 3, z: 2}, {x: 3, y: 4, z: 2}, {x: 5, y: 4, z: 2}, {x: 5, y: 5, z: 2},
];


const bounds3D: Coordinates3D[] = [{x: 0, y: 0, z: 0}, {x: 10, y: 5, z: 2}];

// Only x- and y-Coordinates3D are of relevance
const startNode3D: gNode3D = {
    x: startPos3D.x,
    y: startPos3D.y,
    z: startPos3D.z,
    g: 0,
    h: 0,
    f: 0,
    parent: undefined
};

// Only x- and y-Coordinates3D are of relevance
const endNode3D: gNode3D =  {
    x: endPos3D.x,
    y: endPos3D.y,
    z: endPos3D.z,
    g: 0,
    h: 0,
    f: 0,
    parent: undefined
}

function aStar3d(start: gNode3D, end: gNode3D): gNode3D[] {
    let openList: gNode3D[] = [start]; // Open list contains nodes to be evaluated, start node is its initial node
    let closedList: gNode3D[] = []; // Closed list contains nodes already evaluated

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
        if (current.x === end.x && current.y === end.y && current.z === end.z) {
            let path: gNode3D[] = [];
            let currentNode: gNode3D | undefined = current;

            while (currentNode) { // While current node exists, add current to path, then set current to its parent
                path.push(currentNode);
                currentNode = currentNode.parent;
            }

            return path.reverse(); // Returns the path from start to end rather than end to start
        }

        // Retrieves the adjacent node Coordinates3D in 26 directions
        let adjacentNodeCoordinates3D: Coordinates3D[] = [];
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    for (let k = -1; k <= 1; k++) {
                        if (i === 0 && j === 0 && k === 0) continue;
                        adjacentNodeCoordinates3D.push({x: current.x + i, y: current.y + j, z: current.z + k});
                    }
                }
            }

        // Filters adjacent node Coordinates3D to those within bounds3D, that also aren't obstacles3D
        adjacentNodeCoordinates3D = adjacentNodeCoordinates3D.filter(Coordinates3D => {
            let x = current.x;
            let y = current.y;
            let z = current.z;

            return (
                x >= bounds3D[0].x && x <= bounds3D[1].x &&
                y >= bounds3D[0].y && y <= bounds3D[1].y &&
                z >= bounds3D[0].z && z <= bounds3D[1].z &&
                !obstacles3D.some(obstacle => obstacle.x === x && obstacle.y === y && obstacle.z === z)
            );
        });

        let adjacentNodes: gNode3D[] = [];

        // Constructs adjacent nodes for each adjacent node coordinate
        for (let i = 0; i < adjacentNodeCoordinates3D.length; i++) {
            let x = adjacentNodeCoordinates3D[i].x;
            let y = adjacentNodeCoordinates3D[i].y;
            let z = adjacentNodeCoordinates3D[i].z;

            // Assumed distance/movement cost for straight movement is 1, diagonal movement is sqrt(2) or sgrt(3)
            // For g-, h- and f-costs, if x- or y-values remain unchanged, movement is straight, otherwise it's diagonal
            let currentAdjacent: gNode3D = {
                x: x,
                y: y,
                z: z,
                g: current.g + Math.sqrt(Math.abs(x-current.x) + Math.abs(y-current.y) + Math.abs(z-current.z)*1.5),
                h: Math.sqrt((current.x - end.x)^2 + (current.y - end.y)^2 + ((current.z - end.z)^2)*1.5),
                f: current.g + Math.sqrt(Math.abs(x-current.x) + Math.abs(y-current.y) + Math.abs(z-current.z)*1.5) + Math.sqrt((current.x - end.x)^2 + (current.y - end.y)^2 + (((current.z - end.z)^2)*1.5)),
                parent: current
            }

            adjacentNodes.push(currentAdjacent);
        }

        // For each adjacent node
        for (let i = 0; i < adjacentNodes.length; i++) {
            let adjacent = adjacentNodes[i];

            // Check if adjacent node is in the closed list, if so, skip it
            if (closedList.some(node => node.x === adjacent.x && node.y === adjacent.y && node.z === adjacent.z)) {
                continue;
            } else {
                let openNode = openList.find(node => node.x === adjacent.x && node.y === adjacent.y && node.z === adjacent.z); // If a node with the same coordinates as the adjacent node exists, create open node

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

let pathCoordinates3D: Coordinates3D[] = [];
let nodes3D: gNode3D[] = aStar3d(startNode3D, endNode3D);

for (let i = 0; i < nodes3D.length; i++) {
    pathCoordinates3D.push({x: nodes3D[i].x, y: nodes3D[i].y, z: nodes3D[i].z});
}
console.log(nodes3D)
console.log(pathCoordinates3D);
