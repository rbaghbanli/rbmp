export const BINARY_MESSAGE_START_LENGTH = 64;
export const BINARY_MESSAGE_MAX_UINT64 = BigInt.asUintN( 64, -1n );
export const BINARY_MESSAGE_MAX_UINT32 = -1 >>> 0;
export const BINARY_MESSAGE_MS_IN_DAY = 24 * 60 * 60 * 1000;

export class Binary_Message {

	protected _data: DataView;
	protected _write_offset: number;
	protected _read_offset: number;
	protected _topic: string;

	/**
		Constructs message
		@param data string, Binary_Message, DataView, or ArrayBufferLike to initiate message data
	*/
	constructor( data: string | Binary_Message | DataView | ArrayBufferLike ) {
		if ( typeof data === 'string' ) {
			this._data = new DataView( new ArrayBuffer( BINARY_MESSAGE_START_LENGTH + data.length ) );
			this._write_offset = 0;
			this.write_string( data );
			this._read_offset = this._write_offset;
			this._topic = data;
		}
		else if ( data instanceof Binary_Message ) {
			this._data = data._data;
			this._write_offset = data._write_offset;
			this._read_offset = data._read_offset;
			this._topic = data._topic;
		}
		else if ( data instanceof DataView ) {
			this._data = data;
			this._write_offset = this._data.byteLength;
			this._read_offset = 0;
			this._topic = this.read_string();
		}
		else {
			this._data = new DataView( data );
			this._write_offset = this._data.byteLength;
			this._read_offset = 0;
			this._topic = this.read_string();
		}
	}

	/**
		Message topic
	*/
	get topic(): string {
		return this._topic;
	}

	/**
		Message data length
	*/
	get byte_length(): number {
		return this._write_offset;
	}

	/**
		Message data capacity
	*/
	get byte_capacity(): number {
		return this._data.byteLength;
	}

	/**
		True if reading reached the end of the message data, false otherwise
	*/
	get at_end(): boolean {
		return this._read_offset === this._write_offset;
	}

	/**
		True if message data is empty, false otherwise
	*/
	get is_empty(): boolean {
		return this._write_offset === 0;
	}

	/**
		Returns the new data with specified offset
		@param offset number of bytes
		@returns DataView
	*/
	get_data( offset: number = 0 ): DataView {
		return new DataView( this._data.buffer, this._data.byteOffset + offset, this._write_offset - offset );
	}

	/**
		Returns the unread data
		@returns DataView
	*/
	get_unread_data(): DataView {
		return this.get_data( this._read_offset );
	}

	/**
		Returns new copy of the buffer with specified offset
		@param offset number of bytes
		@returns ArrayBuffer
	*/
	get_buffer( offset: number = 0 ): ArrayBuffer {
		return this._data.buffer.slice( this._data.byteOffset + offset, this._data.byteOffset + this._write_offset - offset );
	}

	/**
		Returns the unread buffer
		@returns ArrayBuffer
	*/
	get_unread_buffer(): ArrayBuffer {
		return this.get_buffer( this._read_offset );
	}

	/**
		Resets read position to the beginning of the message data
	*/
	reset_read(): void {
		this._read_offset = 0;
	}

	/**
		Adds capacity to the buffer of message data
		@param increment the value to increase buffer size by
	*/
	add_capacity( increment: number ): void {
		const data = new DataView( new ArrayBuffer( this._data.buffer.byteLength + increment ) );
		Binary_Message.copy_data( data, this._data );
		this._data = data;
	}

	/**
		Trims capacity of the buffer to the exact size of message data
	*/
	trim_capacity(): void {
		const data = new DataView( new ArrayBuffer( this._write_offset ) );
		Binary_Message.copy_data( data, this._data );
		this._data = data;
	}

	protected read<T>( increment: number, f: ( m: Binary_Message ) => T ): T {
		const offset = this._read_offset + increment;
		if ( offset > this._write_offset ) {
			throw new RangeError( `buffer data size ${ this._data.byteLength } exceeded by ${ offset - this._data.byteLength }\n${ this.toString() }` );
		}
		const v = f( this );
		this._read_offset = offset;
		return v;
	}

	protected write<T>( increment: number, value: T, f: ( m: Binary_Message, v: T ) => void ): void {
		const offset = this._write_offset + increment;
		if ( offset > this._data.byteLength ) {
			const deficit = offset - this._data.byteLength;
			this.add_capacity( deficit < this._data.byteLength ? this._data.byteLength : deficit );
		}
		f( this, value );
		this._write_offset = offset;
	}

	read_byte(): number {
		return this.read( 1, m => m._data.getUint8( m._read_offset ) );
	}

	write_byte( value: number ): void {
		this.write( 1, value, ( m, v ) => m._data.setUint8( m._write_offset, v ) );
	}

	read_uint16(): number {
		return this.read( 2, m => m._data.getUint16( m._read_offset ) );
	}

	write_uint16( value: number ): void {
		this.write( 2, value, ( m, v ) => m._data.setUint16( m._write_offset, v ) );
	}

	read_uint32(): number {
		return this.read( 4, m => m._data.getUint32( m._read_offset ) );
	}

