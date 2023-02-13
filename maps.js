"use strict";
exports.__esModule = true;
var fs = require('fs');
var PNGSync = require("pngjs/lib/png-sync");
function load(img) {
    var start = new Array, end = new Array, wall = new Array, space = new Array;
    var buffer = fs.readFileSync(img.path);
    var png = PNGSync.read(buffer);
    var width = png.width, height = png.height;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var idx = (width * y + x) << 2;
            var red = png.data[idx];
            var green = png.data[idx + 1];
            var blue = png.data[idx + 2];
            if (red === 255 && green === 255 && blue === 255) {
                space.push([y, x]);
            }
            else if (red === 255 && green === 0 && blue === 0) {
                start.push(y, x);
            }
            else if (red === 0 && green === 255 && blue === 0) {
                end.push(y, x);
            }
            else {
                wall.push([y, x]);
            }
        }
    }
    return { startPos: start, endPos: end, obstacles: wall, map: space };
}
console.log(load({ path: "./test.png" }));
/*
function load(map: Maps) {
    builtMap = map;
    //console.log(builtMap);
    return builtMap;
}

function test() {
    getPixels("./test.png", (err, pixels) => {
        let start: Pair<number, number> = [0,0], end: Pair<number, number> = [0,0], obstaclePairs: Array<Pair<number, number>> = [], map: Array<Pair<number, number>> = [];
        for (let y = 0; y < pixels.shape[1]; y++) {
            for (let x = 0; x < pixels.shape[0]; x++) {
                const r = pixels.get(x, y, 0);
                const g = pixels.get(x, y, 1);
                const b = pixels.get(x, y, 2);
                const a = pixels.get(x, y, 3);
                if(r === 255 && g === 0 && b === 0) { // RED
                    start = [x, y];
                } else if(r === 255 && g === 0 && b === 0) { // BLACK
                    obstaclePairs.push([x, y]);
                } else if(r === 0 && g === 255 && b === 0) { // GREEN
                    end = [x, y];
                } else {
                    map.push([x, y]);
                }
            }
        }
        load({startPos: start, endPos: end, obstacles: obstaclePairs, map: map});
    });
}*/ 
