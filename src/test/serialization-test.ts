import Binary_Message from '../export/binary-message';

class Serialization_Test {

	run(): number {
		let passed = 0, failed = 0;
		console.log( `test message.test_read_write_message started` );
		[
			[ 255, 'byte' ],
			[ 600, 'int16',  ],
			[ 6000, 'nat16' ],
			[ -5000, 'int32' ],
			[ 800000, 'nat32' ],
			[ 8000.505, 'num64' ],
			[ new Uint8Array( [ 65, 66, 67, 68, 255, 0, 0, 10 ] ).buffer, 'buf64' ],
			[ new Uint8Array( [ 0, 0, 65, 66, 67, 68, 0, 0, 255, 0, 255, 0, 65, 66, 67, 68 ] ).buffer, 'buf128' ],
			[ 'abcd', 'str64' ],
			[ 'abcdefgh', 'str128' ],
			[ null, 'buffer' ],
			[ new Uint8Array().buffer, 'buffer' ],
			[ new Uint8Array( [ 0, 0, 0, 0, 66, 67, 68, 255 ] ).buffer, 'buffer' ],
			[ new Uint8Array( [ 255, 0, 65, 66, 67, 68, 0, 0, 255, 0, 0, 0, 0 ] ).buffer, 'buffer' ],
			[ null, 'string' ],
			[ '', 'string' ],
			[ ' Test - ////', 'string' ],
			[ 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et' +
				' dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut' +
				' aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
				' cillum dolore eu fugiat nulla pariatur.', 'string' ],
		].forEach( prm => {
			let val = prm[ 0 ];
			const type: string = prm[ 1 ] as string;
			let v: any = null;
			const msg = new Binary_Message();
			switch ( type ) {
				case 'byte':
					msg.write_byte( val as number );
					v = msg.read_byte();
				break;
				case 'int16':
					msg.write_int16( val as number );
					v = msg.read_int16();
				break;
				case 'nat16':
					msg.write_nat16( val as number );
					v = msg.read_nat16();
				break;
				case 'int32':
					msg.write_int32( val as number );
					v = msg.read_int32();
				break;
				case 'nat32':
					msg.write_nat32( val as number );
					v = msg.read_nat32();
				break;
				case 'num64':
					msg.write_num64( val as number );
					v = msg.read_num64();
				break;
				case 'buf64':
				case 'buf128':
				case 'buffer': {
					const buf = val as ArrayBuffer | SharedArrayBuffer;
					let tbuf: ArrayBuffer | null;
					switch ( type ) {
						case 'buf64': msg.write_buf( buf ); tbuf = msg.read_buf( 8 ); break;
						case 'buf128': msg.write_buf( buf ); tbuf = msg.read_buf( 16 ); break;
						case 'buffer': msg.write_buffer( buf ); tbuf = msg.read_buffer(); break;
					}
					const bin = new Uint8Array( buf );
					const tbin = tbuf ? new Uint8Array( tbuf ) : null;
					if ( this.equal_binary( buf ? new DataView( buf ) : null, tbuf ? new DataView( tbuf ) : null ) ) {
						v = val;
					}
					else {
						val = bin;
						v = tbin;
					}
				}
				break;
				case 'str64':
				case 'str128':
				case 'string': {
					const str = val as string;
					let tstr: string | null;
					switch ( type ) {
						case 'str64': msg.write_str( str ); tstr = msg.read_str( 4 ); break;
						case 'str128': msg.write_str( str ); tstr = msg.read_str( 8 ); break;
						case 'string': msg.write_string( str ); tstr = msg.read_string(); break;
					}
					if ( str === tstr ) {
						v = val;
					}
				}
				break;
			}
			if ( v === val ) {
				++passed;
			}
			else {
				console.error( `serialization test failed on ${ v } expected ${ val } for ${ type }` );
				++failed;
			}
		} );
		console.log( `serialization test finished: passed ${ passed } failed ${ failed }` );
		return failed;
	}

	private equal_binary( bin1: DataView | null, bin2: DataView | null ): boolean {
		if ( bin1 == null && bin2 == null ) {
			return true;
		}
		if ( bin1 == null || bin2 == null ) {
			return false;
		}
		if ( bin1.byteLength !== bin2.byteLength ) {
			return false;
		}
		for ( let lfi = bin1.byteLength - 3, i = 0; i < bin1.byteLength; ) {
			if ( i < lfi ) {
				if ( bin1.getUint32( i ) !== bin2.getUint32( i ) ) {
					return false;
				}
				i += 4;
			}
			else {
				if ( bin1.getUint8( i ) !== bin2.getUint8( i ) ) {
					return false;
				}
				++i;
			}
		}
		return true;
	}

}