const __MSG_HEADER_SIZE = 16;
const __MSG_DATE_NULL_VALUE = -0x80000000;
const __MSG_TIME_NULL_VALUE = -0x20000000000000;

export default class Binary_Message {

	constructor( data?: ArrayBuffer ) {
		if ( !data || data.byteLength < __MSG_HEADER_SIZE ) {
			this._data =  new ArrayBuffer( __MSG_HEADER_SIZE << 1 );
			this._write_offset = __MSG_HEADER_SIZE;
		}
		else {
			this._data = data;
			this._write_offset = data.byteLength;
		}
		this._read_offset = __MSG_HEADER_SIZE;
		this._view = new DataView( this._data );
	}
	protected _data: ArrayBuffer;
	protected _read_offset: number;
	protected _write_offset: number;
	private _view: DataView;

	data(): ArrayBuffer {
		return this._data.slice( 0, this._write_offset );
	}

	header(): ArrayBuffer {
		return this._data.slice( 0, __MSG_HEADER_SIZE );
	}

	content(): ArrayBuffer {
		return this._data.slice( __MSG_HEADER_SIZE, this._write_offset );
	}

	get length(): number {
		return this._write_offset;
	}

	get at_end(): boolean {
		return this._read_offset === this._write_offset;
	}

	get is_empty(): boolean {
		return this._write_offset === __MSG_HEADER_SIZE;
	}

	get is_blank(): boolean {
		return !this.get_nat64_header( 0 ) && !this.get_nat64_header( 1 ) && this.is_empty;
	}

	match_header( m: Binary_Message ): boolean {
		return this.get_nat64_header( 0 ) === m.get_nat64_header( 0 ) && this.get_nat64_header( 1 ) === m.get_nat64_header( 1 );
	}

	reset_read(): Binary_Message {
		this._read_offset = __MSG_HEADER_SIZE;
		return this;
	}

	add_capacity( increment: number ): void {
		const data = new ArrayBuffer( this._data.byteLength + ( increment > this._data.byteLength ? increment : this._data.byteLength ) );
		( new Uint8Array( data ) ).set( new Uint8Array( this._data ) );
		this._view = new DataView( this._data = data );
	}

	trim_capacity(): void {
		const data = new ArrayBuffer( Math.max( this._read_offset, this._write_offset ) );
		( new Uint8Array( data ) ).set( ( new Uint8Array( this._data ) ).subarray( 0, data.byteLength ) );
		this._view = new DataView( this._data = data );
	}

	get_int128_header(): bigint {
		return ( this._view.getBigInt64( 0 ) << BigInt( 64 ) ) + this._view.getBigUint64( 8 );
	}

	set_int128_header( v: bigint ) {
		this._view.setBigInt64( 0, BigInt.asIntN( 64, v >> BigInt( 64 ) ) );
		this._view.setBigUint64( 8, v & BigInt( 0xffffffffffffffff ) );
	}

	get_nat128_header(): bigint {
		return ( this._view.getBigUint64( 0 ) << BigInt( 64 ) ) + this._view.getBigUint64( 8 );
	}

	set_nat128_header( v: bigint ) {
		this._view.setBigUint64( 0, BigInt.asUintN( 64, v >> BigInt( 64 ) ) );
		this._view.setBigUint64( 8, v & BigInt( 0xffffffffffffffff ) );
	}

	get_int64_header( i: 0 | 1 ): bigint {
		return this._view.getBigInt64( i << 3 );
	}

	set_int64_header( i: 0 | 1, v: bigint ): void {
		this._view.setBigInt64( i << 3, v );
	}

	get_nat64_header( i: 0 | 1 ): bigint {
		return this._view.getBigUint64( i << 3 );
	}

	set_nat64_header( i: 0 | 1, v: bigint ): void {
		this._view.setBigUint64( i << 3, v );
	}

	get_int32_header( i: 0 | 1 | 2 | 3 ): number {
		return this._view.getInt32( i << 2 );
	}

	set_int32_header( i: 0 | 1 | 2 | 3, v: number ): void {
		this._view.setInt32( i << 2, v );
	}

	get_nat32_header( i: 0 | 1 | 2 | 3 ): number {
		return this._view.getUint32( i << 2 );
	}

	set_nat32_header( i: 0 | 1 | 2 | 3, v: number ): void {
		this._view.setUint32( i << 2, v );
	}

	get_int16_header( i: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 ): number {
		return this._view.getInt16( i << 1 );
	}

