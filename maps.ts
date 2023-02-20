let fs = require('fs');
import * as PNGSync from 'pngjs/lib/png-sync';
import * as PNG from 'pngjs'

type Color = {red: number, green: number, blue: number, alpha: number | undefined}
const ColorDefenitions: Map<string, Color> = new Map<string, Color>([
    ["map_background", {red: 255, green: 255, blue: 255, alpha: 255}],
    ["map_border",     {red: 0,   green: 0,   blue: 0,   alpha: 255}],
    ["map_obstacles",  {red: 0,   green: 0,   blue: 0,   alpha: 255}],
    ["map_origin",     {red: 255, green: 0,   blue: 0,   alpha: 255}],
    ["map_end",        {red: 0,   green: 255, blue: 0,   alpha: 255}],
    ["path_correct",   {red: 169, green: 204, blue: 155, alpha: 255}],
    ["path_searched",  {red: 255, green: 196, blue: 155, alpha: 255}],
]);
export type Node = [ x: number, y: number, z: number | undefined ]
type StaticNodes = { origin: Node, end: Node }

type Image = { name: string, path: string }
type Boundary = { width: number, height: number }

type MapArray = { obstacles: Node[] | undefined, traversable: Node[] }
export type TraversableMap = { static: StaticNodes, boundary: Boundary, allNodes: Map<number, MapArray> }

/**
 * Global function to get a Node
 * @param x coordinate
 * @param y coordinate
 * @param z coordinate or if it is undefined a 0
 * @returns a nodes position
 */
export function getNode(x: number, y: number, z: number | undefined): Node {
	return [x, y, z === undefined ? 0 : z];
}

/**
 * Global function to load an image and converts it to a traversable map
 * @param image The image to be
 * @param map_width The width of the maps
 * @param map_height The height of the maps
 * @returns A traverasble map
 */
export function loadImage(image: Image, map_width: number, map_height: number): TraversableMap {
    const buffer = fs.readFileSync(image.path + '/' + image.name);
    const png = PNGSync.read(buffer);
    const { width, height } = png;

    return load(png, {width, height}, {width: map_width, height: map_height});
}

/**
 * Global function to draw a path with the specified parameters
 * @param image The image to be drawn upon
 * @param correctPath The quickest path from the origin to the end point specified by an algorithm 
 * @param searched What has been searched that isnt the correct path
 */
export function drawPath(image: Image, correctPath: Array<Node>, searched: Array<Node>) {
    const targetDirectory = image.path + '/' + image.name.split('.')[0] + '/';
    fs.mkdirSync(targetDirectory, { recursive: true });

    fs.createReadStream(image.path + '/' + image.name)
        .pipe(new PNG.PNG({filterType: 4}))
        .on('parsed', function() {
            searched.forEach(node => {
                fillNodebyColor(this, node, ColorDefenitions.get("path_searched"));
            })

            correctPath.forEach(node => {
                fillNodebyColor(this, node, ColorDefenitions.get("path_correct")); 
            });
            
            // Write the modified image to a file
            this.pack().pipe(fs.createWriteStream(targetDirectory + 'complete.png'));
        });
}

/**
 * Global function to create a new traversable map with the specified parameters
 * @param imageBoundry The dimensions of the new image
 * @param mapBoundary The dimensions of the maps
 * @param staticNodes The static nodes of the image
 * @param obstacles The nodes of all obstacles
 * @returns A traversable map and a new image
 */
