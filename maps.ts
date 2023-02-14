let fs = require('fs');
import * as PNGSync from "pngjs/lib/png-sync";

type Position = [ x: number, y: number ]
type Position3D = [x: number, y: number, z: number ]
type FixedPositions2D = { startPos: Position, endPos: Position }
type FixedPositions3D = { startPos: Position3D, endPos: Position3D }

type Dimension = {box: FixedPositions2D, width: number, height: number}
type Image2D = { path: string, dimensions: Dimension }
type Image3D = { path: string, dimensions: Dimension }

type MapArray = { obstacles: Position[] | undefined, traversable: Position[] }
type Map2D = { fixedPositions: FixedPositions2D | undefined, map: MapArray }
type Map3D = { fixedPositions: FixedPositions3D | undefined, zIndex: Map<number, MapArray> }


export function position(x: number, y: number): Position {
	return [x, y];
}

/**
 * The global function to obtain a 2D Map
 * @param img the Image to be transformed
 * @returns A flat 2D Map
 */
export function get2DMap(img: Image2D): Map2D {
    return load2D(img);
}

/**
 * The global function to obtain a 3D Map
 * @param img the Image to be transformed
 * @returns A Map with depth (z-index)
 */
export function get3DMap(img: Image3D): Map3D {
    return load3D(img);
}

function getMapDimensions(boundingBox: FixedPositions2D): Dimension {
    const height = boundingBox.endPos[1] - boundingBox.startPos[1];
    const width = boundingBox.endPos[0] - boundingBox.startPos[0];

    return {box: boundingBox, width: width, height: height}
}

function InvalidMapException(message: string) {
    this.message = message;
    this.name = "InvalidMapException";
}

/**
 * Loads an image with a bounding box to render an area of the image
 * @param img The image to be loaded
 * @returns A 2D Map
 */
function load(img: Image2D): Map2D {
    const map_2D: Map2D = {fixedPositions: {startPos: undefined, endPos: undefined}, map: {obstacles: [], traversable: []}}
    const buffer = fs.readFileSync(img.path);
    const png = PNGSync.read(buffer);
    const { width } = png;

    const baseY = img.dimensions.box.startPos[1];
    const baseX = img.dimensions.box.startPos[0];

    for (let y = baseY; y < baseY + img.dimensions.height; y++) {
        for (let x = baseX; x < baseX + img.dimensions.width; x++) {
            const idx = (width * y + x) << 2;
            
            // RGB VALUES
            const red = png.data[idx];
            const green = png.data[idx + 1];
            const blue = png.data[idx + 2];

            if(red === 255 && green === 255 && blue === 255) { // WHITE
                map_2D.map.traversable.push(position(x,y));
            } else if(red === 255 && green === 0 && blue === 0) { // RED
                map_2D.fixedPositions.startPos = position(x, y);
            } else if(red === 0 && green === 255 && blue === 0){ // GREEN
                map_2D.fixedPositions.endPos = position(x, y);
            } else { // ALL OTHER COLORS
                map_2D.map.obstacles.push(position(x,y))
            }
        }
    }

    return map_2D; 
}

/**
 * Loads a 2D image and converts it to a 2D map
 * @param img The 2D image to be loaded
 * @returns a successful 2D Map
 */
function load2D(img: Image2D): Map2D {
    const buffer = fs.readFileSync(img.path);
    const png = PNGSync.read(buffer);
    const { width, height } = png;
    const map_2D = load({path: img.path, dimensions: getMapDimensions({startPos: position(0,0), endPos: position(width, height)})})

    if(map_2D.fixedPositions === undefined || map_2D.fixedPositions.startPos === undefined || map_2D.fixedPositions.endPos === undefined) {
        throw new InvalidMapException("Can't obtain a start and/or 'end' position");
    } else {
        return map_2D;
    }
}

/**
 * Loads a 2D image and converts it to a 3D map
 * @param img The 2D image to be loaded
 * @returns a successful 3D Map
 */
function load3D(img: Image3D): Map3D {
    let zIndex = 0;
    let fixed_positions: FixedPositions3D = {startPos: undefined, endPos: undefined};
    const allMaps = new Map();
    const { width, height } = PNGSync.read(fs.readFileSync(img.path));
    const depth = [Math.floor(height / img.dimensions.height), Math.floor(width / img.dimensions.width)];

    for (let y = 0; y < depth[0]; y++) {
        for (let x = 0; x < depth[1]; x++) {
            
            const zHeight = img.dimensions.height * y + (y !== 0 ? 1 : 0);
            const zWidth = img.dimensions.width * x + (x !== 0 ? 1 : 0);
            const t = getMapDimensions({startPos: [zWidth, zHeight], endPos: [zWidth + img.dimensions.width, zHeight + img.dimensions.height]});
            const map_2D = load({path: img.path, dimensions: t})
            const map: MapArray = {obstacles: map_2D.map.obstacles, traversable: map_2D.map.traversable}
            if(map_2D.fixedPositions.startPos != undefined) {
                fixed_positions.startPos = [map_2D.fixedPositions.startPos[0], map_2D.fixedPositions.startPos[1], zIndex];
            }

            if(map_2D.fixedPositions.endPos != undefined) {
                fixed_positions.endPos = [map_2D.fixedPositions.endPos[0], map_2D.fixedPositions.endPos[1], zIndex];
            }

            allMaps.set(zIndex, map);
            zIndex++;
        }
    }

    if(fixed_positions === undefined || fixed_positions.startPos === undefined || fixed_positions.endPos === undefined) {
        throw new InvalidMapException("Can't obtain a start and/or 'end' position");
    } else {
        return {fixedPositions: fixed_positions, zIndex: allMaps}
    }
}

// 2D Test
//console.log(load2D({path: './resources/test.png', dimensions: getMapDimensions({startPos:[0,0], endPos: [9,9]})}))

// 3D Test #1 ( Multiple start and end point )
//console.log(load3D({path: './resources/3d_test.png', dimensions: getMapDimensions({startPos: [0,0], endPos: [9,9]})}))

// 3D Test #2 ( One start and end point )
//console.log(load3D({path: './resources/3d_test2.png', dimensions: getMapDimensions({startPos: [0,0], endPos: [9,9]})}))

// 3D Test #3 ( Non-cubed dimensions & Different zIndex for both start and end points )
//console.log(load3D({path: './resources/3d_test3.png', dimensions: getMapDimensions({startPos: [0,0], endPos: [9,18]})}))