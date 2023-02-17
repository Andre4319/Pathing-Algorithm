let fs = require('fs');
import * as PNGSync from 'pngjs/lib/png-sync';
import * as PNG from 'pngjs'

type Position = [ x: number, y: number, z: number | undefined ]
type StaticNodes = { origin: Position, end: Position }

type Image = { path: string }
type Boundary = { width: number, height: number }

type MapArray = { obstacles: Position[] | undefined, traversable: Position[] }
type TraversableMap = { static: StaticNodes, boundary: Boundary, allNodes: Map<number, MapArray> }

/**
 * Global function to get a Position
 * @param x coordinate
 * @param y coordinate
 * @param z coordinate or if it is undefined a 0
 * @returns a position
 */
export function position(x: number, y: number, z: number | undefined): Position {
	return [x, y, z === undefined ? 0 : z];
}

/**
 * The global function to load an image and converts it to a traversable map
 * @param image The image to be
 * @param map_width The width of the maps
 * @param map_height The height of the maps
 * @returns A traverasble map
 */
export function loadImage(image: Image, map_width: number, map_height: number): TraversableMap {
    const buffer = fs.readFileSync(image.path);
    const png = PNGSync.read(buffer);
    const { width, height } = png;

    return load(png, {width, height}, {width: map_width, height: map_height});
}

/**
 * Creates a new traversable map with the specified parameters
 * @param imageBoundry The dimensions of the new image
 * @param mapBoundary The dimensions of the maps
 * @param staticNodes The static nodes of the image
 * @param obstacles The positions of all obstacles
 * @returns A traversable map and a new image
 */
export function createMap(imageBoundry: Boundary, mapBoundary: Boundary, staticNodes: StaticNodes, obstacles: Position[] | undefined): TraversableMap {
    if(staticNodes.origin.toString() == staticNodes.end.toString()) {
        throw new InvalidMapException("Origin and end points can't have the same position");
    }

    if(imageBoundry.width < mapBoundary.width || imageBoundry.height < mapBoundary.height) {
        throw new InvalidMapException("The image boundaries must exceed the map boundaries");
    }

    const depth: [number, number] = [Math.floor(imageBoundry.width / mapBoundary.width), Math.floor(imageBoundry.height / mapBoundary.height)]
    const png = new PNG.PNG({width: imageBoundry.width + 1, height: imageBoundry.height + 1});
    let yDepth: number = 0;
    const traversableMaps: Map<number, MapArray> = new Map<number, MapArray>(); 

    for(let y = 0; y < png.height; y++) {
        let xDepth: number = 0;
        for(let x = 0; x < png.width; x++) {
            // Y MAP BORDER
            if (x % mapBoundary.width === 0 && x != 0 && x != imageBoundry.width) {
                fillNode(png, [x, y, undefined], 0, 0, 0);
                xDepth++;
            // X MAP BORDER
            } else if (y % mapBoundary.height === 0 && y != 0 && y != imageBoundry.height) {
                fillNode(png, [x, y, undefined], 0, 0, 0);
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
                        fillNode(png, [x, y, undefined], 0, 0, 0)
                        continue;
                    }
                }
                let originCoordinates = getGridPosition(staticNodes.origin, depth);
                let endCoordinates = getGridPosition(staticNodes.end, depth);

                // ORIGIN POINT
                if(x === (mapBoundary.width * originCoordinates.newX) + xDepth + staticNodes.origin[0] && 
                   y === (mapBoundary.height * originCoordinates.newY) + yDepth + staticNodes.origin[1]) {
                    fillNode(png, [x, y, undefined], 255, 0, 0)
                    continue;
                }

                // END POINT
                if(x === (mapBoundary.width * endCoordinates.newX) + xDepth + staticNodes.end[0] && 
                   y === (mapBoundary.height * endCoordinates.newY) + yDepth + staticNodes.end[1]) { 
                    fillNode(png, [x, y, undefined], 0, 255, 0)
                    continue;
                }
                // FILL IN WHITE
                fillNode(png, [x, y, undefined], 255, 255, 255);
            }
        }
    }

    // CREATES THE IMAGE FILE
    const outStream = fs.createWriteStream('./resources/output.png');
    png.pack().pipe(outStream);

    return { static: staticNodes, boundary: imageBoundry, allNodes: traversableMaps }
    
}
/**
 * Given a position with depth (z) you can extract the position in a 2d grid
 * @param position To search
 * @param depth The depth of the map
 * @returns x & y coordinates
 */
function getGridPosition(position: Position, depth: [number, number]): { newX: number, newY: number} {
    let newX: number = 0, newY: number = 0;
    const depthCheck = depth[1] === 1 ? depth[0] : depth[1];
    if (position[2] === 0) { // FIRST GRID
        newX = 0;
        newY = 0;
    } else if (position[2] < depthCheck) { // TOP GRIDS
        newX = depth[0] - position[2];
        newY = 0; 
    } else if (position[2] === depth[0]) { // AFTER ALL TOP GRIDS
        newX = 0;
        newY++;
    } else { // BOTTOM GRIDS
        newX = position[2] - depth[0];
        newY++;
    }
    return { newX, newY };
}

/**
 * Colors in a node with a given position
 * @param png The image
 * @param position The position of the node
 * @param red color between 0 - 255
 * @param green color between 0 - 255
 * @param blue color between 0 -255
 */
function fillNode(png:any, position: Position, red: number, green: number, blue: number) {
    const idx: number = (png.width * position[1] + position[0]) << 2
    png.data[idx] = limit(red, 0, 255);
    png.data[idx + 1] = limit(green, 0, 255);
    png.data[idx + 2] = limit(blue, 0, 255);
    png.data[idx + 3] = 255;
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
 * @param startPos Map starting position
 * @param mapBoundary The maps boundries
 * @returns All nodes in the image
 */
function getAllNodes(png: any, imageBoundry: Boundary, startPos: Position, mapBoundary: Boundary): {static: StaticNodes, allNodes: {obstacles: Position[], traversable: Position[]}} {
    const positionData = {static: {origin: undefined, end: undefined}, allNodes: {obstacles: [], traversable: []}};

    for (let y = startPos[1]; y < startPos[1] + mapBoundary.height; y++) {
        for (let x = startPos[0]; x < startPos[0] + mapBoundary.width; x++) {
            const idx = (imageBoundry.width * y + x) << 2;
            
            // RGB VALUES
            const red = png.data[idx];
            const green = png.data[idx + 1];
            const blue = png.data[idx + 2];

            if(red === 255 && green === 255 && blue === 255) { // WHITE
                positionData.allNodes.traversable.push(position(x,y,startPos[2]));
            } else if(red === 255 && green === 0 && blue === 0) { // RED
                positionData.static.origin = position(x,y,startPos[2]);
            } else if(red === 0 && green === 255 && blue === 0){ // GREEN
                positionData.static.end = position(x,y,startPos[2]);
            } else { // ALL OTHER COLORS
                positionData.allNodes.obstacles.push(position(x,y,startPos[2]));
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
            
            const nodes = getAllNodes(png, imageBoundry, position(zWidth, zHeight, z), mapBoundary)
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