import {createSchema} from '@/graphql'
import {UserResolver} from '@/models/UsersPlayground/user.resolver'
import {genericApolloServer, defaultCtx} from '@/graphql/apollo/genericServer'
import {useContainer, createConnection} from 'typeorm'
import {Container} from 'typedi'
import {ORMConfig} from 'config/_typeorm'
import {log} from '@/utils/libsExport'
import AccountsPassword from '@accounts/password'
import {AccountsTypeorm, entities} from '@accounts/typeorm'
import AccountsServer from '@accounts/server'
import {AccountsModule} from '@accounts/graphql-api'
import {makeExecutableSchema} from 'graphql-tools'
import {mergeTypeDefs, mergeResolvers, mergeSchemas} from '@graphql-toolkit/schema-merging'
import {Context} from 'koa'

export const usersServer = async (context: any) => {
	
	useContainer(Container)
	const connection = await createConnection({
		entities,
		...ORMConfig
	})
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
	const typeGraphqlSchema = await createSchema([UserResolver])
	return genericApolloServer(
		mergeSchemas({schemas: [typeGraphqlSchema, schema]}),
		{
			...accountsGraphQL.context,
			...defaultCtx
		}
	)
		.getMiddleware(
			{path: '/users'},
		)
}
