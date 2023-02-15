let fs = require('fs');
import * as PNGSync from "pngjs/lib/png-sync";

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
    const depth = [Math.floor(imageBoundry.width / mapBoundary.width), Math.floor(imageBoundry.height / mapBoundary.height)]
    const staticNodes: StaticNodes = { origin: undefined, end: undefined }
    let z = 0;
    const traversableMaps = new Map();

    for (let y = 0; y < depth[1]; y++) {
        for (let x = 0; x < depth[0]; x++) {
            const zWidth = mapBoundary.width * x + (x !== 0 ? 1 : 0);
            const zHeight = mapBoundary.height * y + (y !== 0 ? 1 : 0);
            
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



// 2D Test
//console.log(loadImage({path: './resources/test.png'}, 9, 9))

// 3D Test #1 ( Multiple start and end point )
//console.log(loadImage({path: './resources/3d_test.png'}, 9, 9))

// 3D Test #2 ( One start and end point )
//console.log(loadImage({path: './resources/3d_test2.png'}, 9, 9))

// 3D Test #3 ( Non-cubed dimensions & Different zIndex for both start and end points )
//console.log(loadImage({path: './resources/3d_test3.png'}, 9, 18))