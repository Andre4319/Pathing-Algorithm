let fs = require('fs');
import * as PNGSync from "pngjs/lib/png-sync";

type Image = {path: string}
type Maps = {startPos: Array<number>, endPos: Array<number>, obstacles: Array<number[]>, map: Array<number[]>};

/**
 * Loads an image and converts it to a map
 * @param img The image to be loaded
 * @returns a successful Map
 */
function load(img: Image): Maps {
    const start = new Array<number>, end = new Array<number>, wall = new Array<number[]>, space = new Array<number[]>;
    const buffer = fs.readFileSync(img.path);
    const png = PNGSync.read(buffer);
    const { width, height } = png;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (width * y + x) << 2;
            
            // RGB VALUES
            const red = png.data[idx];
            const green = png.data[idx + 1];
            const blue = png.data[idx + 2];

            if(red === 255 && green === 255 && blue === 255) { // WHITE
                space.push([y, x]);
            } else if(red === 255 && green === 0 && blue === 0) { // RED
                start.push(y, x);
            } else if(red === 0 && green === 255 && blue === 0){ // GREEN
                end.push(y, x);
            } else { // ALL OTHER COLORS
                wall.push([y, x]);
            }
        }
    }

    return {startPos: start, endPos: end, obstacles: wall, map: space}

}

console.log(load({path: "./test.png"}));