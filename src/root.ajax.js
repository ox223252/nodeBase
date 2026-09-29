export default function ( params )
{
	console.log ( "   - Init Ajax part" );

	params.express.post ( '/ajax/login', function ( req, res )
	{
		params.login.login ( req.body.user, req.body.pass, req.body.token )
			.then ( r=>{
				req.session.user = r.name;
				req.session.logged = r.status || true;

				if ( "/login" == req.session.target )
				{
					req.session.target = "/";
				}

				res.status ( 200 );
				res.json ({
					target: req.session.target,
					token: r.token,
				});
				res.end ( );
			})
			.catch ( r=>{
				res.status ( 403 );
				res.json ({});
				res.end ( );
			})
	});

	return params;
}