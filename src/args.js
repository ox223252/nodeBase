import yargs from 'yargs'

export default function ( params )
{
	params.args = yargs ( process.argv )
		.option ( 'help', {
			alias: 'h',
			type: 'boolean',
			describe: 'this window',
		})
		.option ( 'debug', {
			alias: 'd',
			type: 'boolean',
			describe: 'activate debug mode',
		})
		.option ( 'port', {
			alias: 'p',
			type: 'number',
			describe: 'app port',
		})
		.option ( 'server', {
			describe: 'server type',
			choices: [ 'http', 'https' ],
			default: 'https',
		})
		.option ( 'keyPath', {
			describe: "credential path for key and certs",
			default: "private",
		})
		.option ( 'key', {
			describe: "private key",
			default: "key.pem",
		})
		.option ( 'cert', {
			describe: "private key",
			default: "certificate.pem",
		})
		.option ( 'keySize', {
			describe: 'user login for SQL databse connection',
			type: 'number',
			default: 4096
		})
		.option ( 'user', {
			alias: 'u',
			describe: 'user login mode',
   			choices: [ 'linux', 'file' ],
			default: 'linux',
		})
		.option ( 'userGroup', {
			describe: 'name of groupe for linux user\'s',
			default: 'loginForNodeApp',
		})
		.argv;

	return Promise.resolve ( params );
}
