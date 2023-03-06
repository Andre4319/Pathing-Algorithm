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