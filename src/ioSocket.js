import { Server as ServerIO } from "socket.io";

export default function ( params )
{
	console.log ( "   - Init Socket.io" );

	params.io = new ServerIO ( params.server );
	params.io.engine.use ( params.sessionMiddleware );

	params.connected = {};

	console.log ( )

	params.io.on ( "connection", function( socket )
	{
		let id = socket.request.sessionID;
		let index = undefined;

		socket.on ( "identify", ( msg )=>{
			if ( !params.connected[ id ] )
			{
				params.connected[ id ] = {
					user: msg.user,
					page: [],
					id: id,
				};
			}

			index = params.connected[ id ].page.length;

			params.connected[ id ].page[ index ] = msg.page;
		});
		
		socket.on ( "disconnect", ( )=>{
			params.connected[ id ].page[ index ] = undefined;

			if ( 0 == params.connected[ id ].page?.filter ( f=>f ).length )
			{
				delete params.connected[ id ];
			}
		});
	});


	return params;
}