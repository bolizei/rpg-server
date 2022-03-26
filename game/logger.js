export default class logger {
    log(direction, ...values) {
        console.log('[' + (direction != 0 ? (direction < 0 ? '<<<' : '>>>') : 'SYS') + ']', ...values)
    }
} 