	write_uint32( value: number ): void {
		this.write( 4, value, ( m, v ) => m._data.setUint32( m._write_offset, v ) );
	}

	read_uint64(): bigint {
		return this.read( 8, m => m._data.getBigUint64( m._read_offset ) );
	}

	write_uint64( value: bigint ): void {
		this.write( 8, value, ( m, v ) => m._data.setBigUint64( m._write_offset, v ) );
	}

	read_uint128(): bigint {
		return this.read( 16,
			m => ( ( m._data.getBigUint64( m._read_offset ) << 64n ) + m._data.getBigUint64( m._read_offset + 8 ) )
		);
	}

	write_uint128( value: bigint ): void {
		this.write( 16, value,
			( m, v ) => {
				m._data.setBigUint64( m._write_offset, v >> 64n );
				m._data.setBigUint64( m._write_offset + 8, v & BINARY_MESSAGE_MAX_UINT64 );
			}
		);
	}

	read_int16(): number {
		return this.read( 2, m => m._data.getInt16( m._read_offset ) );
	}

	write_int16( value: number ): void {
		this.write( 2, value, ( m, v ) => m._data.setInt16( m._write_offset, v ) );
	}

	read_int32(): number {
		return this.read( 4, m => m._data.getInt32( m._read_offset ) );
	}

	write_int32( value: number ): void {
		this.write( 4, value, ( m, v ) => m._data.setInt32( m._write_offset, v ) );
	}

	read_int64(): bigint {
		return this.read( 8, m => m._data.getBigInt64( m._read_offset ) );
	}

	write_int64( value: bigint ): void {
		this.write( 8, value, ( m, v ) => m._data.setBigInt64( m._write_offset, v ) );
	}

	read_int128(): bigint {
		return this.read( 16,
			m => ( ( m._data.getBigInt64( m._read_offset ) << 64n ) + m._data.getBigUint64( m._read_offset + 8 ) )
		);
	}

	write_int128( value: bigint ): void {
		this.write( 16, value,
			( m, v ) => {
				m._data.setBigInt64( m._write_offset, v >> 64n );
				m._data.setBigUint64( m._write_offset + 8, v & BINARY_MESSAGE_MAX_UINT64 );
			}
		);
	}

	read_flop32(): number {
		return this.read( 4, m => m._data.getFloat32( m._read_offset ) );
	}

	write_flop32( value: number ): void {
		this.write( 4, value, ( m, v ) => m._data.setFloat32( m._write_offset, v ) );
	}

	read_flop64(): number {
		return this.read( 8, m => m._data.getFloat64( m._read_offset ) );
	}

	write_flop64( value: number ): void {
		this.write( 8, value, ( m, v ) => m._data.setFloat64( m._write_offset, v ) );
	}

	/**
		Reads DataView of specified byte length
		@param length number of bytes to read
		@returns DataView
	*/
	read_dat( length: number ): DataView {
		const len = Math.min( length || 0, BINARY_MESSAGE_MAX_UINT32 );
		return this.read( len,
			m => new DataView( m._data.buffer, m._data.byteOffset + m._read_offset, len )
		);
	}

	/**
		Writes DataView without byte length prefix
		@param value DataView to write
	*/
	write_dat( value: DataView ): void {
		this.write( value.byteLength, value,
			( m, v ) => Binary_Message.copy_data( new DataView( m._data.buffer, m._data.byteOffset + m._write_offset, v.byteLength ), v )
		);
	}

	/**
		Reads ArrayBuffer of specified byte length
		@param length number of bytes to read
		@returns ArrayBuffer
	*/
	read_buf( length: number ): ArrayBuffer {
		const len = Math.min( length || 0, BINARY_MESSAGE_MAX_UINT32 );
		return this.read( len,
			m => m._data.buffer.slice( m._data.byteOffset + m._read_offset, m._data.byteOffset + m._read_offset + len )
		);
	}

	/**
		Writes ArrayBufferLike without byte length prefix
		@param value ArrayBufferLike to write
	*/
	write_buf( value: ArrayBufferLike ): void {
		this.write( value.byteLength, value,
			( m, v ) => Binary_Message.copy_data( new DataView( m._data.buffer, m._data.byteOffset + m._write_offset, v.byteLength ), new DataView( v ) )
		);
	}

	/**
		Reads string of specified byte length
		@param length number of bytes to read
		@returns string
	*/
	read_str( length: number ): string {
		const len = Math.min( length || 0, BINARY_MESSAGE_MAX_UINT32 );
		return new TextDecoder().decode( this.read_dat( len ) );
	}

	/**
		Writes string without byte length prefix
		@param value string to write
	*/
	write_str( value: string ): void {
		const len = Math.min( value.length || 0, BINARY_MESSAGE_MAX_UINT32 );
		this.write_buf( new TextEncoder().encode( value ).buffer.slice( 0, len ) );
	}

	read_bool(): boolean {
		return this.read_byte() !== 0;
	}

	write_bool( value: boolean ): void {
		this.write_byte( value ? 0xff : 0 );
	}

	read_length(): number {
		return this.read_uint32();
	}

