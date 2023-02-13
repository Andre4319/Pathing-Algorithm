let fs = require('fs');
import * as PNGSync from "pngjs/lib/png-sync";

type Position = [x: number, y: number];
type BoundingBox = {startPos: Position, endPos: Position};

type Image = {path: string, width: number, box: BoundingBox}
type Image2D = {path: string}
type Image3D = {path: string, boundingBox: number}

type Map2D = {startPos: Position, endPos: Position, obstacles: Position[], traversable: Position[]};
type Map3D = {zIndex: Map<number, Map2D>};


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

/**
 * Loads an image with a bounding box to render an area of the image
 * @param img The image to be loaded
 * @returns A 2D Map
 */
function load(img: Image): Map2D {
    let start: Position = [0,0], end: Position = [0,0];
    const wall: Position[] = [], space: Position[] = [];
    const buffer = fs.readFileSync(img.path);
    const png = PNGSync.read(buffer);
    for (let y = img.box.startPos[1]; y < img.box.endPos[1]; y++) {
        for (let x = img.box.startPos[0]; x < img.box.endPos[0]; x++) {
            const idx = (img.width * y + x) << 2;
            
            // RGB VALUES
            const red = png.data[idx];
            const green = png.data[idx + 1];
            const blue = png.data[idx + 2];

            if(red === 255 && green === 255 && blue === 255) { // WHITE
                space.push(position(x, y));
            } else if(red === 255 && green === 0 && blue === 0) { // RED
                start = position(x, y);
            } else if(red === 0 && green === 255 && blue === 0){ // GREEN
                end = position(x, y);
            } else { // ALL OTHER COLORS
                wall.push(position(x, y));
            }
        }
    }

    return {startPos: start, endPos: end, obstacles: wall, traversable: space}
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

    return load({path: img.path, width, box: {startPos: [0,0], endPos: [width, height]}});
}

/**
 * Loads a 2D image and converts it to a 3D map
 * @param img The 2D image to be loaded
 * @returns a successful 3D Map
 */
function load3D(img: Image3D): Map3D {
    let zIndex = 0;
    const allMaps = new Map();
    const buffer = fs.readFileSync(img.path);
    const png = PNGSync.read(buffer);
    const { width, height } = png;
    const depth = [Math.floor(height / img.boundingBox), Math.floor(width / img.boundingBox)];

    for (let y = 0; y < depth[0]; y++) {
        for (let x = 0; x < depth[1]; x++) {
            const zHeight = img.boundingBox * y + (y !== 0 ? 1 : 0);
            const zWidth = img.boundingBox * x + (x !== 0 ? 1 : 0);
            allMaps.set(zIndex, load({path: img.path, width: width, box: {startPos: [zWidth, zHeight], endPos: [zWidth + img.boundingBox, zHeight + img.boundingBox]}}));
            zIndex++;
        }
    }

    return {zIndex: allMaps}
}

// 2D Test
//console.log(load2D({path: './resources/test.png'}))

// 3D Test
//console.log(load3D({path: './resources/3d_test.png', boundingBox: 9}))