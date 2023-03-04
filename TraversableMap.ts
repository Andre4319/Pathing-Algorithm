let fs = require('fs');
import * as PNGSync from 'pngjs/lib/png-sync';
import * as PNG from 'pngjs'
import { type Node, type Dimension, type Grid, getRelativeNode, getGlobalNode, createGrid } from './Position';
import { equals, limit } from './Util';

/**
 * Image file data
 */
interface Image {
    fileName: string;
    path?: string;
    dimension?: Dimension;
}

/**
 * A exception in case of loading a map is a failure 
 */
class InvalidMapException extends Error {}


/**
 * Fixed nodes/positions for the origin and end nodes
 */
interface FixedNodes {
    origin: Node;
    end: Node;
}

/**
 * Map data containing obstacles & all traversable nodes
 */
interface MapArray {
    traversable: Node[];
    obstacles?: Node[];
}

/**
 * RGB | A data
 */
type Color = {
    red: number;
    green: number;
    blue: number;
    alpha?: number;
}

/**
 * The colors for each type
 */
export enum ColorKey {
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
 */
export const ColorDefenitions: Map<string, Color> = new Map<string, Color>([
    [ColorKey.MapBackground, { red: 255, green: 255, blue: 255, alpha: 255 }],
    [ColorKey.MapBorder,     { red: 23,  green: 23,  blue: 23,  alpha: 255 }],
    [ColorKey.MapObstacles,  { red: 0,   green: 0,   blue: 0,   alpha: 255 }],
    [ColorKey.MapOrigin,     { red: 255, green: 0,   blue: 0,   alpha: 255 }],
    [ColorKey.MapEnd,        { red: 0,   green: 255, blue: 0,   alpha: 255 }],
    [ColorKey.PathCorrect,   { red: 169, green: 204, blue: 155, alpha: 255 }],
    [ColorKey.PathSearched,  { red: 255, green: 196, blue: 155, alpha: 255 }],
]);

/**
 * A correct traversable 3D map with nodes
 * It contains data for obstacles, the origin and end points
 */
export class TraversableMap {
    private image: Image;
    private grid: Grid;
    private fixedNodes: FixedNodes;
    private mapDimensions: Dimension;

    private depthMap = new Map<number, MapArray>();
    private allNodes: MapArray[];

    constructor(image: Image, grid: Grid) {
        this.image = image;
        this.grid = grid;
        
        this.image.path = image.path ?? './resources';
        this.fixedNodes = { origin: { x: -1, y: -1 }, end: { x: -1, y: -1 }};
        this.allNodes = [];
        
        const buffer = fs.readFileSync(`${image.path}/${image.fileName}`);
        const png = PNGSync.read(buffer);
        const { width, height } = png;
        if(width < 2 && height < 2) {
            throw new InvalidMapException('Map must be (or greater than) 2x2');
        }
        image.dimension = { width, height }

        this.mapDimensions = {
            width: Math.floor(this.image.dimension.width / this.grid.columns), 
            height: Math.floor(this.image.dimension.height / this.grid.rows),
        };

        this.load(png);

        for (let i = 0; i < this.depthMap.size; i++) {
            this.allNodes.push(this.depthMap.get(i));
        }
    }

    /**
     * Loads the image and sets all variabels
     * @param png The png instance
     */
    private load(png: any) {  
        const obstacle: Node[] = [];
        const travers: Node[] = [];
        let yDepth = 0;
        for (let y = 0; y < png.height; y++) {
            let xDepth = 0;
            const yBorder = this.mapDimensions.height * (yDepth + 1) + yDepth;
    
            yDepth += y > yBorder ? 1 : 0;
    
            for (let x = 0; x < png.width; x++) {
                const globalNode: Node = { x , y, }
                const idx = (this.image.dimension.width * (globalNode.y + yDepth) + (globalNode.x + xDepth)) << 2;

                const xBorder = this.mapDimensions.width * (xDepth + 1) + xDepth;

                xDepth += x === xBorder ? 1 : 0;

                const pixelColor: Color = { 
                    red: png.data[idx], 
                    green: png.data[idx + 1], 
                    blue: png.data[idx + 2], 
                    alpha: 255,
                };

                const originColor: Color = ColorDefenitions.get(ColorKey.MapOrigin);
                const endColor: Color    = ColorDefenitions.get(ColorKey.MapEnd);
                const mapColor: Color    = ColorDefenitions.get(ColorKey.MapBackground);
                const mapObstacle: Color = ColorDefenitions.get(ColorKey.MapObstacles);

                if(equals(mapColor, pixelColor)) {
                    travers.push(getRelativeNode(globalNode, this.mapDimensions))
                } else if(equals(originColor, pixelColor)) {
                    const relativeNode: Node = getRelativeNode(globalNode, this.mapDimensions);
                    this.fixedNodes.origin = relativeNode;
                } else if(equals(endColor, pixelColor)) {
                    const relativeNode: Node = getRelativeNode(globalNode, this.mapDimensions);
                    this.fixedNodes.end = relativeNode;
                } else if(equals(mapObstacle, pixelColor)) {
                    const relativeNode: Node = getRelativeNode(globalNode, this.mapDimensions);
                    obstacle.push(relativeNode)
                }
            }
        }

        if(this.fixedNodes.origin.x === -1 || this.fixedNodes.origin.y === -1 || this.fixedNodes.end.x === -1 || this.fixedNodes.end.y === -1) {
            throw new InvalidMapException('Map needs an origin and a end point');
        }

        for (let z = 0; z <= (this.grid.columns * this.grid.rows - 2) + 1; z++) {
            const _obstacle: Node[] = [];
            const _traversable: Node[] = [];
            obstacle.forEach(v => {
                if(v.z === z) {
                    _obstacle.push(v);
                }
            })

            travers.forEach(v => {
                if(v.z === z) {
                    _traversable.push(v);
                }
            })
            this.depthMap.set(z, {traversable: _traversable, obstacles: _obstacle});
        }
    }

