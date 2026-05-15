import { app } from './app.js'
import { config } from './config/env.js'
import { initDb } from './db/initDb.js'
import { WebSocketService } from './services/websocket.service.js'
import http from 'http'


const start = async () => {
    await initDb()
    const server = http.createServer(app),
     wsService = new WebSocketService()


    wsService.initialize(server)

    server.listen(config.port, () => {
        console.log(`Server is running on http://localhost:${config.port}`)
        console.log(`WebSocket available at ws://localhost:${config.port}/ws`)
    })
}

start().catch(console.error)