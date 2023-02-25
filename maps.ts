let fs = require('fs');
import * as PNGSync from 'pngjs/lib/png-sync';
import * as PNG from 'pngjs'

/**
 * Global Node type
 */
export type Node = { x: number, y: number, z?: number }

/**
 * Image file data
 */
interface Image {
    fileName: string;
    path?: string;
}

/**
 * Dimensions of a given object
 */
interface Dimension {
    width: number;
    height: number;
}

/**
 * The grid data for each map
 */
interface Grid {
    columns: number;
    rows: number;
}

/**
 * Fixed nodes/positions for the origin and end nodes
 */
interface FixedNodes {
    origin?: Node;
    end?: Node;
}

/**
 * Map data containing obstacles & all traversable nodes
 */
interface MapArray {
    traversable: Node[];
    obstacles?: Node[];
}

/**
 * A correct traversable map with nodes
 */
interface TraversableMap {
    image: Image;
    fixedNodes: FixedNodes;
    mapDimensions: Dimension;
    grid?: Grid;
    traversableMaps: MapArray[];
}

/**
 * Contains RGBA data
 */
interface Color {
    red: number;
    green: number;
    blue: number;
    alpha?: number;
}

/**
 * A exception in case of loading a map is a failure 
 */
class InvalidMapException extends Error {}

/**
 * The fixed color defenitions.
 * To add another you'll have to implement the handling of it
 * @see getAllNodes
 */
const ColorDefenitions: Map<string, Color> = new Map<string, Color>([
    ['map_background', {red: 255, green: 255, blue: 255, alpha: 255}],
    ['map_border',     {red: 23,  green: 23,  blue: 23,  alpha: 255}],
    ['map_obstacles',  {red: 0,   green: 0,   blue: 0,   alpha: 255}],
    ['map_origin',     {red: 255, green: 0,   blue: 0,   alpha: 255}],
    ['map_end',        {red: 0,   green: 255, blue: 0,   alpha: 255}],
    ['path_correct',   {red: 169, green: 204, blue: 155, alpha: 255}],
    ['path_searched',  {red: 255, green: 196, blue: 155, alpha: 255}],
]);

/**
 * Global function to get a Node
 * @param x coordinate
 * @param y coordinate
 * @param z coordinate or if it is undefined a 0
 * @returns a nodes position
 */
export function getNode(x: number, y: number, z: number = 0): Node {
	return { x, y, z, };
}

/**
 * Global function to load an image and converts it to a traversable map
 * @param image The image to be loaded
 * @param mapWidth The width of the maps
 * @param mapHeight The height of the maps
 * @returns A traverasble map
 */
export function loadImage(image: Image, mapWidth: number, mapHeight: number): TraversableMap {
    const fullImage: Image = {fileName: image.fileName, path: image.path ?? './resources'}
    const buffer = fs.readFileSync(`${fullImage.path}/${fullImage.fileName}`);
    const png = PNGSync.read(buffer);
    const { width, height } = png;

    return load(image, png, {width, height}, {width: mapWidth, height: mapHeight});
}

/**
 * Global function to draw a path with the specified parameters
 * @param image The image to be drawn upon
 * @param correctPath The quickest path from the origin to the end point specified by an algorithm 
 * @param searched What has been searched that isnt the correct path
 */
export function drawPath(image: Image, mapDimensions: Dimension, correctPath: Array<Node>, searched: Array<Node>) {
    const path = image.path ?? './resources';
    const targetDirectory = path + '/' + image.fileName.split('.')[0] + '/';
    fs.mkdirSync(targetDirectory, { recursive: true });

    fs.createReadStream(path + '/' + image.fileName)
        .pipe(new PNG.PNG({filterType: 4}))
        .on('parsed', function() {
            searched.forEach(node => {
                fillNodebyColor(this, mapDimensions, getGlobalNode(node, mapDimensions, getGrid({width: this.width, height: this.height}, mapDimensions)), ColorDefenitions.get('path_searched'), true)
            })

            correctPath.forEach(node => {
                fillNodebyColor(this, mapDimensions, getGlobalNode(node, mapDimensions, getGrid({width: this.width, height: this.height}, mapDimensions)), ColorDefenitions.get('path_correct'), true) 
            });
            
            // Write the modified image to a file
            this.pack().pipe(fs.createWriteStream(targetDirectory + 'complete.png'));
        });
}