    /**
     * Gets a node and returns its type
     * @param x position
     * @param y position
     * @param z position
     * @returns node type and position
     */
    public getNode(x: number, y: number, z: number): { type: string, node: Node } | undefined {
        if(z >= this.allNodes.length) {
            return undefined;
        }
        
        const node: Node = { x, y, z };
        let type = '';

        if(equals(this.fixedNodes.origin, node)) {
            type = 'origin';
        } else if(equals(this.fixedNodes.end, node)) {
            type = 'end';
        } else if(this.allNodes[z].traversable.some(traversableNode => { return equals(getGlobalNode(traversableNode, this.mapDimensions, this.grid), getGlobalNode(node, this.mapDimensions, this.grid))})) {
            type = 'traversable';
        } else {
            type = 'non-traversable';
        }

        return { type, node };

    }

    /**
     * Draws a path with a color and saves the image in a seperate folder
     * @param path The path to be drawn
     * @param color The color the path will be
     */
    public drawPath(path: Node[], color: Color) {
        const targetDirectory = this.image.path + '/Completed Paths/';
        const name = this.image.fileName;
        fs.mkdirSync(targetDirectory, { recursive: true });

        const coloring = this.colorNode;
        const mapDimensions = this.mapDimensions;

        fs.createReadStream(this.image.path + '/' + this.image.fileName)
            .pipe(new PNG.PNG({filterType: 4}))
            .on('parsed', function() {
                path.forEach(node => {
                    coloring(this, mapDimensions, node, color, false);
                })
                
                // Write the modified image to a file
                this.pack().pipe(fs.createWriteStream(targetDirectory + name));
            });
    }

    /**
     * Colors in a node
     * @param png The png instance
     * @param mapDimensions The dimensions of each map
     * @param globalNode The global position where the node will be colored
     * @param color The color
     * @param adjust for borders so that the node will go +1 for every border
     */
    private colorNode(png: any, mapDimensions: Dimension, globalNode: Node, color: Color, adjust: boolean) {
        let node: Node;
        if(adjust) {
            let yDepth = 0;
            let xDepth = 0;
            
            for (let y = 0; y <= globalNode.y; y += mapDimensions.height) {
                yDepth++;
            }
    
            for (let x = 0; x <= globalNode.x; x += mapDimensions.width) {
                xDepth++;
            }
            node = {x: globalNode.x + xDepth - 1, y: globalNode.y + yDepth - 1};
        } else {
            node = globalNode;
        }
        const idx: number = (png.width * node.y + node.x) << 2;
        png.data[idx] = limit(color.red, 0, 255);
        png.data[idx + 1] = limit(color.green, 0, 255);
        png.data[idx + 2] = limit(color.blue, 0, 255);
        png.data[idx + 3] = color.alpha ?? 255;
    }

    /**
     * Gets the private variable.
     * @returns The dimensions of each map
     */
    public getMapDimensions(): Dimension {
        return this.mapDimensions;
    }

    /**
     * A Deep look into the data
     * @returns All data regarding the traversable map
     */
    public get(): {image: Image, fixedNodes: FixedNodes, grid: Grid, allNodes: MapArray[]} {
        return { image: this.image, fixedNodes: this.fixedNodes, grid: this.grid, allNodes: this.allNodes };
    }

    /**
     * Prints all the maps
     */
    public print() {
        const SYMBOLS = {
            origin:   ' S ',
            end:      ' E ',
            obstalce: ' O ',
            node:     ' - ',
        };
    
        const maps: string[][] = [];
        for(let z = 0; z < this.allNodes.length; z++) {
            let mapString: string = '';
            for(let y = 0; y < this.mapDimensions.height; y++) {
                for(let x = 0; x < this.mapDimensions.width; x++) {
                    switch (this.getNode(x, y, z).type) {
                        case 'non-traversable':
                            mapString += SYMBOLS.obstalce;
                            break;
                        case 'origin':
                            mapString += SYMBOLS.origin;
                            break;
                        case 'end':
                            mapString += SYMBOLS.end;
                            break;
                        default:
                            mapString += SYMBOLS.node
                            break;
                    }
                }
    
                mapString += '\n';
            }
            maps.push(mapString.trimEnd().split('\n'));
        }
    
        console.log(maps);
    }
}

const a = new TraversableMap({fileName: 'test.png'}, createGrid(1,1))