	set_int16_header( i: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, v: number ): void {
		this._view.setInt16( i << 1, v );
	}

	get_nat16_header( i: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 ): number {
		return this._view.getUint16( i << 1 );
	}

	set_nat16_header( i: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, v: number ): void {
		this._view.setUint16( i << 2, v );
	}

	protected read<T>( increment: number, f: () => T ): T {
		const offset = this._read_offset + increment;
		if ( offset > this._data.byteLength ) {
			throw new RangeError( `message buffer size ${this._data.byteLength} exceeded by ${offset - this._data.byteLength}\n${ this.toString() }` );
		}
		const v = f();
		this._read_offset = offset;
		return v;
	}

	protected write( increment: number, f: () => void ): void {
		const offset = this._write_offset + increment;
		if ( offset > this._data.byteLength ) {
			const deficit = offset - this._data.byteLength;
			this.add_capacity( deficit < this._data.byteLength ? this._data.byteLength : deficit );
		}
		f();
		this._write_offset = offset;
	}

	read_byte(): number {
		return this.read( 1, () => this._view.getUint8( this._read_offset ) );
	}

	write_byte( v: number ): void {
		this.write( 1, () => this._view.setUint8( this._write_offset, v || 0 ) );
	}

	read_int16(): number {
		return this.read( 2, () => this._view.getInt16( this._read_offset ) );
	}

	write_int16( v: number ): void {
		this.write( 2, () => this._view.setInt16( this._write_offset, v || 0 ) );
	}

	read_int32(): number {
		return this.read( 4, () => this._view.getInt32( this._read_offset ) );
	}

	write_int32( v: number ): void {
		this.write( 4, () => this._view.setInt32( this._write_offset, v || 0 ) );
	}

	read_int64(): bigint {
		return this.read( 8, () => this._view.getBigInt64( this._read_offset ) );
	}

	write_int64( v: bigint ): void {
		this.write( 8, () => this._view.setBigInt64( this._write_offset, v ) );
	}

	read_nat16(): number {
		return this.read( 2, () => this._view.getUint16( this._read_offset ) );
	}

	write_nat16( v: number ): void {
		this.write( 2, () => this._view.setUint16( this._write_offset, v || 0 ) );
	}

	read_nat32(): number {
		return this.read( 4, () => this._view.getUint32( this._read_offset ) );
	}

	write_nat32( v: number ): void {
		this.write( 4, () => this._view.setUint32( this._write_offset, v || 0 ) );
	}

	read_nat64(): bigint {
		return this.read( 8, () => this._view.getBigUint64( this._read_offset ) );
	}

	write_nat64( v: bigint ): void {
		this.write( 8, () => this._view.setBigUint64( this._write_offset, v ) );
	}

	read_num32(): number {
		return this.read( 4, () => this._view.getFloat32( this._read_offset ) );
	}

	write_num32( v: number ): void {
		this.write( 4, () => this._view.setFloat32( this._write_offset, v || 0 ) );
	}

	read_num64(): number {
		return this.read( 8, () => this._view.getFloat64( this._read_offset ) );
	}

	write_num64( v: number ): void {
		this.write( 8, () => this._view.setFloat64( this._write_offset, v || 0 ) );
	}

	read_bin( len: number | null ): DataView | null {
		if ( len != null && len >= 0 ) {
			return this.read( len, () => new DataView( this._data, this._read_offset, len ) );
		}
		return null;
	}

	write_bin( v: DataView ): void {
		if ( v != null ) {
			this.write( v.byteLength, () => {
				for ( let i = 0; i < v.byteLength; ++i ) {
					this._view.setUint8( this._write_offset + i, v.getUint8( i ) );
				}
			} );
		}
	}

	read_buf( len: number | null ): ArrayBuffer | null {
		if ( len != null && len >= 0 ) {
			return this.read( len, () => this._data.slice( this._read_offset, this._read_offset + len ) );
		}
		return null;
	}

	write_buf( v: ArrayBuffer | SharedArrayBuffer ): void {
		if ( v != null ) {
			this.write_bin( new DataView( v ) );
		}
	}

	read_str( len: number | null ): string | null {
		if ( len != null && len >= 0 ) {
			let v = '';
			return this.read( len * 2, () => {
				for ( let i = 0; i < len; ++i ) {
					v += String.fromCharCode( this._view.getUint16( this._read_offset + i + i ) );
				}
				return v;
			} );
		}
		return null;
	}