/**
 * Global function to create a new traversable map with the specified parameters
 * @param imageDimension The dimension of the image
 * @param mapDimensions The dimensions of each map
 * @param fixedNodes The origin and end nodes
 * @param obstacles Nodes which are obstacles
 * @returns A new TraversableMap
 */
export function createTraversableMap(image: Image, imageDimension: Dimension, mapDimensions: Dimension, fixedNodes: FixedNodes, obstacles?: Node[]): TraversableMap {
    const traversableMaps: MapArray[] = [];
    let yDepth = 0;
    const grid: Grid = getGrid(imageDimension, mapDimensions);
    
    const png = new PNG.PNG({width: imageDimension.width + grid.columns - 1, height: imageDimension.height + grid.rows - 1});
    for (let y = 0; y < png.height; y++) {
        let xDepth = 0;
        const yBorder = mapDimensions.height * (yDepth + 1) + yDepth;

        yDepth += y > yBorder ? 1 : 0;

        for (let x = 0; x < png.width; x++) {
            const globalNode: Node = { x, y, }

            // FILL IN BACKGROUND
            fillNodebyColor(png, mapDimensions, globalNode, ColorDefenitions.get('map_background'), false)

            const xBorder = mapDimensions.width * (xDepth + 1) + xDepth

            if(x === xBorder) {
                fillNodebyColor(png, mapDimensions, globalNode, ColorDefenitions.get('map_border'), false)
                xDepth++;
                continue;
            }

            if(y === yBorder) {
                fillNodebyColor(png, mapDimensions, globalNode, ColorDefenitions.get('map_border'), false)
                continue;
            }

            const origin = getGlobalNode(fixedNodes.origin, mapDimensions, grid);
            const end = getGlobalNode(fixedNodes.end, mapDimensions, grid);

            if(compare(globalNode, {x: origin.x + xDepth, y: origin.y + yDepth})) {
                fillNodebyColor(png, mapDimensions, globalNode, ColorDefenitions.get('map_origin'), false)
                continue;
            } 

            if(compare(globalNode, {x: end.x + xDepth, y: end.y + yDepth})) {
                fillNodebyColor(png, mapDimensions, globalNode, ColorDefenitions.get('map_end'), false)
                continue;
            }

            if(obstacles === undefined || compare(obstacles, [])) { continue; }

            const isObstacle = obstacles.some(obstacle => { const obst = getGlobalNode(obstacle, mapDimensions, grid); return compare(globalNode, {x: obst.x + xDepth, y: obst.y + yDepth})});

            if(isObstacle) {
                fillNodebyColor(png, mapDimensions, globalNode, ColorDefenitions.get('map_obstacles'), false)
            }     
        }
    }
    const fullImage: Image = {fileName: image.fileName, path: image.path ?? './resources'};
    const outStream = fs.createWriteStream(`${fullImage.path}/${fullImage.fileName}`);
    png.pack().pipe(outStream);

    // GET ALL OBSTACLES
    for (let z = 0; z < grid.columns + grid.rows; z++) { 
        const nodeData = getAllNodes(png, z, imageDimension, mapDimensions, grid)
        traversableMaps.push({traversable: nodeData.allNodes.traversable, obstacles: nodeData.allNodes.obstacles})
    }

    return { image: fullImage, fixedNodes, mapDimensions, traversableMaps };
}

/**
 * Converts a map to a string
 * @param map The map to be printed
 * @param predicate If you wish to have custom symbols
 * @returns The entire map as a string
 */
