function check_border(pos: Position, map: Map2D): Position[] {
    const neighbors: Position[] = [];
    for (const offset of [[-1, -1], [-1, 0],[-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
        const neighborPos: Position = [pos[0] + offset[0], pos[1] + offset[1]];
        if (not_wall(neighborPos, map)) {
            neighbors.push(neighborPos);
        }
    }
    return neighbors;
  }
  
  function not_wall(pos: Position, map: Map2D): boolean {
    return !map.obstacles.some(obstaclePos => obstaclePos[0] === pos[0] && obstaclePos[1] === pos[1]);
  }
  
  function closest(neighbors:Array, end:position):position|null {
    let index:number|null = null;
    let value = 999;
    for (let i = 1; i < neighbors.length; i++) {
      if ( (Math.abs(neighbors[i][0]-end[0])+Math.abs(neighbors[i][1]-end[1]))< value) {
        index = i;
        value = Math.abs(neighbors[i][0]-end[0])+Math.abs(neighbors[i][1]-end[1]);
      }
      return neighbors[index];
  }
  
  function moving(start:Position, end:Position, map:Map2D){
    let location=start;
    while(true){
      location=location-closest(check_border(Location, Map2D), end);
      if (location=end){
        break;
      }
  
  
    }
  }