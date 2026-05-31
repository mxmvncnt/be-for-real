import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import auth from './routes/auth.js'
import friend from './routes/friend.js'
import user from './routes/user.js'
import videos from './routes/videos.js'
import swagger from './swagger.js'
import { logger } from 'hono/logger'

const app = new Hono()

app.use(logger())

app.get('/', (c) => {
	return c.text('Hello Hono!')
})

app.route('/auth', auth)
app.route('/friend', friend)
app.route('/user', user)
app.route('/videos', videos)
app.route('/swagger', swagger)

const serverPort = parseInt(process.env.SERVER_PORT ?? process.env.PORT ?? '3000', 10)

serve(
	{
		fetch: app.fetch,
		port: serverPort,
	},
	(info) => {
		console.log(
			`Server is running on http://localhost:${info.port} - Swagger: http://localhost:${info.port}/swagger`,
		)
	},
)
