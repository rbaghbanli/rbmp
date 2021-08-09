const _MSG_HEADER_SIZE = 12;
const _MSG_DEFAULT_SIZE = 20;
const _MSG_MIN_INT32 = -0x80000000;
const _MSG_MIN_INT54 = -0x20000000000000;
/*
	const _MSG_TIME_MS_EPOCH = -2208988800000;	// 1900-01-01 00:00:00
*/

export default class Binary_Message {

	constructor( data?: ArrayBuffer ) {
		if ( !data || data.byteLength < _MSG_HEADER_SIZE ) {
			this._data =  new ArrayBuffer( _MSG_HEADER_SIZE + _MSG_DEFAULT_SIZE );
			this._write_offset = _MSG_HEADER_SIZE;
		}
		else {
			this._data = data;
			this._write_offset = data.byteLength;
		}
		this._read_offset = _MSG_HEADER_SIZE;
		this._view = new DataView( this._data );
	}
	protected _data: ArrayBuffer;
	protected _read_offset: number;
	protected _write_offset: number;
	private _view: DataView;

	read_data(): ArrayBuffer {
		return this._data.slice( 0, this._write_offset );
	}

	read_header(): ArrayBuffer {
		return this._data.slice( 0, _MSG_HEADER_SIZE );
	}

	read_content(): ArrayBuffer {
		return this._data.slice( _MSG_HEADER_SIZE, this._write_offset );
	}

	get length(): number {
		return this._write_offset;
	}

	get is_empty(): boolean {
		return this._read_offset === this._write_offset;
	}

	reset_read(): Binary_Message {
		this._read_offset = _MSG_HEADER_SIZE;
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

	get topic(): number {
		return this._view.getInt32( 0 );
	}

	set topic( v: number ) {
		this._view.setInt32( 0, v || 0 );
	}

	get reference(): number {
		return this._view.getFloat64( 4 );
	}

	set reference( v: number ) {
		this._view.setFloat64( 4, v || 0 );
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
			this.add_capacity( offset - this._data.byteLength );
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
/*
	read_int64(): bigint {
		return this.get( 8, () => this._view.getBigInt64( this._read_offset ) );
	}

	write_int64( v: bigint ): void {
		this.set( 8, () => this._view.setBigInt64( this._write_offset, v ) );
	}
*/
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
/*
	read_nat64(): bigint {
		return this.get( 8, () => this._view.getBigUint64( this._read_offset ) );
	}

	write_nat64( v: bigint ): void {
		this.set( 8, () => this._view.setBigUint64( this._write_offset, v ) );
	}
*/
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
		this.write_num64( v == null || v < 0 ? _MSG_MIN_INT54 : v );
	}

	read_date(): Date | null {
		const v = this.read_int32();
		return v === _MSG_MIN_INT32 ? null : new Date( v * ( 24 * 60 * 60 * 1000 ) );
	}

	write_date( v: Date ): void {
		this.write_int32( v ? ( v.getTime() / ( 24 * 60 * 60 * 1000 ) ) : _MSG_MIN_INT32 );
	}

	read_time(): Date | null {
		const v = this.read_num64();
		return v === _MSG_MIN_INT54 ? null : new Date( v );
	}

	write_time( v: Date ): void {
		this.write_num64( v ? v.getTime() : _MSG_MIN_INT54 );
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

	toString(): string {
		const bytes = Array.from( new Uint8Array( this._data ) ).slice( 12, this._write_offset );
		return `[${ this._write_offset }] <${ this.topic }: ${ this.reference }> ${ bytes.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( ' ' ) }`;
	}

	clone_header(): Binary_Message {
		const msg = new Binary_Message();
		msg.topic = this.topic;
		msg.reference = this.reference;
		return msg;
	}

	static from_header( topic: number = 0, ref: number = Binary_Message.random_nat53 ): Binary_Message {
		const msg = new Binary_Message();
		msg.topic = topic;
		msg.reference = ref;
		return msg;
	}

	static from_content( content: ArrayBuffer | SharedArrayBuffer ): Binary_Message {
		const msg = new Binary_Message();
		msg.write_buf( content );
		return msg;
	}

	protected static get random_nat53(): number {
		return Math.round( ( ( ( new Date() ).getTime() % 1000000 ) / 1000000 ) * Math.random() * 9007199254740991 );
	}

}
