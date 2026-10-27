// gestionnaire d'erreurs : à enregistrer après toutes les routes
// ne renvoie jamais la pile au client, seulement un code et un message court
export default function ( params )
{
	console.log ( "   - Init error handler" );

	params.express.use ( function ( err, req, res, next )
	{
		if ( res.headersSent )
		{
			return next ( err );
		}

		// erreurs 4xx connues ( JSON malformé, corps trop gros... ) : message court
		// sinon 500 et détail uniquement dans les logs du serveur
		let status = ( 400 <= err?.status && 500 > err?.status ) ? err.status : 500;

		if ( 500 == status )
		{
			console.error ( "error", req.method, req.originalUrl, err );
		}

		res.status ( status );

		if ( req.path.startsWith ( "/ajax/" ) )
		{
			res.json ({ msg: ( 500 == status ) ? "server error" : "bad request" });
		}
		else
		{
			res.type ( "text" ).send ( ( 500 == status ) ? "server error" : "bad request" );
		}
	});

	return params;
}