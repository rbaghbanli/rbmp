const __MSG_MAX_NAT32_VALUE = Math.pow( 2, 32 ) - 1;
const __MSG_MS_PER_DAY = 24 * 60 * 60 * 1000;

export class Binary_Message {

	protected _topic: string;
	protected _data: ArrayBuffer;
	protected _view: DataView;
	protected _write_offset: number;
	protected _read_offset: number;

	constructor( topic?: string, data?: ArrayBufferLike ) {
		this._topic = topic ? ( topic.length > __MSG_MAX_NAT32_VALUE ? topic.slice( 0, __MSG_MAX_NAT32_VALUE ) : topic ) : '';
		this._data = data ?? new ArrayBuffer( 0 );
		this._view = new DataView( this._data );
		this._read_offset = 0;
		this._write_offset = this._data.byteLength;
	}

	static copy_binary( dst: DataView, src: DataView ): void {
		const length = Math.min( dst.byteLength, src.byteLength, __MSG_MAX_NAT32_VALUE );
		for ( let lfi = length - 3, i = 0; i < length; ) {
			if ( i < lfi ) {
				dst.setUint32( i, src.getUint32( i ) );
				i += 4;
			}
			else {
				dst.setUint8( i, src.getUint8( i ) );
				++i;
			}
		}
	}

	static from_buffer( buffer: ArrayBufferLike ): Binary_Message {
		const view = new DataView( buffer );
		const topic_length = view.getUint32( 0 );
		let topic = '';
		let i = 4;
		for ( let c = 0; c < topic_length && i < buffer.byteLength; ++c, i += 2 ) {
			topic += String.fromCharCode( view.getUint16( i ) );
		}
		const data = new ArrayBuffer( buffer.byteLength - i );
		Binary_Message.copy_binary( new DataView( data ), new DataView( buffer, i ) );
		return new Binary_Message( topic, data );
	}

	to_buffer(): ArrayBuffer {
		const data = new ArrayBuffer( 4 + ( this._topic.length << 1 ) + this._write_offset );
		const view = new DataView( data );
		view.setUint32( 0, this._topic.length );
		let i = 4;
		for ( let c = 0; c < this._topic.length; ++c, i += 2 ) {
			view.setUint16( i, this._topic.charCodeAt( c ) );
		}
		Binary_Message.copy_binary( new DataView( data, i ), this._view );
		return data;
	}

	get topic(): string {
		return this._topic;
	}

	get data(): ArrayBuffer {
		return this._data;
	}

	get length(): number {
		return this._write_offset;
	}

	get at_end(): boolean {
		return this._read_offset === this._write_offset;
	}

	get is_blank(): boolean {
		return this._topic.length === 0 && this._write_offset === 0;
	}

	reset_read(): void {
		this._read_offset = 0;
	}

	add_capacity( increment: number ): void {
		const data = new ArrayBuffer( this._data.byteLength + ( increment > this._data.byteLength ? increment : this._data.byteLength ) );
		const view = new DataView( data );
		Binary_Message.copy_binary( view, this._view );
		this._data = data;
		this._view = view;
	}

	trim_capacity(): void {
		const data = new ArrayBuffer( this._write_offset );
		const view = new DataView( data );
		Binary_Message.copy_binary( view, this._view );
		this._data = data;
		this._view = view;
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
		this.write( 1, () => this._view.setUint8( this._write_offset, v ) );
	}

	read_int16(): number {
		return this.read( 2, () => this._view.getInt16( this._read_offset ) );
	}

	write_int16( v: number ): void {
		this.write( 2, () => this._view.setInt16( this._write_offset, v ) );
	}

	read_int32(): number {
		return this.read( 4, () => this._view.getInt32( this._read_offset ) );
	}

	write_int32( v: number ): void {
		this.write( 4, () => this._view.setInt32( this._write_offset, v ) );
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
		this.write( 2, () => this._view.setUint16( this._write_offset, v ) );
	}

	read_nat32(): number {
		return this.read( 4, () => this._view.getUint32( this._read_offset ) );
	}

	write_nat32( v: number ): void {
		this.write( 4, () => this._view.setUint32( this._write_offset, v ) );
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
		this.write( 4, () => this._view.setFloat32( this._write_offset, v ) );
	}

	read_num64(): number {
		return this.read( 8, () => this._view.getFloat64( this._read_offset ) );
	}

	write_num64( v: number ): void {
		this.write( 8, () => this._view.setFloat64( this._write_offset, v ) );
	}

	read_bin( length: number ): DataView {
		const len = Math.min( length || 0, __MSG_MAX_NAT32_VALUE );
		return this.read( len, () => new DataView( this._data, this._read_offset, this._read_offset + len ) );
	}

	write_bin( v: DataView ): void {
		this.write( v.byteLength, () => Binary_Message.copy_binary( new DataView( this._data, this._write_offset ), v ) );
	}

	read_buf( length: number ): ArrayBuffer {
		const len = Math.min( length || 0, __MSG_MAX_NAT32_VALUE );
		return this.read( len, () => this._data.slice( this._read_offset, this._read_offset + len ) );
	}

