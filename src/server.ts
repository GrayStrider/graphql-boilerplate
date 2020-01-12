import 'reflect-metadata'
import Koa, {DefaultState, Context} from 'koa'
import helmet from 'koa-helmet'
import session from 'koa-session'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import {log} from '@/utils/libsExport'
import RedisStore from 'koa-redis'
import {redis} from '@/DB/redis'
import {PORT, HOST} from 'config/_consts'
import {usersServer} from '@/models/UsersPlayground'
import {plainSchemaServer} from '@/models/PlainSchema'
import {useContainer, createConnection} from 'typeorm'
import {Container} from 'typedi'
import {ORMConfig} from 'config/_typeorm'
import AccountsPassword from '@accounts/password'
import {AccountsTypeorm, entities} from '@accounts/typeorm'
import AccountsServer from '@accounts/server'
import {AccountsModule} from '@accounts/graphql-api'
import {makeExecutableSchema} from 'graphql-tools'
import {mergeTypeDefs, mergeResolvers} from '@graphql-toolkit/schema-merging'
import {concat} from 'ramda'

export async function KoaServer() {
	const app = new Koa()
	const router = new Router<DefaultState, Context>()
	
	const connection = await createConnection(ORMConfig)
	useContainer(Container)
	if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
		log.warn('resetting the DB')
		await connection.synchronize(true)
	}
	const accountsPassword = new AccountsPassword({
		validateNewUser: user => user,
	})
	const accountsTypeorm = new AccountsTypeorm({
		connection,
	})
	const accountsServer = new AccountsServer({
		db: accountsTypeorm,
		tokenSecret: '123',
	}, {password: accountsPassword})
	
	const accountsGraphQL = AccountsModule.forRoot({
		accountsServer,
	})
	
	const schema = makeExecutableSchema({
		typeDefs: mergeTypeDefs([accountsGraphQL.typeDefs]),
		resolvers: mergeResolvers([accountsGraphQL.resolvers]),
		schemaDirectives: {
			...accountsGraphQL.schemaDirectives,
		},
	})
	
	
	
	
	
	
	app.use(session({
		store: RedisStore({
			client: redis,
		}),
		key: 'redisCookie',
	}, app))
	
	app.use(helmet({}))
	app.use(cors({}))
	app.use(bodyParser({}))
	
	router.get('/', (ctx, next) => {
		ctx.body = 'Hello World!'
	})
	
	app.use(router.routes())
	app.use(router.allowedMethods({}))
	
	app.use(plainSchemaServer())
	
	return app
		.listen(PORT, () => {
			log.success(`Users: http://${HOST}:${PORT}`)
		})
}

