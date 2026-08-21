export default function ( params )
{
	console.log ( "   - Init Ajax part" );

	params.express.post ( '/login', function ( req, res )
	{
		params.user.login ( req.body.user, req.body.pass )
			.then ( r=>{
				req.session.user = req.body.user;
				req.session.logged = true;

				res.status ( 200 );
				res.json ({
					target: req.session.target
				});
				res.end ( );
			})
			.catch ( r=>{
				res.status ( 403 );
				res.json ({});
				res.end ( );
			})
	});

	params.express.put ( '/login', function ( req, res )
	{
		res.status ( 200 );
		res.json ({});
		res.end ( );
	});

	params.express.delete ( '/login', function ( req, res )
	{
		res.status ( 200 );
		res.json ({});
		res.end ( );
	});

	return params;
}