// DEPRECATED
// USE 'TraversableMap.ts' INSTEAD
let fs = require('fs');
import * as PNGSync from 'pngjs/lib/png-sync';
import * as PNG from 'pngjs'
import { type Node, type Dimension, type Grid, createNode, getRelativeNode, getGlobalNode } from './Position';
import { equals, limit } from './Util';

/**
 * Image file data
 */
interface Image {
    fileName: string;
    path?: string;
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
interface ITraversableMap {
    image: Image;
    fixedNodes: FixedNodes;
    mapDimensions: Dimension;
    grid?: Grid;
    traversableMaps: MapArray[];
}

/**
 * Contains RGBA data
 */
type color = {
    red: number;
    green: number;
    blue: number;
    alpha?: number;
}

/**
 * A exception in case of loading a map is a failure 
 */
class InvalidMapException extends Error {}

enum ColorKey {
    MapBackground = 'map_background',
    MapBorder = 'map_border',
    MapObstacles = 'map_obstacles',
    MapOrigin = 'map_origin',
    MapEnd = 'map_end',
    PathCorrect = 'path_correct',
    PathSearched = 'path_searched',
}

/**
 * The fixed color defenitions.
 * To add another you'll have to implement the handling of it
 * @see getAllNodes
 */
const ColorDefenitions: Map<string, color> = new Map<string, color>([
    [ColorKey.MapBackground, { red: 255, green: 255, blue: 255, alpha: 1 }],
    [ColorKey.MapBorder,     { red: 23,  green: 23,  blue: 23,  alpha: 1 }],
    [ColorKey.MapObstacles,  { red: 0,   green: 0,   blue: 0,   alpha: 1 }],
    [ColorKey.MapOrigin,     { red: 255, green: 0,   blue: 0,   alpha: 1 }],
    [ColorKey.MapEnd,        { red: 0,   green: 255, blue: 0,   alpha: 1 }],
    [ColorKey.PathCorrect,   { red: 169, green: 204, blue: 155, alpha: 1 }],
    [ColorKey.PathSearched,  { red: 255, green: 196, blue: 155, alpha: 1 }],
]);

/**
 * Global function to load an image and converts it to a traversable map
 * @param image The image to be loaded
 * @param mapWidth The width of the maps
 * @param mapHeight The height of the maps
 * @returns A traverasble map
 */
export function loadImage(image: Image, mapWidth: number, mapHeight: number): ITraversableMap {
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
export function createTraversableMap(image: Image, imageDimension: Dimension, mapDimensions: Dimension, fixedNodes: FixedNodes, obstacles?: Node[]): ITraversableMap {
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

            if(equals(globalNode, {x: origin.x + xDepth, y: origin.y + yDepth})) {
                fillNodebyColor(png, mapDimensions, globalNode, ColorDefenitions.get('map_origin'), false)
                continue;
            } 

            if(equals(globalNode, {x: end.x + xDepth, y: end.y + yDepth})) {
                fillNodebyColor(png, mapDimensions, globalNode, ColorDefenitions.get('map_end'), false)
                continue;
            }

            if(obstacles === undefined || equals(obstacles, [])) { continue; }

            const isObstacle = obstacles.some(obstacle => { const obst = getGlobalNode(obstacle, mapDimensions, grid); return equals(globalNode, {x: obst.x + xDepth, y: obst.y + yDepth})});

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
export function convertMapToString(map: ITraversableMap, predicate: (node: Node) => string): string[][] {
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
                    if(equals(node, map.fixedNodes.origin)) {
                        mapString += SYMBOLS.origin;
                    } else if(equals(node, map.fixedNodes.end)) {
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
    png.data[idx + 3] = Math.floor(255 * limit(alpha, 0, 1));
}

/**
 * Colors in a node with a given position
 * @param png The png instance
 * @param globalNode The node to color in
 * @param color The color values
 * @param adjustForBorder If the nodes positions should be adjusted in accordance with map borders
 */
function fillNodebyColor(png:any, mapDimensions: Dimension, globalNode: Node, color: color, adjustForBorder: boolean) {
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
 * Retrieves all nodes (origin and end points, all obstacles and traversable nodes)
 * @param png The png instance
 * @param z What depth to search in
 * @param grid How many grids are there
 * @param imageDimension The dimension of the image
 * @param mapDimensions The dimensions of each map
 * @returns All fixed nodes, all obstacles and traversable nodes
 */
function getAllNodes(png: any, z: number, imageDimension: Dimension, mapDimensions: Dimension, grid: Grid): { fixedNodes: FixedNodes; allNodes: MapArray } {
    const positionData: { fixedNodes: FixedNodes;  allNodes: MapArray } = {
        fixedNodes: { origin: undefined, end: undefined },
        allNodes:   { traversable: [], obstacles: [] },
    };

    let min: Node = getGlobalNode({x: 0, y: 0, z}, mapDimensions, grid);

    for (let y = min.y; y < min.y + mapDimensions.height; y++) {
        for (let x = min.x; x < min.x + mapDimensions.width; x++) {
            const idx = (imageDimension.width * y + x) << 2;
            
            // RGB VALUES
            const pixelColor: color = { 
                red: png.data[idx], 
                green: png.data[idx + 1], 
                blue: png.data[idx + 2], 
                alpha: 255,
            };

            const originColor: color = ColorDefenitions.get(ColorKey.MapOrigin);
            const endColor: color    = ColorDefenitions.get(ColorKey.MapEnd);
            const mapColor: color    = ColorDefenitions.get(ColorKey.MapBackground);
            const mapObstacle: color = ColorDefenitions.get(ColorKey.MapObstacles);

            if(equals(mapColor, pixelColor)) {
                positionData.allNodes.traversable.push(createNode(x,y,z));
            } else if(equals(originColor, pixelColor)) {
                positionData.fixedNodes.origin = createNode(x,y,z);
            } else if(equals(endColor, pixelColor)) {
                positionData.fixedNodes.end = createNode(x,y,z);
            } else if(equals(mapObstacle, pixelColor)) {
                positionData.allNodes.obstacles.push(createNode(x,y,z));
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
function load(image: Image, png: any, imageDimension: Dimension, mapDimensions: Dimension): ITraversableMap {
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