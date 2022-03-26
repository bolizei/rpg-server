export default class player {
    constructor(name, socket) {
        this.name = name
        this.socket = socket
        this.registered = false
        this.connected = false
        this.hash = null
    }
}