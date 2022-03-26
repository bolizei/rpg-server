export default class levelmap {
    constructor(x, z) {
        this.size = {x: x, z: z}
        this.fillMap()
    }

    fillMap() {
        this.tiles = []
        for(let i = 0; i < this.size.x * this.size.z; i++) {
            this.tiles.push(0)
        }
    }
}