	write_str( v: string ): void {
		if ( v != null ) {
			this.write( v.length * 2, () => {
				for ( let i = 0; i < v.length; ++i ) {
					this._view.setUint16( this._write_offset + i + i, v.charCodeAt( i ) );
				}
			} );
		}
	}

	read_bool(): boolean {
		return this.read_byte() !== 0;
	}

	write_bool( v: boolean ): void {
		this.write_byte( v ? 255 : 0 );
	}

	read_length(): number | null {
		const v = this.read_num64();
		return v < 0 ? null : v;
	}

	write_length( v: number | null ): void {
		this.write_num64( v == null || v < 0 ? -1 : v );
	}

	read_date(): Date | null {
		const v = this.read_int32();
		return v === __MSG_DATE_NULL_VALUE ? null : new Date( v * ( 24 * 60 * 60 * 1000 ) );
	}

	write_date( v: Date ): void {
		this.write_int32( v ? ( v.getTime() / ( 24 * 60 * 60 * 1000 ) ) : __MSG_DATE_NULL_VALUE );
	}

	read_time(): Date | null {
		const v = this.read_num64();
		return v === __MSG_TIME_NULL_VALUE ? null : new Date( v );
	}

	write_time( v: Date ): void {
		this.write_num64( v ? v.getTime() : __MSG_TIME_NULL_VALUE );
	}

	read_binary(): DataView | null {
		const length = this.read_length();
		return this.read_bin( length );
	}

	write_binary( v: DataView ): void {
		const length = v != null ? v.byteLength : null;
		this.write_length( length );
		this.write_bin( v );
	}

	read_buffer(): ArrayBuffer | null {
		const length = this.read_length();
		return this.read_buf( length );
	}

	write_buffer( v: ArrayBuffer ): void {
		const length = v != null ? v.byteLength : null;
		this.write_length( length );
		this.write_buf( v );
	}

	read_string(): string | null {
		const length = this.read_length();
		return this.read_str( length );
	}

	write_string( v: string ): void {
		const length = v != null ? v.length : null;
		this.write_length( length );
		this.write_str( v );
	}

	read_array<T>( f: ( msg: Binary_Message ) => T ): T[] | null {
		const length = this.read_length();
		if ( length != null ) {
			const v = new Array<T>( length );
			for ( let i = 0; i < length; ++i ) {
				v[ i ] = f( this );
			}
			return v;
		}
		return null;
	}

	write_array<T>( a: T[], f: ( v: T, msg: Binary_Message ) => void ): void {
		const length = a != null ? a.length : null;
		this.write_length( length );
		if ( length != null ) {
			for ( let i = 0; i < length; ++ i ) {
				f( a[ i ], this );
			}
		}
	}

	read_set<K>( f: ( msg: Binary_Message ) => K ): Set<K> | null {
		const size = this.read_length();
		if ( size != null ) {
			const v = new Set<K>();
			for ( let i = 0; i < size; ++i ) {
				v.add( f( this ) );
			}
			return v;
		}
		return null;
	}

	write_set<K>( s: Set<K>, f: ( k: K, msg: Binary_Message ) => void ): void {
		const size = s != null ? s.size : null;
		this.write_length( size );
		if ( size != null ) {
			s.forEach( k => f( k, this ) );
		}
	}

	read_map<K, V>( f: ( msg: Binary_Message ) => [ K, V ] ): Map<K, V> | null {
		const size = this.read_length();
		if ( size != null ) {
			const v = new Map<K, V>();
			for ( let i = 0; i < size; ++i ) {
				const t = f( this );
				v.set( t[ 0 ], t[ 1 ] );
			}
			return v;
		}
		return null;
	}

	write_map<K, V>( m: Map< K, V>, f: ( v: [ K, V ], msg: Binary_Message ) => void ): void {
		const size = m != null ? m.size : null;
		this.write_length( size );
		if ( size != null ) {
			m.forEach( ( val, key ) => f( [ key, val ], this ) );
		}
	}

	clone(): Binary_Message {
		return new Binary_Message( this.data() );
	}

	clone_header(): Binary_Message {
		return new Binary_Message( this.header() );
	}

	header_string(): string {
		return `[${ this._write_offset }] <${ this.get_nat128_header().toString( 16 ) }>`;
	}

	toString(): string {
		const bytes = Array.from( new Uint8Array( this._data ) ).slice( 12, this._write_offset );
		return `${ this.header_string() } ${ bytes.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( ' ' ) }`;
	}

}
