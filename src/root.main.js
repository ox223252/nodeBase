export default function ( params )
{
	console.log ( "   - Init Root part" );

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