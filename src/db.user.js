import util from 'util';
import childProcess from 'child_process';

const exec = util.promisify ( childProcess.exec );

class User {
	constructor ( )
	{

	}

	init ( )
	{
		return Promise.resolve ( );
	}

	login ( )
	{
		return Promise.reject ( );
	}

	check ( )
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
		return this._getAllowed ( )
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

	check ( name )
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

		return this.check ( name )
			.then ( ()=>{
				return exec ( `usermod -a -G ${this.group} ${name}` )
			})
			.catch ( r=>{
				return exec ( `useradd ${name} --groups ${this.group} --no-create-home --shell false` )
			})
	}

	_getAllowed ( )
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

export default function ( params )
{
	switch ( params.args.user )
	{
		case "linux":
		{
			params.user = new UfLinux ( {
				group: params.args.userGroup
			} );
			
			break;
		}
		case "file":
		default:
		{
			throw "user management mode unknow";
		}
	}

	return params;
}