export function createMap(imageBoundry: Boundary, mapBoundary: Boundary, staticNodes: StaticNodes, obstacles: Node[] | undefined): TraversableMap {
    if(staticNodes.origin.toString() == staticNodes.end.toString()) {
        throw new InvalidMapException("Origin and end points can't have the same position");
    }

    if(imageBoundry.width < mapBoundary.width || imageBoundry.height < mapBoundary.height) {
        throw new InvalidMapException("The image boundaries must exceed the map boundaries");
    }

    const depth: [number, number] = [Math.floor(imageBoundry.width / mapBoundary.width), Math.floor(imageBoundry.height / mapBoundary.height)]
    const png = new PNG.PNG({width: imageBoundry.width + depth[0] - 1, height: imageBoundry.height + depth[1] - 1});
    let yDepth: number = 0;
    const traversableMaps: Map<number, MapArray> = new Map<number, MapArray>(); 

    for(let y = 0; y < png.height; y++) {
        let xDepth: number = 0;
        for(let x = 0; x < png.width; x++) {
            // Y MAP BORDER
            if (x % mapBoundary.width === 0 && x != 0 && x != imageBoundry.width) {
                fillNodebyColor(png, [x, y, undefined], ColorDefenitions.get("map_border"));
                xDepth++;
            // X MAP BORDER
            } else if (y % mapBoundary.height === 0 && y != 0 && y != imageBoundry.height) {
                fillNodebyColor(png, [x, y, undefined], ColorDefenitions.get("map_border"));
                if(y >= mapBoundary.height * (yDepth + 1)) {
                    yDepth++;
                }
            } else {
                // OBSTACLES
                if(obstacles != undefined) {
                    const hasObstacles: boolean = obstacles.some(subArray => {
                        let { newX, newY }: { newX: number; newY: number; } = getGridPosition(subArray, depth);
                        return subArray.length === 3 && 
                               subArray[0] + (mapBoundary.width * newX) + xDepth === x && // X
                               subArray[1] + (mapBoundary.height * newY) + yDepth === y; // Y
                    });
                    if(hasObstacles) {
                        fillNodebyColor(png, [x, y, undefined], ColorDefenitions.get("map_obstacles"));
                        continue;
                    }
                }
                let originCoordinates = getGridPosition(staticNodes.origin, depth);
                let endCoordinates = getGridPosition(staticNodes.end, depth);

                // ORIGIN POINT
                if(x === (mapBoundary.width * originCoordinates.newX) + xDepth + staticNodes.origin[0] && 
                   y === (mapBoundary.height * originCoordinates.newY) + yDepth + staticNodes.origin[1]) {
                    fillNodebyColor(png, [x, y, undefined], ColorDefenitions.get("map_origin"))
                    continue;
                }

                // END POINT
                if(x === (mapBoundary.width * endCoordinates.newX) + xDepth + staticNodes.end[0] && 
                   y === (mapBoundary.height * endCoordinates.newY) + yDepth + staticNodes.end[1]) { 
                    fillNodebyColor(png, [x, y, undefined], ColorDefenitions.get("map_end"))
                    continue;
                }
                // FILL IN WHITE
                fillNodebyColor(png, [x, y, undefined], ColorDefenitions.get("map_background"))
            }
        }
    }

    // CREATES THE IMAGE FILE
    const outStream = fs.createWriteStream('./resources/output.png');
    png.pack().pipe(outStream);

    return { static: staticNodes, boundary: imageBoundry, allNodes: traversableMaps }
    
}

/**
 * Converts a map to a string
 * @param map The map to be printed
 * @param predicate If you wish to have custom symbols
 * @returns The entire map as a string
 */
export function convertMapToString(map: TraversableMap, predicate: (base: string, node: Node) => string): string {
    const origin_symbol = ' S ', end_symbol = ' E ', obstacle_symbol = ' O ', node_symbol = ' - '
    let xp = "";
    for(let y = 0; y < map.boundary.height; y++) {
        for(let x = 0; x < map.boundary.width; x++) {
            const hasObstacles: boolean = map.allNodes.get(0).obstacles.some(subArray => {
                return subArray.length === 3 && 
                       subArray[0] === x && // X
                       subArray[1] === y; // Y
            });

            if(hasObstacles) {
                xp += obstacle_symbol;
            } else {
                if(x === map.static.origin[0] && y === map.static.origin[1]) {
                    xp += origin_symbol;
                } else if(x === map.static.end[0] && y === map.static.end[1]) {
                    xp += end_symbol;
                } else {
                    const customSymbol = predicate(node_symbol, getNode(x, y, 0));
                    xp += customSymbol === '' ? node_symbol : customSymbol;
                }
            }
        }
        xp += '\n'
    }

    return xp;
}

/**
 * Given a node with depth (z) you can extract the position in a 2d grid
 * @param node To search
 * @param depth The depth of the map
 * @returns x & y coordinates
 */
function getGridPosition(node: Node, depth: [number, number]): { newX: number, newY: number} {
    let newX: number = 0, newY: number = 0;
    const depthCheck = depth[1] === 1 ? depth[0] : depth[1];
    if (node[2] === 0) { // FIRST GRID
        newX = 0;
        newY = 0;
    } else if (node[2] < depthCheck) { // TOP GRIDS
        newX = depth[0] - node[2];
        newY = 0; 
    } else if (node[2] === depth[0]) { // AFTER ALL TOP GRIDS
        newX = 0;
        newY++;
    } else { // BOTTOM GRIDS
        newX = node[2] - depth[0];
        newY++;
    }
    return { newX, newY };
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
    const idx: number = (png.width * node[1] + node[0]) << 2
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
    fillNode(png, node, color.red, color.blue, color.green, color.alpha === undefined ? 255 : color.alpha);
}