export function convertMapToString(map: TraversableMap, predicate: (node: Node) => string): string[][] {
    const SYMBOLS = {
        origin:   ' S ',
        end:      ' E ',
        obstalce: ' O ',
        node:     ' - ',
    };

    const maps: string[][] = [];

    for(const { obstacles, traversable } of map.traversableMaps) {
        let mapString: string = '';

        for(let y = 0; y < map.mapDimensions.height; y++) {
            for(let x = 0; x < map.mapDimensions.width; x++) {
                const node: Node = { x, y }

                const isObstacle: boolean = obstacles?.some(({x: obstacleX, y: obstacleY }) => {
                    return obstacleX === x &&
                           obstacleY === y;
                });

                if(isObstacle) {
                    mapString += SYMBOLS.obstalce;
                } else {
                    if(compare(node, map.fixedNodes.origin)) {
                        mapString += SYMBOLS.origin;
                    } else if(compare(node, map.fixedNodes.end)) {
                        mapString += SYMBOLS.end;
                    } else {
                        const customSymbol = predicate({ ...node});
                        mapString += customSymbol === '' ? SYMBOLS.node : customSymbol;
                    }
                }
            }

            mapString += '\n';
        }
        maps.push(mapString.trimEnd().split('\n'));
    }

    return maps;
}

/**
 * Compares two objects
 * @param first object
 * @param second object
 * @returns if the first and second are equal
 */
function compare<T>(first: T, second: T): boolean {
    const keys = Object.keys(first) as Array<keyof T>;
    return keys.every(key => first[key] == second[key]);
}

/**
 * Gets the grid size of the image
 * @param imageDimension The dimension of the image
 * @param mapDimensions The dimensions of each map
 * @returns The columns and rows of the image
 */
function getGrid(imageDimension: Dimension, mapDimensions: Dimension): Grid {
    return {
        columns: Math.floor(imageDimension.width / mapDimensions.width), 
        rows: Math.floor(imageDimension.height / mapDimensions.height),
    };
}

/**
 * Given a node with depth (z) / independent position you can extract the global position in a 2d grid
 * @param relativeNode Where is the node located
 * @param mapDimensions The dimensions of each map
 * @param grid How many grids are there
 * @returns The global node
 */
function getGlobalNode(relativeNode: Node, mapDimensions: Dimension, grid: Grid): Node {
    const { columns, rows } = grid;

    let newY = 0;
    let newX = (relativeNode.z ?? 0) % grid.columns;
    
    if(relativeNode.z && relativeNode.z >= columns && relativeNode.z <= columns * rows) {
        newY = Math.floor(relativeNode.z / columns);
    }
    
    return { x: relativeNode.x + mapDimensions.width * newX, 
             y: relativeNode.y + mapDimensions.height * newY, };
}

/**
 * Given a global node without depth. You can extract the relative position inside each grid
 * @param globalNode The X and Y coordinate in the image
 * @param mapDimensions The dimensions of each map
 * @returns The X, Y and Z positions
 */
function getRelativeNode(globalNode: Node, mapDimensions: Dimension): Node {
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
    
        for(let column = 0; column < columnDepth; column++) {
            relativeZ++;
        }
    } else {
        for (let x = globalNode.x - relativeX; x > 0 ; x -= mapDimensions.width) {
            relativeZ++;
        }
    }
    
    return {x: relativeX, y: relativeY, z: relativeZ}
}

/**
 * Colors in a node with a given position
 * @param png The image
 * @param node The node to color in
 * @param red color between 0 - 255
 * @param green color between 0 - 255
 * @param blue color between 0 -255
 */
function fillNode(png:any, mapDimensions: Dimension, node: Node, red: number, green: number, blue: number, alpha: number) {
    const globalNode: Node = getGlobalNode(node, mapDimensions, getGrid({width: png.width, height: png.height}, mapDimensions))
    const idx: number = (png.width * globalNode.y + globalNode.x) << 2;
    png.data[idx] = limit(red, 0, 255);
    png.data[idx + 1] = limit(green, 0, 255);
    png.data[idx + 2] = limit(blue, 0, 255);
    png.data[idx + 3] = limit(alpha, 0, 255);
}

/**
 * Colors in a node with a given position
 * @param png The png instance
 * @param globalNode The node to color in
 * @param color The color values
 * @param adjustForBorder If the nodes positions should be adjusted in accordance with map borders
 */
function fillNodebyColor(png:any, mapDimensions: Dimension, globalNode: Node, color: Color, adjustForBorder: boolean) {
    if(adjustForBorder) {
        let yDepth = 0;
        let xDepth = 0;
        for (let y = 0; y < globalNode.y; y += mapDimensions.height) {
            yDepth++;
        }

        for (let x = 0; x < globalNode.x; x += mapDimensions.width) {
            xDepth++;
        }
        return fillNode(png, mapDimensions, { x: globalNode.x + xDepth - 1, y: globalNode.y + yDepth - 1 }, color.red, color.green, color.blue, color.alpha);
    }
    return fillNode(png, mapDimensions, globalNode, color.red, color.green, color.blue, color.alpha);
}

