import { Binary_Message } from '../binary-message';

export class Binary_Message_Test {

	test_read_write(): number {
		let passed = 0, failed = 0;
		console.log( `Binary_Message_Test.test_read_write_basic started` );
		[
			[ 0, 'byte' ],
			[ 255, 'byte' ],
			[ 0, 'uint16' ],
			[ 65535, 'uint16' ],
			[ 0, 'uint32' ],
			[ 4294967295, 'uint32' ],
			[ 0n, 'uint64' ],
			[ 18446744073709551615n, 'uint64' ],
			[ 0n, 'uint128' ],
			[ 340282366920938463463374607431768211455n, 'uint128' ],
			[ -32768, 'int16', ],
			[ 32767, 'int16', ],
			[ -2147483648, 'int32' ],
			[ 2147483647, 'int32' ],
			[ -9223372036854775808n, 'int64' ],
			[ 9223372036854775807n, 'int64' ],
			[ -170141183460469231731687303715884105728n, 'int128' ],
			[ 170141183460469231731687303715884105727n, 'int128' ],
			[ -1.0, 'flop32' ],
			[ 1.0, 'flop32' ],
			[ -8000.505, 'flop64' ],
			[ 8000.505, 'flop64' ],
			[ new DataView( new Uint8Array( [ 255, 0, 255, 0, 65, 66, 67, 68 ] ).buffer ), 'dat8' ],
			[ new DataView( new Uint8Array( [ 0, 0, 65, 66, 67, 68, 0, 0, 255, 0, 255, 0, 65, 66, 67, 68 ] ).buffer ), 'dat16' ],
			[ new DataView( new Uint8Array( [] ).buffer ), 'data' ],
			[ new DataView( new Uint8Array( [ 255, 0, 65, 66, 67, 68, 0, 0, 255, 0, 0, 0, 0 ] ).buffer ), 'data' ],
			[ new Uint8Array( [ 65, 66, 67, 68, 255, 0, 0, 10 ] ).buffer, 'buf8' ],
			[ new Uint8Array( [ 0, 0, 65, 66, 67, 68, 0, 0, 255, 0, 255, 0, 65, 66, 67, 68 ] ).buffer, 'buf16' ],
			[ new Uint8Array().buffer, 'buffer' ],
			[ new Uint8Array( [ 255, 0, 65, 66, 67, 68, 0, 0, 255, 0, 0, 0, 0 ] ).buffer, 'buffer' ],
			[ 'abcdefgh', 'str8' ],
			[ 'abcdefghabcdefgh', 'str16' ],
			[ '', 'string' ],
			[ '\'', 'string' ],
			[ 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et' +
				' dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' cillum dolore eu fugiat nulla pariatur.', 'string' ],
			[ 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et' +
				' dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' cillum dolore eu fugiat nulla pariatur.', 'string' ],
		].forEach( prm => {
			const tv: any = prm[ 0 ];
			const type: string = prm[ 1 ] as string;
			let rv: any = null;
			let e = false;
			const msg = new Binary_Message( 'Test' );
			switch ( type ) {
				case 'byte':
					msg.write_byte( tv );
					rv = msg.read_byte();
					e = tv === rv;
					break;
				case 'uint16':
					msg.write_uint16( tv );
					rv = msg.read_uint16();
					e = tv === rv;
					break;
				case 'uint32':
					msg.write_uint32( tv );
					rv = msg.read_uint32();
					e = tv === rv;
					break;
				case 'uint64':
					msg.write_uint64( tv );
					rv = msg.read_uint64();
					e = tv === rv;
					break;
				case 'uint128':
					msg.write_uint128( tv );
					rv = msg.read_uint128();
					e = tv === rv;
					break;
				case 'int16':
					msg.write_int16( tv );
					rv = msg.read_int16();
					e = tv === rv;
					break;
				case 'int32':
					msg.write_int32( tv );
					rv = msg.read_int32();
					e = tv === rv;
					break;
				case 'int64':
					msg.write_int64( tv );
					rv = msg.read_int64();
					e = tv === rv;
					break;
				case 'int128':
					msg.write_int128( tv );
					rv = msg.read_int128();
					e = tv === rv;
					break;
				case 'flop32':
					msg.write_flop32( tv );
					rv = msg.read_flop32();
					e = tv === rv;
					break;
				case 'flop64':
					msg.write_flop64( tv );
					rv = msg.read_flop64();
					e = tv === rv;
					break;
				case 'dat8':
					msg.write_dat( tv );
					rv = msg.read_dat( 8 );
					e = Binary_Message.equate_data( tv, rv );
					break;
				case 'dat16':
					msg.write_dat( tv );
					rv = msg.read_dat( 16 );
					e = Binary_Message.equate_data( tv, rv );
					break;
				case 'data':
					msg.write_data( tv );
					rv = msg.read_data();
					e = Binary_Message.equate_data( tv, rv );
					break;
				case 'buf8':
					msg.write_buf( tv );
					rv = msg.read_buf( 8 );
					e = Binary_Message.equate_data( new DataView( tv ), new DataView( rv ) );
					break;
				case 'buf16':
					msg.write_buf( tv );
					rv = msg.read_buf( 16 );
					e = Binary_Message.equate_data( new DataView( tv ), new DataView( rv ) );
					break;
				case 'buffer':
					msg.write_buffer( tv );
					rv = msg.read_buffer();
					e = Binary_Message.equate_data( new DataView( tv ), new DataView( rv ) );
					break;
				case 'str8':
					msg.write_str( tv );
					rv = msg.read_str( 8 );
					e = tv === rv;
					break;
				case 'str16':
					msg.write_str( tv );
					rv = msg.read_str( 16 );
					e = tv === rv;
					break;
				case 'string':
					msg.write_string( tv );
					rv = msg.read_string();
					e = tv === rv;
					break;
				default: break;
			}
			if ( e ) {
				++passed;
			}
			else {
				console.error( `test failed on ${ rv } expected ${ tv } for ${ type }` );
				++failed;
			}
		} );
		console.log( `test finished: passed ${ passed } failed ${ failed }` );
		return failed;
	}

	test_read_write_data(): number {
		let passed = 0, failed = 0;
		console.log( `Binary_Message_Test.test_read_write_basic started` );
		const tm1 = new Binary_Message( 'abcd' );
		const rm1 = new Binary_Message( 'ab' );
		rm1.write_uint16( 0 );
		if ( rm1.byte_length === tm1.byte_length ) {
			++passed;
		}
		else {
			console.error( `test failed on ${ rm1.byte_length } expected ${ tm1.byte_length }` );
			++failed;
		}
		const tm2 = new Binary_Message( 'efgh' );
		tm2.write_data( tm1.get_data() );
		const rm2 = new Binary_Message( tm2.get_data() );
		if ( rm2.topic === tm2.topic ) {
			++passed;
		}
		else {
			console.error( `test failed on ${ rm2.topic } expected ${ tm2.topic }` );
			++failed;
		}
		console.log( `test finished: passed ${ passed } failed ${ failed }` );
		return failed;
	}

}
