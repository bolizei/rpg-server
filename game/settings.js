import fs from 'fs'
import merge from 'lodash.merge'
import logger from '../lib/logger.js'
const log = new logger()

export default class settings {
    constructor(s) {
        let settings = {}

        // load setting/default.json
        try {
            const default_settings = fs.readFileSync('./settings/default.json', {encoding:'utf8', flag:'r'})
            merge(settings, JSON.parse(default_settings))
            log.log(0, 'read default settings file')
        } catch(error) {
            log.log(0, 'Error: could not open default settings file', error)
        }

        // load setting/user.json
        try {
            const user_settings = fs.readFileSync('./settings/user.json', {encoding:'utf8', flag:'r'})
            merge(settings, JSON.parse(user_settings))
            log.log(0, 'read user setting file')
        } catch(error) {
            log.log(0, 'Error: could not open user settings file', error)
        }
        
        // load passed in object
        merge(settings, s)

        return settings
    }
}