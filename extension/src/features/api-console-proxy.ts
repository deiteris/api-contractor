import * as express from 'express'
import * as expressProxy from 'express-http-proxy'
import * as http from 'http'
import { URL } from 'url'

export class ApiConsoleProxy {
    private app: express.Express
    private httpServer: http.Server
    private origin: string
    private httpPort: number | undefined

    constructor(origin: string) {
        this.app = express()
        this.origin = origin
        this.httpServer = http.createServer(this.app)
        this.init()
    }

    getTargetHost(req: express.Request) {
        // @ts-ignore
        const url = new URL(decodeURIComponent(req.query.url))
        return url.host
    }

    setSecurity() {
        this.app.use((req, res, next) => {

            // Website you wish to allow to connect
            res.setHeader('Access-Control-Allow-Origin', this.origin)

            // Request headers you wish to allow
            res.setHeader('Access-Control-Allow-Headers', '*')

            // Set to true if you need the website to include cookies in the requests sent
            // to the API (e.g. in case you use sessions)
            res.setHeader('Access-Control-Allow-Credentials', 'true')

            // Request methods you wish to allow
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')

            if (req.method === "OPTIONS") {
                return res.status(200).end()
            }

            // Pass to next layer of middleware
            next()
        })
        this.app.disable('x-powered-by')
    }

    setRoutes() {
        this.app.use('/oauth-callback', async (_, res) => {
            res.send(`<!DOCTYPE html><html> <head> <meta charset="utf-8"> <title>Oauth2 callback window</title> <style>*[hidden]{display: none;}</style> </head> <body> <h1>Sending the authorization data to the application</h1> <p id="general-error" hidden> The window wasn't opened as a popup and therefore it can't pass the authorization information.<br/> This is an error. </p><script>const messageTarget=(window.opener || window.parent || window.top); if (!messageTarget || messageTarget===window || !messageTarget.postMessage){const elm=document.getElementById('general-error'); elm.removeAttribute('hidden');}else{const search=window.location.search.substr(1); if (search){messageTarget.postMessage(search, '*');}else{messageTarget.postMessage(window.location.hash.substr(1), '*');}}</script> </body></html>`)
        })
        this.app.use('/proxy', async (req, res, next) => {
            if (!req.query.url) {
                res.status(400).send('No proxy URL provided.')
                return
            }
            next()
        }, expressProxy(this.getTargetHost, {
            memoizeHost: false,
            https: true,
            timeout: 5000,
            proxyReqOptDecorator: (proxyReqOpts, _) => {
                return proxyReqOpts
            },
            proxyReqPathResolver: (req) => {
                // @ts-ignore
                const url = new URL(decodeURIComponent(req.query.url))
                return url.pathname + url.search
            },
            // @ts-ignore
            proxyErrorHandler: (err, res, next) => {
                switch (err && err.code) {
                    case 'ERR_INVALID_URL': {
                        return res.status(400).send('Invalid target URL provided.')
                    }
                    default: {
                        next(err)
                    }
                }
            }
        }))
    }

    private init() {
        this.setSecurity()
        this.setRoutes()
    }

    async run(): Promise<number> {
        return new Promise((resolve) => {
            const server = this.httpServer.listen(0, '127.0.0.1', () => {
                // @ts-ignore
                const address = server.address()
                if (!address) {
                    throw Error
                }
                this.httpPort = typeof address === 'object' ? address.port : 0
                console.log(`[ACS] HTTP server listening on ${this.httpPort}.`)
                resolve(this.httpPort)
            })
        })
    }

    stop() {
        if (!this.httpServer) {
            return
        }
        console.log(`[ACS] Shutting down HTTP server on port ${this.httpPort}.`)
        this.httpServer.close()
    }
}
