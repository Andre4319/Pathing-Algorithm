/**
 * A Node is an object with an x property of type number and a y property of type number.
 * @property {number} x - number - the x-index of the node
 * @property {number} y - number - the y-index of the node
 * @property {number} z - number - the z-index of the node
 */
export type Node = { 
    x: number; 
    y: number;
    z?: number;
};

/**
 * The Dimension interface specifies the boundaries of a given map or an image.
 * @property {number} width - Specifies the max width (max x value) of the given object
 * @property {number} height - Specifies the max height (max y value) of the given object
 */
export interface Dimension {
    width: number;
    height: number;
}

/**
 * The grid interface takes a number of columns and rows
 * @property {number} columns - The number of columns in the grid
 * @property {number} rows - The number of rows in the grid
 */
export interface Grid {
    columns: number;
    rows: number;
}

/**
 * It creates a node object with the given x, y, and z coordinates
 * @param {number} x - coordinate
 * @param {number} y - coordinate
 * @param {number} [z=0] - coordinate
 * @returns A function that takes three parameters and returns a Node object.
 */
export function createNode(x: number, y: number, z: number = 0): Node {
    if(isNaN(x) || isNaN(y)) {
        throw new Error('Invalid node coordinate')
    }
    return { x, y, z }
}

/**
 * It takes two numbers, width and height, and returns a dimension object with the same two numbers as
 * properties
 * @param {number} width - number
 * @param {number} height - number
 * @returns A dimension object
 */
export function createDimension(width: number, height: number): Dimension {
    return { width, height, }
}

/**
 * It takes a number of columns and rows and returns a grid object with those columns and rows
 * @param {number} columns - number - The number of columns in the grid
 * @param {number} rows - number - The number of rows in the grid
 * @returns A grid with columns and rows
 */
export function createGrid(columns: number, rows: number): Grid {
    if(columns < 1 || rows < 1) {
        throw new Error("Grid must be greater than 0")
    }
    return { columns, rows }
}

/**
 * It takes a node, a grid, and a map dimension, and returns a node with x and y values, but
 * with the x and y values adjusted to the in regards to the z value of the relative node
 * @param {Node} relativeNode - The node that you want to get the global position of.
 * @param {Dimension} mapDimensions - The dimensions of the map.
 * @param {Grid} grid - The grid that the map is using.
 * @returns A node with the x and y coordinates of the node in the global map.
 */
export function getGlobalNode(relativeNode: Node, mapDimensions: Dimension, grid: Grid): Node {
    const { columns, rows } = grid;

    let newY = 0;
    let newX = (relativeNode.z ?? 0) % grid.columns;
    
    if(relativeNode.z && relativeNode.z >= columns && relativeNode.z <= columns * rows) {
        newY = Math.floor(relativeNode.z / columns);
    }
    
    return { 
        x: relativeNode.x + mapDimensions.width * newX, 
        y: relativeNode.y + mapDimensions.height * newY, 
    };
}

/**
 * It takes a global node, and returns a relative node
 * @param {Node} globalNode - The node with x and y coordinates that you want to get the relative node of.
 * @param depth - { xDepth: number, yDepth: number }
 * @param {Dimension} mapDimensions - The dimensions of the map.
 * @returns A node object with x, y, and z properties.
 */
export function getRelativeNode(globalNode: Node, depth: { xDepth: number, yDepth: number }, mapDimensions: Dimension): Node {
    const { width, height } = mapDimensions;
    if(globalNode.x <= width && globalNode.y <= height) { 
        return { x: globalNode.x, y: globalNode.y, z: 0 }; 
    }
    let relativeZ = 0;

    if(globalNode.y > height) {
        let y = globalNode.y - height;
        let x = globalNode.x - width;

        while(y > 0) {
            while(x > 0) {
                relativeZ++;
                x -= width;
            }
            y -= height;

            x = globalNode.x - width;
            relativeZ++;
        }
        
        relativeZ += Math.floor(globalNode.y / height);
    } else {
        relativeZ += Math.floor(globalNode.x / width);
    }

    return { 
        x: globalNode.x - (width * depth.xDepth) - depth.xDepth, 
        y: globalNode.y - (height * depth.yDepth) - depth.yDepth, 
        z: relativeZ 
    };
}