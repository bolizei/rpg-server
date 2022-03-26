import fs from 'fs'
import merge from 'lodash.merge'

export default class settings {
    constructor(s) {
        // read from settings folder and search for deafult settings
        // overload user settings
        // overload constructor parameter settings
        let setting = {}

        // load setting/default.json
        try {
            const default_settings = fs.readFileSync('./settings/default.json', {encoding:'utf8', flag:'r'})
            merge(settings, JSON.parse(default_settings))
            console.log('read default file and merged')
            console.log(settings)
        } catch(error) {
            console.log('could not open default file', error)
        }

        // load setting/user.json
        try {
            const user_settings = fs.readFileSync('./settings/user.json', {encoding:'utf8', flag:'r'})
            merge(settings, JSON.parse(user_settings))
            console.log('read user file and merged')
            console.log(settings)
        } catch(error) {
            console.log('could not open user file', error)
        }
        
        // load passed in object
        merge(settings, s)

        return settings
    }
}