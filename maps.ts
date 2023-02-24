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
    fixedNodes: FixedNodes;
    mapDimensions: Dimension;
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
    ['map_border',     {red: 0,   green: 0,   blue: 0,   alpha: 255}],
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
    const buffer = fs.readFileSync(`${image.path ?? './resources'}/${image.fileName}`);
    const png = PNGSync.read(buffer);
    const { width, height } = png;

    return load(png, {width, height}, {width: mapWidth, height: mapHeight});
}

/**
 * Global function to draw a path with the specified parameters
 * @param image The image to be drawn upon
 * @param correctPath The quickest path from the origin to the end point specified by an algorithm 
 * @param searched What has been searched that isnt the correct path
 */
export function drawPath(image: Image, correctPath: Array<Node>, searched: Array<Node>) {
    const targetDirectory = image.path + '/' + image.fileName.split('.')[0] + '/';
    fs.mkdirSync(targetDirectory, { recursive: true });

    fs.createReadStream(image.path + '/' + image.fileName)
        .pipe(new PNG.PNG({filterType: 4}))
        .on('parsed', function() {
            searched.forEach(node => {
                fillNodebyColor(this, node, ColorDefenitions.get('path_searched'));
            })

            correctPath.forEach(node => {
                fillNodebyColor(this, node, ColorDefenitions.get('path_correct')); 
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
export function createTraversableMap(imageDimension: Dimension, mapDimensions: Dimension, fixedNodes: FixedNodes, obstacles?: Node[]): TraversableMap {
    const traversableMaps: MapArray[] = [];
    
    const grids: Grid = {
        columns: Math.floor(imageDimension.width / mapDimensions.width), 
        rows: Math.floor(imageDimension.height / mapDimensions.height),
    };

    for (let z = 0; z < grids.columns + grids.rows; z++) {
        const traversable: Node[] = [];
        const allObstacles: Node[] = [];
        for (let y = 0; y < mapDimensions.height; y++) {
            for (let x = 0; x < mapDimensions.width; x++) {
                const node: Node = { x, y, z, };
                
                if(obstacles === undefined || compare(obstacles, [])) {
                    traversable.push(node);
                } else {

                    const isObstacle = obstacles.some(obstacle => {
                        return obstacle.x === node.x && obstacle.y === node.y && obstacle.z === node.z;
                    })

                    if(isObstacle) {
                        allObstacles.push(node);
                    } else {
                        traversable.push(node);
                    }
                }
            }
        }
        traversableMaps.push({traversable, obstacles: allObstacles})
    }


    return { fixedNodes, mapDimensions, traversableMaps };
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
 * Given a node with depth (z) / independent position you can extract the global position in a 2d grid
 * @param node Where is the node located
 * @param mapDimensions The dimensions of each map
 * @param grids How many grids are there
 * @returns The global node
 */
function getGridPosition(node: Node, mapDimensions: Dimension, grids: Grid): Node {
    const { columns, rows } = grids;

    let newY = 0;
    let newX = (node.z ?? 0) % grids.columns;
    
    if(node.z && node.z >= columns && node.z <= columns * rows) {
        newY = Math.floor(node.z / columns);
    }
    
    return { x: node.x + mapDimensions.width * newX, 
             y: node.y + mapDimensions.height * newY, };
}

/**
 * Colors in a node with a given position
 * @param png The image
 * @param node The node to color in
 * @param red color between 0 - 255
 * @param green color between 0 - 255
 * @param blue color between 0 -255
 */
function fillNode(png:any, node: Node, red: number, green: number, blue: number, alpha: number) {
    const idx: number = (png.width * node[1] + node[0]) << 2;
    png.data[idx] = limit(red, 0, 255);
    png.data[idx + 1] = limit(green, 0, 255);
    png.data[idx + 2] = limit(blue, 0, 255);
    png.data[idx + 3] = limit(alpha, 0, 255);
}

/**
 * Colors in a node with a given position
 * @param png The image
 * @param node The node to color in
 * @param color The color values
 */
function fillNodebyColor(png:any, node: Node, color: Color) {
    fillNode(png, node, color.red, color.blue, color.green, color.alpha);
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

    let min: Node = getGridPosition({x: 0, y: 0, z}, mapDimensions, grids);

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
            const endColor: Color = ColorDefenitions.get('map_end');
            const mapColor: Color = ColorDefenitions.get('map_background');

            if(compare(mapColor, pixelColor)) {
                positionData.allNodes.traversable.push(getNode(x,y,z));
            } else if(compare(originColor, pixelColor)) {
                positionData.fixedNodes.origin = getNode(x,y,z);
            } else if(compare(endColor, pixelColor)) {
                positionData.fixedNodes.end = getNode(x,y,z);
            } else {
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
function load(png: any, imageDimension: Dimension, mapDimensions: Dimension): TraversableMap {
    const grids: Grid = {
        columns: Math.floor(imageDimension.width / mapDimensions.width), 
        rows: Math.floor(imageDimension.height / mapDimensions.height),
    };
    const fixedNodes: FixedNodes = {};
    const traversableMaps: MapArray[] = [];

    for (let z = 0; z < (grids.columns + grids.rows - 2) + 1; z++) {
        for (let y = 0; y < grids.rows; y++) {
            for (let x = 0; x < grids.columns; x++) { 
                const nodes: { fixedNodes: FixedNodes; allNodes: MapArray; } = getAllNodes(png, z, imageDimension, mapDimensions, grids);
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
        return { fixedNodes, mapDimensions, traversableMaps, };
    }
}