/**
 * Limits a value to a minimum value and a maximum value
 * @param value To compare
 * @param min Value can't be less this value
 * @param max Value can't exceed this value
 * @returns The value or min/max
 */
function limit(value: number, min: number, max: number): number {
    return value < min ? min : value > max ? max : value;
}

/**
 * A exception in case of loading a map is a failure 
 * @param message The message to be thrown
 */
function InvalidMapException(message: string) {
    this.message = message;
    this.name = "InvalidMapException";
}

/**
 * Gets all nodes (origin and end points, all obstacles and traversable nodes)
 * @param png The image
 * @param imageBoundry The images boundries 
 * @param startPos Map starting nodes
 * @param mapBoundary The maps boundries
 * @returns All nodes in the image
 */
function getAllNodes(png: any, imageBoundry: Boundary, startPos: Node, mapBoundary: Boundary): {static: StaticNodes, allNodes: {obstacles: Node[], traversable: Node[]}} {
    const positionData = {static: {origin: undefined, end: undefined}, allNodes: {obstacles: [], traversable: []}};

    for (let y = startPos[1]; y < startPos[1] + mapBoundary.height; y++) {
        for (let x = startPos[0]; x < startPos[0] + mapBoundary.width; x++) {
            const idx = (imageBoundry.width * y + x) << 2;
            
            // RGB VALUES
            const pixelColor: Color = {red: png.data[idx], green: png.data[idx + 1], blue: png.data[idx + 2], alpha: 255}

            const originColor = ColorDefenitions.get("map_origin");
            const endColor = ColorDefenitions.get("map_end");
            const mapColor = ColorDefenitions.get("map_background");

            if(pixelColor.red == mapColor.red && pixelColor.green == mapColor.green && pixelColor.blue == mapColor.blue) {
                positionData.allNodes.traversable.push(getNode(x,y,startPos[2]));
            } else if(pixelColor.red == originColor.red && pixelColor.green == originColor.green && pixelColor.blue == originColor.blue) {
                positionData.static.origin = getNode(x,y,startPos[2]);
            } else if(pixelColor.red == endColor.red && pixelColor.green == endColor.green && pixelColor.blue == endColor.blue) {
                positionData.static.end = getNode(x,y,startPos[2]);
            } else {
                positionData.allNodes.obstacles.push(getNode(x,y,startPos[2]));
            }
        }
    }

    return positionData;
}

/**
 * Converts the given image to a traversable map
 * @param png The image
 * @param imageBoundry The images boundries
 * @param mapBoundary The maps boundries
 * @returns A traverasble map
 */
function load(png: any, imageBoundry: Boundary, mapBoundary: Boundary): TraversableMap {
    const depth: [number, number] = [Math.floor(imageBoundry.width / mapBoundary.width), Math.floor(imageBoundry.height / mapBoundary.height)]
    const staticNodes: StaticNodes = { origin: undefined, end: undefined }
    let z: number = 0;
    const traversableMaps: Map<number, MapArray> = new Map<number, MapArray>();

    for (let y = 0; y < depth[1]; y++) {
        for (let x = 0; x < depth[0]; x++) {
            const zWidth: number = mapBoundary.width * x + (x !== 0 ? 1 : 0);
            const zHeight: number = mapBoundary.height * y + (y !== 0 ? 1 : 0);
            
            const nodes = getAllNodes(png, imageBoundry, getNode(zWidth, zHeight, z), mapBoundary)
            const map: MapArray = { obstacles: nodes.allNodes.obstacles, traversable: nodes.allNodes.traversable }

            if(nodes.static.origin != undefined) {
                staticNodes.origin = nodes.static.origin;
            }

            if(nodes.static.end != undefined) {
                staticNodes.end = nodes.static.end;
            }

            traversableMaps.set(z, map);
            z++;
        }
    }

    if(staticNodes === undefined || staticNodes.origin === undefined || staticNodes.end === undefined) {
        throw new InvalidMapException("Can't obtain a start and/or 'end' positions");
    } else {
        return { static: staticNodes, boundary: imageBoundry, allNodes: traversableMaps }
    }
}