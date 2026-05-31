import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'

// A basic OpenAPI document
const openApiDoc = {
	openapi: '3.0.0', // This is the required version field
	info: {
		title: 'API Documentation',
		version: '1.0.0',
		description: 'API documentation for your service',
	},
	tags: [
		{ name: 'Auth', description: 'Authentication' },
		{ name: 'Users', description: 'User profile and friends' },
		{ name: 'Videos', description: 'Video upload and feeds' },
		{ name: 'Friends', description: 'Friend requests and relationships' },
		{ name: 'Files', description: 'Static file delivery' },
		{ name: 'System', description: 'Service health and diagnostics' },
	],
	components: {
		securitySchemes: {
			TokenAuth: {
				type: 'apiKey',
				in: 'header',
				name: 'authorization',
				description: 'Raw token in the `authorization` header (no Bearer prefix)',
			},
		},
	},
	paths: {
		'/auth/register': {
			post: {
				summary: 'Register a new user',
				tags: ['Auth'],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									username: { type: 'string' },
									email: { type: 'string', format: 'email' },
									password: { type: 'string' },
								},
								required: ['username', 'email', 'password'],
							},
						},
					},
				},
				responses: {
					'201': { description: 'Created' },
				},
			},
		},
		'/auth/login': {
			post: {
				summary: 'Login a user',
				tags: ['Auth'],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									email: { type: 'string', format: 'email' },
									password: { type: 'string' },
								},
								required: ['email', 'password'],
							},
						},
					},
				},
				responses: {
					'201': { description: 'Token returned' },
					'401': { description: 'Invalid credentials' },
				},
			},
		},
		'/auth/logout': {
			post: {
				summary: 'Logout a user',
				tags: ['Auth'],
				security: [{ TokenAuth: [] }],
				responses: {
					'200': { description: 'Session removed' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/': {
			get: {
				summary: 'Root hello',
				tags: ['System'],
				responses: {
					'200': { description: 'Plain text greeting' },
				},
			},
		},
		'/swagger/health': {
			get: {
				summary: 'Swagger health',
				tags: ['System'],
				responses: {
					'200': { description: 'OK' },
				},
			},
		},
		'/uploads/{filename}': {
			get: {
				summary: 'Serve an uploaded video file',
				tags: ['Files'],
				parameters: [
					{
						name: 'filename',
						in: 'path',
						required: true,
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': { description: 'Video file' },
					'404': { description: 'File not found' },
				},
			},
		},
		'/user/me': {
			get: {
				summary: "Get the authenticated user's profile",
				tags: ['Users'],
				security: [{ TokenAuth: [] }],
				responses: {
					'200': { description: 'User profile' },
					'401': { description: 'Missing or invalid token' },
					'404': { description: 'User not found' },
				},
			},
		},
		'/user/search': {
			get: {
				summary: 'Search users by username or email',
				tags: ['Users'],
				security: [{ TokenAuth: [] }],
				parameters: [
					{
						name: 'q',
						in: 'query',
						required: false,
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': { description: 'Search results' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/friend/{friendId}/add': {
			post: {
				summary: 'Send a friend request',
				tags: ['Friends'],
				security: [{ TokenAuth: [] }],
				parameters: [
					{
						name: 'friendId',
						in: 'path',
						required: true,
						schema: { type: 'string', format: 'uuid' },
					},
				],
				responses: {
					'201': { description: 'Friend request sent' },
					'200': { description: 'Already friends or request exists' },
					'400': { description: 'Cannot add yourself' },
					'401': { description: 'Missing or invalid token' },
					'404': { description: 'Friend not found' },
				},
			},
		},
		'/friend/{friendId}/accept': {
			post: {
				summary: 'Accept a friend request',
				tags: ['Friends'],
				security: [{ TokenAuth: [] }],
				parameters: [
					{
						name: 'friendId',
						in: 'path',
						required: true,
						schema: { type: 'string', format: 'uuid' },
					},
				],
				responses: {
					'200': { description: 'Friend request accepted' },
					'401': { description: 'Missing or invalid token' },
					'404': { description: 'Friend request not found' },
				},
			},
		},
		'/friend/{friendId}/remove': {
			post: {
				summary: 'Remove or cancel a friend relationship',
				tags: ['Friends'],
				security: [{ TokenAuth: [] }],
				parameters: [
					{
						name: 'friendId',
						in: 'path',
						required: true,
						schema: { type: 'string', format: 'uuid' },
					},
				],
				responses: {
					'200': { description: 'Friend removed or request canceled/refused' },
					'400': { description: 'Cannot remove yourself' },
					'401': { description: 'Missing or invalid token' },
					'404': { description: 'Friend relation not found' },
				},
			},
		},
		'/friends': {
			get: {
				summary: 'Get accepted friends',
				tags: ['Friends'],
				security: [{ TokenAuth: [] }],
				responses: {
					'200': { description: 'List of friends' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/friendrequests/received': {
			get: {
				summary: 'Get incoming friend requests',
				tags: ['Friends'],
				security: [{ TokenAuth: [] }],
				responses: {
					'200': { description: 'List of received requests' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/friendrequests/sent': {
			get: {
				summary: 'Get outgoing friend requests',
				tags: ['Friends'],
				security: [{ TokenAuth: [] }],
				responses: {
					'200': { description: 'List of sent requests' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/user/description': {
			patch: {
				summary: "Update the authenticated user's description",
				tags: ['Users'],
				security: [{ TokenAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									description: { type: 'string' },
								},
								required: ['description'],
							},
						},
					},
				},
				responses: {
					'200': { description: 'Description updated' },
					'400': { description: 'Missing or invalid description' },
					'401': { description: 'Missing or invalid token' },
					'404': { description: 'User not found' },
				},
			},
		},
		'/videos/clips': {
			get: {
				summary: 'Get all clips from friends',
				tags: ['Videos'],
				security: [{ TokenAuth: [] }],
				responses: {
					'200': { description: 'List of clips' },
					'401': { description: 'Missing or invalid token' },
				},
			},
			post: {
				summary: 'Upload a clip',
				tags: ['Videos'],
				security: [{ TokenAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'multipart/form-data': {
							schema: {
								type: 'object',
								properties: {
									video: { type: 'string', format: 'binary' },
									createdAt: { type: 'string', format: 'date-time' },
								},
								required: ['video'],
							},
						},
					},
				},
				responses: {
					'201': { description: 'Uploaded' },
					'400': { description: 'Missing or invalid payload' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/videos/feed': {
			get: {
				summary: 'Get the video feed',
				tags: ['Videos'],
				security: [{ TokenAuth: [] }],
				responses: {
					'200': { description: 'Feed' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/videos/mashup/{date}': {
			post: {
				summary: 'Create a mashup for a date (not implemented)',
				tags: ['Videos'],
				parameters: [
					{
						name: 'date',
						in: 'path',
						required: true,
						schema: { type: 'string' },
					},
				],
				responses: {
					'501': { description: 'Not implemented' },
				},
			},
		},
		'/videos/clips/{id}': {
			get: {
				summary: 'Get all clips from a specific user',
				tags: ['Videos'],
				security: [{ TokenAuth: [] }],
				parameters: [
					{
						name: 'id',
						in: 'path',
						required: true,
						schema: { type: 'string', format: 'uuid' },
					},
				],
				responses: {
					'200': { description: 'List of clips' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/videos/mashups': {
			get: {
				summary: 'Get all mashups from friends',
				tags: ['Videos'],
				security: [{ TokenAuth: [] }],
				responses: {
					'200': { description: 'List of mashups' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/videos/mashups/{id}': {
			get: {
				summary: 'Get all mashups from a specific user',
				tags: ['Videos'],
				security: [{ TokenAuth: [] }],
				parameters: [
					{
						name: 'id',
						in: 'path',
						required: true,
						schema: { type: 'string', format: 'uuid' },
					},
				],
				responses: {
					'200': { description: 'List of mashups' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
		'/videos/upload': {
			post: {
				summary: 'Upload a 5s clip (stored on server)',
				tags: ['Videos'],
				security: [{ TokenAuth: [] }],
				parameters: [
					{
						name: 'x-filename',
						in: 'header',
						required: false,
						schema: { type: 'string' },
						description: 'Optional filename for the uploaded video',
					},
				],
				requestBody: {
					required: true,
					content: {
						'video/webm': {
							schema: { type: 'string', format: 'binary' },
						},
						'video/mp4': {
							schema: { type: 'string', format: 'binary' },
						},
						'application/octet-stream': {
							schema: { type: 'string', format: 'binary' },
						},
					},
				},
				responses: {
					'201': { description: 'Uploaded (returns id and createdAt)' },
					'400': { description: 'Empty upload' },
					'401': { description: 'Missing or invalid token' },
				},
			},
		},
	},
}

const app = new Hono()

// Serve the OpenAPI document
app.get('/doc', (c) => c.json(openApiDoc))

// Use the middleware to serve Swagger UI at the root of this router (mounted at /swagger)
app.get('/', swaggerUI({ url: '/swagger/doc' }))

app.get('/health', (c) => c.text('OK'))

export default app
