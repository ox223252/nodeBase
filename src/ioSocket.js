import { Server as ServerIO } from "socket.io";

export default function ( params )
{
	console.log ( "   - Init Socket.io" );

	params.io = new ServerIO ( params.server );
	params.io.engine.use ( params.sessionMiddleware );

	params.connected = {};

	params.io.on ( "connection", function( socket )
	{
		let id = socket.request.sessionID;
		let index = undefined;

		if ( !params.connected[ id ] )
		{
			params.connected[ id ] = {
				user: "unknow",
				page: {},
				id: id,
			};
		}

		socket.on ( "identify", ( msg )=>{
			if ( !params.connected[ id ] )
			{
				params.connected[ id ] = {
					user: msg.user,
					page: {},
					id: id,
				};
			}

			params.connected[ id ].user = msg.user;
			params.connected[ id ].page[ socket.id ] = msg.page;
		});
		
		socket.on ( "disconnect", ( )=>{
			delete params.connected[ id ].page[ socket.id ];

			if ( 0 == Object.keys ( params.connected[ id ].page ).length )
			{
				delete params.connected[ id ];
			}
		});
	});

	return params;
}