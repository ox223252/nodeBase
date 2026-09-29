import fs from 'fs'; // read / write files
import util from 'util';
import crypto from 'crypto'; // sha512
import chokidar from "chokidar";
import childProcess from 'child_process';

const exec = util.promisify ( childProcess.exec );

class User {
	constructor ( )
	{

	}

	login ( )
	{
		return Promise.reject ( );
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
}

class UfLinux extends User {
	constructor ( params )
	{
		super ( );

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

	login ( name, passwd )
	{
		return this.users
			.then ( r=>{
				if ( 0 > r.indexOf ( name ) )
				{
					throw 'user not allowed';
				}

				return exec ( `echo ${passwd} | su - ${name} -c exit 0` )
			})
			.then ( r=>{
				return 0;
			})
			.catch ( r=>{
				throw "invalid";
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
				if ( r.length > 1 )
				{
					r.splice ( r.indexOf ( "root" ), 1 );
				}
				else
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

class UfFile extends User {
	constructor ( params )
	{
		super ( );

		this._file = params.file;
		let path = this._file.substring ( 0, this._file.lastIndexOf ( "/" ) );
		if ( !fs.existsSync ( path ) )
		{
			fs.mkdirSync ( path, {recursive:true} )
		}

		function parse ( path )
		{
			let tmp;
			try
			{
				tmp = fs.readFileSync ( path, "utf-8" );
				tmp = eval ( tmp );
			}
			catch ( e )
			{
				tmp = [];
			}

			return tmp;
		}

		let watcher = chokidar.watch ( this._file, {ignored: /^\.+/} )
			.on ( 'add', ()=>{
				this.db = parse ( this._file );

				if ( 0 == this.db.length )
				{
					this._firstRoot ( );
				}
			})
			.on ( 'change', ()=>{
				this.db = parse ( this._file );

				if ( 0 == this.db.length )
				{
					this._firstRoot ( );
				}
			})
			.on ( 'unlink', ()=>{
				this.db = [];
			})

		if ( !fs.existsSync ( this._file ) )
		{
			this._firstRoot ( );
			this.db = [];
		}
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
		
		if ( token )
		{
			let index = this.db.map ( u=>u.token )
				.indexOf ( token );

			if ( -1 == index )
			{
			}
			else
			{
				let tmp = { ...this.db[ index ] }

				delete tmp.pass;

				return Promise.resolve ( tmp );
			}
		}
		else if ( !name
			&& !passwd )
		{
			throw "invalid";
		}

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
		return Promise.resolve ( this._db.map ( u=>u.name ) );
	}

	set db ( value )
	{
		if ( "Array" != value?.constructor.name )
		{
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
		return this._db;
	}
}

export default function ( params )
{
	switch ( params.args.login )
	{
		case "linux":
		{
			params.login = new UfLinux ( {
				group: params.args.loginGroup
			} );
			
			break;
		}
		case "file":
		{
			params.login = new UfFile ( {
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