const yargs = require( "yargs-parser" );
const shortid = require( "shortid" );
const semver = require( "semver" );
const fsmFactory = require( "./fsm" );
const contextFactory = require( "./context/slapp" );

module.exports = ( app ) => {
	const { slapp } = app;
	const fsm = fsmFactory( app );
	const context = contextFactory( app );

	function onError( err, ctx ) {
		const body = `:sweat: Woops!  \`${ err.message }\`\n\`\`\`${ err.stack }\`\`\``;
		ctx.respond( body );
	}

	slapp.message( /create release(.*)/i, [ "direct_message", "direct_mention", "mention" ], ( msg, opt ) => {
		const params = opt.trim()
			.replace( /[\u2018\u2019]/g, "'" )	// replace fancy single-quotes
			.replace( /[\u201C\u201D]/g, '"' );	// replace fancy double-quotes
		const parsed = yargs( params );
		const { name, version } = parsed;
		let { notes = name, platform = "ios,android" } = parsed;

		function showHelp( validation ) {
			return msg.say( `${ validation }\n\n` +
				"> Usage:  `create release --name=\"Some name\" --version=1.1.1" +
				" --platform=ios --notes=\"comma,delimited,list of notes\"`" );
		}

		if ( !name ) {
			return showHelp( "A release name is required." );
		}
		if ( version && !semver.valid( version ) ) {
			return showHelp( "A semantic release version is required." );
		}

		const state = {
			id: `${ msg.meta.team_id }|mobile|release|${ shortid.generate() }`,
			repo: { user: "BanditSoftware", name: "leankit-mobile" },
			versions: {
				latest: version
			},
			answers: {
				name, version,
				versionBump: !!version,
				notes: notes.split( "," ).map( v => v.trim() ),
				platforms: platform.split( "," ).map( v => v.trim() )
			}
		};
		fsm.lookupOrCreate( state.id, () => state )
			.then( api => api.start( context( msg ) ) )
			.catch( err => onError( err, context( msg ) ) );
	} );

	slapp.action( "tag-release", "confirm_version_bump", ( msg, data ) => {
		const { id, key, value } = JSON.parse( data );
		const ctx = context( msg );
		fsm.lookupOrCreate( id )
			.then( api => api.answer( ctx, { key, value } ) )
			.catch( err => onError( err, ctx ) );
	} );

	slapp.action( "tag-release", "confirm_release", ( msg, data ) => {
		const { id, key, value } = JSON.parse( data );
		const ctx = context( msg );
		fsm.lookupOrCreate( id )
			.then( api => api.answer( ctx, { key, value } ) )
			.catch( err => onError( err, ctx ) );
	} );

	slapp.action( "tag-release", "cancel", ( msg, data ) => {
		const { id } = JSON.parse( data );
		const ctx = context( msg );
		fsm.lookupOrCreate( id )
			.then( api => api.cancel( ctx ) )
			.catch( err => onError( err, ctx ) );
	} );
};