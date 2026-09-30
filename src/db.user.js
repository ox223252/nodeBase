import fs from 'fs'; // read / write files
import util from 'util';
import crypto from 'crypto'; // sha512
import chokidar from "chokidar";
import childProcess from 'child_process';

const exec = util.promisify ( childProcess.exec );

class User {
	constructor ( params )
	{
		this._file = params.file;
		let path = this._file.substring ( 0, this._file.lastIndexOf ( "/" ) );

		if ( !fs.existsSync ( path ) )
		{
			fs.mkdirSync ( path, {recursive:true} )
		}

		if ( !fs.existsSync ( this._file ) )
		{
			this.db = [];
		}
	}

	login ( token )
	{		
		if ( !token )
		{
			return Promise.reject ( );
		}

		let index = this.db.map ( u=>u.token )
			.indexOf ( token );

		if ( -1 == index )
		{
			return Promise.reject ( );
		}
		
		let tmp = { ...this.db[ index ] };

		return Promise.resolve ( tmp );
	}

	exist ( )
	{
		return Promise.reject ( );
	}

	add ( )
	{
		return Promise.reject ( );
	}

	rm ( )
	{
		return Promise.reject ( );
	}

	get users ( )
	{
		return Promise.reject ( );
	}

	set db ( value )
	{
		if ( "Array" != value?.constructor.name )
		{
			this._db = [];
			throw "invalide db format";
		}
		else
		{
			this._db = value;
			fs.writeFileSync ( this._file, JSON.stringify ( this._db, null, 4 ) );
		}
	}

	get db ( )
	{
		if ( !this._db ) try
		{
			this._db = JSON.parse ( fs.readFileSync ( this._file, "utf-8" ).toString ( ) );
		}
		catch ( e )
		{
			this._db = [];
		}

		return this._db ?? [];
	}
}

class ULinux extends User {
	constructor ( params )
	{
		super ( params );

		this.group = params.group;

		this.init ( );
	}

	init ( )
	{
		return exec ( `getent group | grep ${this.group}` )
			.catch ( r=>{
				if ( process.getuid ( ) )
				{
					throw `ERROR : group "${this.group}" undefined, login can't work`;
				}
				else
				{
					return exec ( `addgroup ${this.group}`)
						.then ( r=>{
							console.log ( `   - group "${this.group}" added` )
						})
				}
			})
			.then ( ()=>{
				console.log ( ` - Use linux system to connect` )
				console.log ( `   - connexion allowed to group "${this.group}"` )
			})
	}

	login ( name, passwd, token )
	{
		return super.login ( token )
			.then ( r=>{
				return r;
			})
			.catch ( ()=>{
				return this.users
					.then ( r=>{
						if ( 0 > r.indexOf ( name ) )
						{
							throw 'user not allowed';
						}

						return exec ( `echo ${passwd} | su - ${name} -c exit 0` )
					})
					.then ( r=>{
						let index = this.db.map ( u=>u.name )
							.indexOf ( name );

						if ( -1 == index )
						{
							let t = {
								name: name,
								token: crypto.createHash ( 'sha512' ).update ( Math.random ( ).toString ( ) ).digest ( 'hex' ),
							};

							this.db = [ ...this.db, t ];

							return { ...t };
						}
						else
						{
							this.db[ index ].token = crypto.createHash ( 'sha512' ).update ( Math.random ( ).toString ( ) ).digest ( 'hex' );
							this.db = [ ...this.db ];

							return { ...this.db[ index ] };
						}
					})
					.catch ( r=>{
						throw "invalid";
					})
			})
	}

	exist ( name )
	{
		if ( !this._isRoot )
		{
			return Promise.reject ( "user check : neet to be root" );
		}

		return exec ( `id ${name}` )
			.then ( r=>{
				return 0;
			})
			.catch ( r=>{
				throw "invalid";
			})
	}

	add ( name, passwd )
	{
		if ( !this._isRoot )
		{
			return Promise.reject ( "user add : neet to be root" );
		}

		return this.exist ( name )
			.then ( ()=>{
				return exec ( `usermod -a -G ${this.group} ${name}` )
			})
			.catch ( r=>{
				return exec ( `useradd ${name} --groups ${this.group} --no-create-home --shell false` )
			})
	}

	get users ( )
	{
		return exec ( `getent group | grep ${this.group} | cut -d':' -f4` )
			.then ( r=>r.stdout.trim ( ).split ( "," ) )
			.then ( r=>{
				if ( 0 <= r.indexOf ( "root" ) )
				{
					r.splice ( r.indexOf ( "root" ), 1 );
				}

				if ( 0 == r.length )
				{
					r = [ "root" ];
				}

				return r;
			})
	}

	get _isRoot ( )
	{
		return process.getuid ( ) == 0;
	}
}

class UFile extends User {
	constructor ( params )
	{
		super ( params );
	}

	_firstRoot ( )
	{
		console.log ( ` - Use file DB to connect` )
		console.log ( `   - no user defined, next one will be root` )
	}

	login ( name, passwd, token )
	{
		if ( 0 == this.db.length )
		{
			return this.add ( name, passwd );
		}

		return super.login ( token )
			.then ( r=>{
				delete r.pass;
				return r;
			})
			.catch ( ()=>{
				return this.users
					.then ( r=>{
						let index = r.indexOf ( name );

						if ( -1 == index )
						{
							throw "invalid";
						}

						let hash = crypto.createHash ( 'sha512' ).update ( passwd ).digest ( 'hex' )
						if ( hash != this.db[ index ].pass )
						{
							throw "invalid"
						}

						let tmp = { ...this.db[ index ] }

						delete tmp.pass;

						return tmp;
					})
			})
	}

	exist ( name )
	{
		return this.users
			.then ( r=>{
				if ( -1 < r.indexOf ( name ) )
				{
					return 0;
				}
				else
				{
					throw "invalid";
				}
			})
	}

	add ( name, passwd, params = {} )
	{
		let nUser = Object.assign ({
			name: name,
			pass: crypto.createHash ( 'sha512' ).update ( passwd ).digest ( 'hex' ),
			token: crypto.createHash ( 'sha512' ).update ( Math.random ( ).toString ( ) ).digest ( 'hex' ),
		}, params )

		try
		{
			let index = this.db.map ( u=>u.name ).indexOf ( name );
			if ( -1 != index )
			{
				this.db[ index ] = nUser;
			}
			else
			{
				this.db.push ( nUser );
			}

			this.db = this.db;

			return Promise.resolve ( nUser );
		}
		catch ( e )
		{
			return Promise.reject ( "invalid" );
		}
	}

	get users ( )
	{
		return Promise.resolve ( this.db.map ( u=>u.name ) );
	}

	set db ( value )
	{
		super.db = value;

		if ( 0 == this.db.length )
		{
			this._firstRoot ( );
		}
	}

	get db ( )
	{
		return super.db;
	}
}

export default function ( params )
{
	switch ( params.args.login )
	{
		case "linux":
		{
			params.login = new ULinux ( {
				file: params.args.loginFile,
				group: params.args.loginGroup
			} );
			
			break;
		}
		case "file":
		{
			params.login = new UFile ( {
				file: params.args.loginFile
			} );
			break;
		}
		default:
		{
			throw `user management mode unknow : ${params.args.login}`;
		}
	}

	return params;
}