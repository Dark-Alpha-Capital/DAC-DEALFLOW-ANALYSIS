import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

app.get('/api/v1/hello', (c) => c.text('Hello World'))
app.get("/health", (c) => c.text('OK'))



export default app