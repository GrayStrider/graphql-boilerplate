import {genericApolloServer} from '@/graphql/apollo/genericServer'
import {plainSchema} from '@/graphql'
import {routes} from 'config/_consts'

export const plainSchemaServer = () => {
	console.log(`${routes().plain}`)
	return genericApolloServer(plainSchema)
		.getMiddleware(
			{path: '/plain'},
		)
}
