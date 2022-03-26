import player from './player.js'
import level from './level.js'
import settings from './settings.js'
import logger from './logger.js'
import express from 'express'
import http from 'http'
import {Server} from 'socket.io'
import mysql from 'mysql'
import os from 'os'

const log = new logger()

export default class gameserver {
    constructor() {
        console.log('#######################################')
        log.log(0, 'starting server')
        this.setupNetwork()
        this.setupDatabase()
        this.players = []
        this.levels = []
    }

    getNetworkInterface() {
        const nets = os.networkInterfaces()
        const results = []
        for(const name of Object.keys(nets)) {
            for(const net of nets[name]) {
                if(net.family === 'IPv4' && !net.internal) {
                    results.push(net.address)
                }
            }
        }

        // settings defines which ethernet adapter we are using
        settings.ip_address = results[settings.ethernet_adapter]
        log.log(0, 'selecting ethernet adapter', settings.ethernet_adapter, settings.ip_address)
    }

    setupDatabase() {
        log.log(0, 'connecting to database')
        this.connection = mysql.createConnection({
            host: settings.sql.host,
            user: settings.sql.user,
            password: settings.sql.password,
            database: settings.sql.database
        })
        this.connection.connect((error) => {
            if(error)
                log.log(0, 'error white connecting', error)
            else {
                log.log(0, 'database connection established')
            }
        })
    }

    setupNetwork() {        
        log.log(0, 'starting netserver')
        this.getNetworkInterface()        
        this.app = express()
        this.httpserver = http.createServer(this.app)
        this.socketserver = new Server(this.httpserver, {
            cors: {
                origin: 'http://172.30.120.2:8080'
            }
        })
        this.httpserver.listen(settings.listen_port, () => {
            log.log(0, 'server is listening on', settings.ip_address + ':' + settings.listen_port)
        })
        this.setupNetworkHandlers()
    }

    setupNetworkHandlers() {
        this.socketserver.on('connection', (socket) => {
            this.connectPlayer(socket)
        })
    }

    connectPlayer(socket) {
        log.log(0, 'player connected')
        let newplayer = new player('anon', socket)
        newplayer.connected = true            
        this.setupPlayerNetworkHandlers(newplayer)    
    }

    setupPlayerNetworkHandlers(player) {
        log.log(0, 'setting up network handlers for player', player.socket.id)
        player.socket.on('d', (data) => {
            log.log(-1, 'data',  player.socket.id, data)
            this.handleData(player, data)
        })
        player.socket.on('r', (data) => {
            log.log(-1, 'register',  player.socket.id, data)
            this.registerPlayer(player, data)
        })
        player.socket.on('u', (...data) => {
            log.log(-1, 'update',  player.socket.id, ...data)
        })       
        player.socket.on('l', (data) => {
            log.log(-1, 'login',  player.socket.id, data)
            this.loginUser(player, data.name, data.hash)
        })       
        player.socket.on('disconnect', (...data) => {
            log.log(-1, 'disonnect',  player.socket.id, ...data)
            this.removePlayerFromPool(player)
        })       
    }

    handleDataRequest(player, data) {
        false && log.log(0, 'data request', player)
        let values
        if(data.subject == 'levels') {

        } else if(data.subject == 'players') {
            values = this.players.slice(this.players.length - 1)
        } else if(data.subject == 'profile') {
            values = {'name': player.name}
        } else if(data.subject == 'ownstate') {
            values = {'state': 'default'}
        } 

        player.socket.emit('d', {
            'subject': data.subject,
            'values': values
        })
    }

    handleData(player, data) {
        if(data.action == 'request') 
            handleDataRequest(player, data)
        else if(data.action == 'push') 
            handleDataPush(player, data)
        else
            log.log(0, 'error', 'datapackage not correctly formed. missing method', data)
    }


    // already callback hell
    // need to refactor this anyway
    // also no sql sanitizing
    registerPlayer(player, data) {
        this.connection.query( `SELECT * FROM user WHERE name = '${data.name}'`, (error, rows) => {
            if(error) {
                log.log(0, 'sql error while registering player', error)
                player.socket.emit('d', {
                    'action': 'register',
                    'success': false,
                    'msg': 'sql error: ' + error
                })   
                return
            }
            if(rows.length == 0) {
                // username not yet used
                log.log(0, 'username available', data.name)
                this.connection.query(`INSERT INTO user (name, hash) VALUES ("${data.name}", "${data.hash}")`, (error, rows) => {
                    if(error) {
                        log.log(0, 'sql error while registering player', error)
                        player.socket.emit('d', {
                            'action': 'register',
                            'success': false,
                            'msg': 'sql error: ' + error
                        })   
                        return
                    }

                    log.log(0, 'user registered', data.name)
                    player.socket.emit('d', {
                        'action': 'register',
                        'success': true
                    }) 
                    this.loginUser(player, data.name, data.hash)
                });
            } else {
                // username already in use
                log.log(0, 'username already taken', data.name)
                player.socket.emit('d', {
                    'action': 'register',
                    'success': false,
                    'msg': 'username already taken'
                })                
            }
        })
    }

    loginUser(p, name, hash) {
        // check hash against hash in database
        log.log(-1, name, hash)
        const query = `SELECT hash FROM user WHERE name = "${name}"`
        this.connection.query(query, (error, rows) => {
            if(error) {
                log.log(0, 'SQL ERROR', error)
                p.socket.emit('d', {
                    'action': 'login',
                    'success': false,
                    'msg': 'sql error: ' + error
                })
                return
            }
            if(rows.length == 0) {
                log.log(0, 'User not found', name)
                p.socket.emit('d', {
                    'action': 'login',
                    'success': false,
                    'msg': 'User not found'
                })
                p.registered = false
            }
            else
                if(rows[0].hash == hash) {
                    log.log(0, 'User found and hash matched', name, hash)
                    p.socket.emit('d', {
                        'action': 'login',
                        'success': true,
                        'msg': 'User found and hash matched'
                    })
                    p.registered = true
                    p.name = name
                    p.hash = hash
                    // add user to pool
                    this.addPlayer(p)
                } else {
                    p.socket.emit('d', {
                        'action': 'login',
                        'success': false,
                        'msg': 'User found but hash bot matched'
                    })
                    log.log(0, 'User found but hash not matched', name, hash)
                    p.registered = false
                }
        })

        /**/
    }

    getPlayerBySocket(socket) {
        for(const p in this.players) 
            if(this.players[p].socket.id === socket.id) 
                return this.players[p]
        return null
    }

    removePlayerFromPool(playerToRemove) {
        let i = this.players.indexOf(playerToRemove)
        if(i < 0)
            return                
        this.players.splice(i, 1)
        log.log(0, 'removing player from pool', playerToRemove.socket.id, 'pool size ', this.players.length) 
    }

    addPlayer(newplayer) {
        this.players.push(newplayer)
        log.log(0, 'adding new player to the pool', newplayer.socket.id, 'pool size ', this.players.length)        
    }

    addLevel(name) {
        this.levels.push(new level(name))
    }
}