/**
 * Limits a value to a minimum value and a maximum value
 * @param value To compare
 * @param min Value can't be less this value
 * @param max Value can't exceed this value
 * @returns The value or min/max
 */
function limit(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    } else if (value > max) {
        return max;
    } else {
        return value;
    }
}

/**
 * Retrieves all nodes (origin and end points, all obstacles and traversable nodes)
 * @param png The png instance
 * @param z What depth to search in
 * @param grids How many grids are there
 * @param imageDimension The dimension of the image
 * @param mapDimensions The dimensions of each map
 * @returns All fixed nodes, all obstacles and traversable nodes
 */
function getAllNodes(png: any, z: number, imageDimension: Dimension, mapDimensions: Dimension, grids: Grid): { fixedNodes: FixedNodes; allNodes: MapArray } {
    const positionData: { fixedNodes: FixedNodes;  allNodes: MapArray } = {
        fixedNodes: { origin: undefined, end: undefined },
        allNodes:   { traversable: [], obstacles: [] },
    };

    let min: Node = getGlobalNode({x: 0, y: 0, z}, mapDimensions, grids);

    for (let y = min.y; y < min.y + mapDimensions.height; y++) {
        for (let x = min.x; x < min.x + mapDimensions.width; x++) {
            const idx = (imageDimension.width * y + x) << 2;
            
            // RGB VALUES
            const pixelColor: Color = { 
                red: png.data[idx], 
                green: png.data[idx + 1], 
                blue: png.data[idx + 2], 
                alpha: 255,
            };

            const originColor: Color = ColorDefenitions.get('map_origin');
            const endColor: Color    = ColorDefenitions.get('map_end');
            const mapColor: Color    = ColorDefenitions.get('map_background');
            const mapObstacle: Color = ColorDefenitions.get('map_obstacles');

            if(compare(mapColor, pixelColor)) {
                positionData.allNodes.traversable.push(getNode(x,y,z));
            } else if(compare(originColor, pixelColor)) {
                positionData.fixedNodes.origin = getNode(x,y,z);
            } else if(compare(endColor, pixelColor)) {
                positionData.fixedNodes.end = getNode(x,y,z);
            } else if(compare(mapObstacle, pixelColor)) {
                positionData.allNodes.obstacles.push(getNode(x,y,z));
            }
        }
    }

    return positionData;
}

/**
 * Loads an image and creates a new traversable map
 * @param png The png instance
 * @param imageDimension The dimension of the image
 * @param mapDimensions The dimensions of each map
 * @returns A new TraversableMap
 */
function load(image: Image, png: any, imageDimension: Dimension, mapDimensions: Dimension): TraversableMap {
    const grid: Grid = getGrid(imageDimension, mapDimensions);
    const fixedNodes: FixedNodes = {};
    const traversableMaps: MapArray[] = [];

    for (let z = 0; z < (grid.columns + grid.rows - 2) + 1; z++) {
        for (let y = 0; y < grid.rows; y++) {
            for (let x = 0; x < grid.columns; x++) { 
                const nodes: { fixedNodes: FixedNodes; allNodes: MapArray; } = getAllNodes(png, z, imageDimension, mapDimensions, grid);
                const map: MapArray = { traversable: nodes.allNodes.traversable, obstacles: nodes.allNodes.obstacles };
                
                if(nodes.fixedNodes.origin != undefined) {
                    fixedNodes.origin = nodes.fixedNodes.origin;
                }
    
                if(nodes.fixedNodes.end != undefined) {
                    fixedNodes.end = nodes.fixedNodes.end;
                }

                traversableMaps.push(map);
            }
        }
    }

    if(fixedNodes === undefined || fixedNodes.origin === undefined || fixedNodes.end === undefined) {
        throw new InvalidMapException("Can't obtain a start and/or 'end' positions");
    } else {
        return { image, fixedNodes, mapDimensions, grid, traversableMaps};
    }
}