/**
 * Global Node type
 */
export type Node = { 
    x: number; 
    y: number;
    z?: number;
};

/**
 * Dimensions of a given object
 */
export interface Dimension {
    width: number;
    height: number;
}

/**
 * The grid data for each map
 */
export interface Grid {
    columns: number;
    rows: number;
}

/**
 * Global function to get a Node
 * @param x coordinate
 * @param y coordinate
 * @param z coordinate or if it is undefined a 0
 * @returns a nodes position
 */
export function createNode(x: number, y: number, z: number = 0): Node {
    if(isNaN(x) || isNaN(y)) {
        throw new Error('Invalid node coordinate')
    }
    return { x, y, z }
}

/**
 * Creates a dimension
 * @param width How wide
 * @param height How long
 * @returns A dimension with the specified parameters
 */
export function createDimension(width: number, height: number): Dimension {
    return { width, height, }
}

/**
 * Creates a grid and handles errors
 * @param columns How many columns
 * @param rows How many rows
 * @returns A grid with the specified parameters
 */
export function createGrid(columns: number, rows: number): Grid {
    if(columns < 1 || rows < 1) {
        throw new Error("Grid must be greater than 0")
    }
    return { columns, rows }
}

/**
 * Given a node with depth (z) / independent position you can extract the global position in a 2d grid
 * @param relativeNode Where is the node located
 * @param mapDimensions The dimensions of each map
 * @param grid How many grids are there
 * @returns The global node
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
 * Given a global node without depth. You can extract the relative position inside each grid
 * @param globalNode The X and Y coordinate in the image
 * @param mapDimensions The dimensions of each map
 * @returns The X, Y and Z positions
 */
export function getRelativeNode(globalNode: Node, mapDimensions: Dimension): Node {
    const relativeX = globalNode.x % mapDimensions.width;
    const relativeY = globalNode.y % mapDimensions.height;
    let relativeZ = 0;
    let columnDepth = 0;

    if(globalNode.y > mapDimensions.height) {
        for (let y = globalNode.y - relativeY; y > 0 ; y -= mapDimensions.height) {
            for (let x = globalNode.x - relativeX; x > 0 ; x -= mapDimensions.width) {
                relativeZ++;
            }
            columnDepth++;
            relativeZ++;
        }
    
        relativeZ += columnDepth;
    } else {
        for (let x = globalNode.x - relativeX; x > 0 ; x -= mapDimensions.width) {
            relativeZ++;
        }
    }
    
    return { x: relativeX, y: relativeY, z: relativeZ }
}