	write_buf( v: ArrayBufferLike ): void {
		this.write( v.byteLength, () => Binary_Message.copy_binary( new DataView( this._data, this._write_offset ), new DataView( v ) ) );
	}

	read_str( length: number ): string {
		const len = Math.min( length || 0, __MSG_MAX_NAT32_VALUE );
		return this.read( len << 1,
			() => {
				let v = '';
				for ( let c = 0, i = this._read_offset; c < len; ++c, i += 2 ) {
					v += String.fromCharCode( this._view.getUint16( i ) );
				}
				return v;
			}
		);
	}

	write_str( v: string ): void {
		const len = Math.min( v.length || 0, __MSG_MAX_NAT32_VALUE );
		this.write( len << 1,
			() => {
				for ( let c = 0, i = this._write_offset; c < len; ++c, i += 2 ) {
					this._view.setUint16( i, v.charCodeAt( c ) );
				}
			}
		);
	}

	read_bool(): boolean {
		return this.read_byte() !== 0;
	}

	write_bool( v: boolean ): void {
		this.write_byte( v ? 0xff : 0 );
	}

	read_length(): number {
		return this.read_nat32();
	}

	write_length( v: number ): void {
		this.write_nat32( v );
	}

	read_date(): Date {
		return new Date( this.read_int32() * __MSG_MS_PER_DAY );
	}

	write_date( v: Date ): void {
		this.write_int32( v.getTime() / __MSG_MS_PER_DAY );
	}

	read_time(): Date {
		return new Date( this.read_num64() );
	}

	write_time( v: Date ): void {
		this.write_num64( v.getTime() );
	}

	read_binary(): DataView {
		return this.read_bin( this.read_length() );
	}

	write_binary( v: DataView ): void {
		this.write_length( Math.min( v.byteLength, __MSG_MAX_NAT32_VALUE ) );
		this.write_bin( v );
	}

	read_buffer(): ArrayBuffer {
		return this.read_buf( this.read_length() );
	}

	write_buffer( v: ArrayBuffer ): void {
		this.write_length( Math.min( v.byteLength, __MSG_MAX_NAT32_VALUE ) );
		this.write_buf( v );
	}

	read_string(): string {
		return this.read_str( this.read_length() );
	}

	write_string( v: string ): void {
		this.write_length( Math.min( v.length, __MSG_MAX_NAT32_VALUE ) );
		this.write_str( v );
	}

	read_nullable<T>( f: ( msg: Binary_Message ) => T ): T | null {
		return this.read_bool() ? f( this ) : null;
	}

	write_nullable<T>( n: T | null | undefined, f: ( v: T, msg: Binary_Message ) => void ): void {
		if ( n != null ) {
			this.write_bool( true );
			f( n, this );
		}
		else {
			this.write_bool( false );
		}
	}

	read_array<T>( f: ( msg: Binary_Message ) => T ): T[] {
		const length = this.read_length();
		const v = new Array<T>( length );
		for ( let i = 0; i < length; ++i ) {
			v[ i ] = f( this );
		}
		return v;
	}

	write_array<T>( a: T[], f: ( v: T, msg: Binary_Message ) => void ): void {
		const length = Math.min( a.length, __MSG_MAX_NAT32_VALUE );
		this.write_length( length );
		for ( let i = 0; i < length; ++i ) {
			f( a[ i ], this );
		}
	}

	read_set<K>( f: ( msg: Binary_Message ) => K ): Set<K> {
		const size = this.read_length();
		const v = new Set<K>();
		for ( let i = 0; i < size; ++i ) {
			const t = f( this );
			v.add( t );
		}
		return v;
	}

	write_set<K>( s: Set<K>, f: ( k: K, msg: Binary_Message ) => void ): void {
		let size = Math.min( s.size, __MSG_MAX_NAT32_VALUE );
		this.write_length( size );
		for ( const [ k ] of s.entries() ) {
			if ( --size < 0 ) {
				return;
			}
			f( k, this );
		}
	}

	read_map<K, V>( f: ( msg: Binary_Message ) => [ K, V ] ): Map<K, V> {
		const size = this.read_length();
		const v = new Map<K, V>();
		for ( let i = 0; i < size; ++i ) {
			const t = f( this );
			v.set( t[ 0 ], t[ 1 ] );
		}
		return v;
	}

	write_map<K, V>( m: Map< K, V>, f: ( v: [ K, V ], msg: Binary_Message ) => void ): void {
		let size = Math.min( m.size, __MSG_MAX_NAT32_VALUE );
		this.write_length( size );
		for ( const [ k, v ] of m ) {
			if ( --size < 0 ) {
				return;
			}
			f( [ k, v ], this );
		}
	}

	clone(): Binary_Message {
		return new Binary_Message( this._topic, this._data.slice( 0, this._write_offset ) );
	}

	toString(): string {
		const bytes = Array.from( new Uint8Array( this._data ) ).slice( 0, this._write_offset );
		return `[${ this.topic }] ${ bytes.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( ' ' ) }`;
	}

}