	write_length( value: number ): void {
		this.write_uint32( value );
	}

	read_date(): Date {
		return new Date( this.read_int32() * BINARY_MESSAGE_MS_IN_DAY );
	}

	write_date( value: Date ): void {
		this.write_int32( value.getTime() / BINARY_MESSAGE_MS_IN_DAY );
	}

	read_time(): Date {
		return new Date( Number( this.read_int64() ) );
	}

	write_time( value: Date ): void {
		this.write_int64( BigInt( value.getTime() ) );
	}

	read_data(): DataView {
		return this.read_dat( this.read_length() );
	}

	write_data( value: DataView ): void {
		this.write_length( Math.min( value.byteLength, BINARY_MESSAGE_MAX_UINT32 ) );
		this.write_dat( value );
	}

	read_buffer(): ArrayBuffer {
		return this.read_buf( this.read_length() );
	}

	write_buffer( value: ArrayBuffer ): void {
		this.write_length( Math.min( value.byteLength, BINARY_MESSAGE_MAX_UINT32 ) );
		this.write_buf( value );
	}

	read_string(): string {
		return new TextDecoder().decode( this.read_data() );
	}

	write_string( value: string ): void {
		this.write_buffer( new TextEncoder().encode( value ).buffer );
	}

	read_nullable<T>( reader: ( m: Binary_Message ) => T ): T | null {
		return this.read_bool() ? reader( this ) : null;
	}

	write_nullable<T>( value: T | null | undefined, writer: ( m: Binary_Message, v: T ) => void ): void {
		if ( value != null ) {
			this.write_bool( true );
			writer( this, value );
		}
		else {
			this.write_bool( false );
		}
	}

	read_array<T>( reader: ( m: Binary_Message ) => T ): T[] {
		const length = this.read_length();
		const value = new Array<T>( length );
		for ( let i = 0; i < length; ++i ) {
			value[ i ] = reader( this );
		}
		return value;
	}

	write_array<T>( value: T[], writer: ( m: Binary_Message, v: T ) => void ): void {
		const length = Math.min( value.length, BINARY_MESSAGE_MAX_UINT32 );
		this.write_length( length );
		for ( let i = 0; i < length; ++i ) {
			writer( this, value[ i ] );
		}
	}

	read_set<K>( reader: ( m: Binary_Message ) => K ): Set<K> {
		const size = this.read_length();
		const value = new Set<K>();
		for ( let i = 0; i < size; ++i ) {
			const t = reader( this );
			value.add( t );
		}
		return value;
	}

	write_set<K>( value: Set<K>, writer: ( m: Binary_Message, k: K ) => void ): void {
		let size = Math.min( value.size, BINARY_MESSAGE_MAX_UINT32 );
		this.write_length( size );
		for ( const [ k ] of value.entries() ) {
			if ( --size < 0 ) {
				return;
			}
			writer( this, k );
		}
	}

	read_map<K, V>( reader: ( m: Binary_Message ) => [ K, V ] ): Map<K, V> {
		const size = this.read_length();
		const value = new Map<K, V>();
		for ( let i = 0; i < size; ++i ) {
			const [ k, v ] = reader( this );
			value.set( k, v );
		}
		return value;
	}

	write_map<K, V>( value: Map< K, V>, writer: ( m: Binary_Message, v: [ K, V ] ) => void ): void {
		let size = Math.min( value.size, BINARY_MESSAGE_MAX_UINT32 );
		this.write_length( size );
		for ( const [ k, v ] of value ) {
			if ( --size < 0 ) {
				return;
			}
			writer( this, [ k, v ] );
		}
	}

	toString(): string {
		const bytes = Array.from( new Uint8Array( this._data.buffer.slice( this._data.byteOffset, this._data.byteOffset + this._write_offset ) ) );
		return `[${ this._topic }] ${ bytes.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( ' ' ) }`;
	}

	/**
		Copies data from source data view to destination data view
		@param dst the DataView to copy to
		@param src the DataView to copy from
	*/
	static copy_data( dst: DataView, src: DataView ): void {
		const length = Math.min( dst.byteLength, src.byteLength, BINARY_MESSAGE_MAX_UINT32 );
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

	/**
		Equates data from source data view to destination data view
		@param data1 DataView to equate
		@param data2 DataView to equate
		@returns true if data is equal
	*/
	static equate_data( data1: DataView | null | undefined, data2: DataView | null | undefined ): boolean {
		if ( data1 == null && data2 == null ) {
			return true;
		}
		if ( data1 == null || data2 == null ) {
			return false;
		}
		if ( data1.byteLength !== data2.byteLength ) {
			return false;
		}
		const length = Math.min( data1.byteLength, data2.byteLength, BINARY_MESSAGE_MAX_UINT32 );
		for ( let lfi = length - 3, i = 0; i < length; ) {
			if ( i < lfi ) {
				if ( data1.getUint32( i ) !== data2.getUint32( i ) ) {
					return false;
				}
				i += 4;
			}
			else {
				if ( data1.getUint8( i ) !== data2.getUint8( i ) ) {
					return false;
				}
				++i;
			}
		}
		return true;
	}

}
