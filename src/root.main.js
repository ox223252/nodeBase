export default function ( params )
{
	console.log ( "   - Init Root part" );

	params.express.use ( function ( req, res, next )
	{
		let routes = [];

		if ( 0 == req.originalUrl.indexOf ( "/ajax/" ) )
		{
			return next ( );
		}

		switch ( res.locals.logged )
		{
			default:
			{
				routes.push ( "/" );
				routes.push ( "/login" );
				break;
			}
		}

		if ( routes.includes ( req.originalUrl ) )
		{
			next ( );
		}
		else
		{
			req.session.target = req.originalUrl;
			res.redirect ( "/login" );
		}
	});

	params.express.use ( function ( req, res, next )
	{
		res.locals.title = params.name;
		res.locals.user = req.session.user || "unknow";
		res.locals.page = req.originalUrl;
		res.locals.logged = req.session.logged;

		next ( );
	});

	params.express.get ( '/', function ( req, res )
	{
		res.render ( 'main.html' );
	});

	params.express.get ( '/login', function ( req, res )
	{
		req.session.logged = false;
		res.render ( 'login.html' );
	});

	return params;
}