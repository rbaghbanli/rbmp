export const MESSAGE_DATA_START_LENGTH = 64;
export const MESSAGE_DATA_MAX_UINT64 = BigInt.asUintN( 64, -1n );
export const MESSAGE_DATA_MAX_UINT32 = -1 >>> 0;
export const MESSAGE_DATA_MS_IN_DAY = 24 * 60 * 60 * 1000;

export class Message_Data {

	protected _data: DataView;
	protected _write_offset: number;
	protected _read_offset: number;

	/**
		Constructs message data
		@param data DataView to assign, new ArrayBuffer is allocated and referenced if omitted
	*/
	constructor( data?: DataView ) {
		if ( data ) {
			this._data = data;
			this._write_offset = data.byteLength;
		}
		else {
			this._data = new DataView( new ArrayBuffer( MESSAGE_DATA_START_LENGTH ) );
			this._write_offset = 0;
		}
		this._read_offset = 0;
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
		Returns new copy of the buffer with specified offset
		@param offset number of bytes
	*/
	get_buffer( offset: number = 0 ): ArrayBuffer {
		return this._data.buffer.slice( this._data.byteOffset + offset, this._data.byteOffset + this._write_offset - offset );
	}

	/**
		Returns the new data with specified offset
		@param offset number of bytes
	*/
	get_data( offset: number = 0 ): DataView {
		return new DataView( this._data.buffer, this._data.byteOffset + offset, this._write_offset - offset );
	}

	/**
		Returns the unread data
	*/
	get_unread_data(): DataView {
		return this.get_data( this._read_offset );
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
		Message_Data.copy_data( data, this._data );
		this._data = data;
	}

	/**
		Trims capacity of the buffer to the exact size of message data
	*/
	trim_capacity(): void {
		const data = new DataView( new ArrayBuffer( this._write_offset ) );
		Message_Data.copy_data( data, this._data );
		this._data = data;
	}

	protected read<T>( increment: number, f: ( d: Message_Data ) => T ): T {
		const offset = this._read_offset + increment;
		if ( offset > this._data.byteLength ) {
			throw new RangeError( `buffer data size ${this._data.byteLength} exceeded by ${offset - this._data.byteLength}\n${ this.toString() }` );
		}
		const v = f( this );
		this._read_offset = offset;
		return v;
	}

	protected write<T>( increment: number, value: T, f: ( d: Message_Data, v: T ) => void ): void {
		const offset = this._write_offset + increment;
		if ( offset > this._data.byteLength ) {
			const deficit = offset - this._data.byteLength;
			this.add_capacity( deficit < this._data.byteLength ? this._data.byteLength : deficit );
		}
		f( this, value );
		this._write_offset = offset;
	}

	read_byte(): number {
		return this.read( 1, d => d._data.getUint8( d._read_offset ) );
	}

	write_byte( value: number ): void {
		this.write( 1, value, ( d, v ) => d._data.setUint8( d._write_offset, v ) );
	}

	read_uint16(): number {
		return this.read( 2, d => d._data.getUint16( d._read_offset ) );
	}

	write_uint16( value: number ): void {
		this.write( 2, value, ( d, v ) => d._data.setUint16( d._write_offset, v ) );
	}

	read_uint32(): number {
		return this.read( 4, d => d._data.getUint32( d._read_offset ) );
	}

	write_uint32( value: number ): void {
		this.write( 4, value, ( d, v ) => d._data.setUint32( d._write_offset, v ) );
	}

	read_uint64(): bigint {
		return this.read( 8, d => d._data.getBigUint64( d._read_offset ) );
	}

	write_uint64( value: bigint ): void {
		this.write( 8, value, ( d, v ) => d._data.setBigUint64( d._write_offset, v ) );
	}

	read_uint128(): bigint {
		return this.read( 16,
			d => ( ( d._data.getBigUint64( d._read_offset ) << 64n ) + d._data.getBigUint64( d._read_offset + 8 ) )
		);
	}

	write_uint128( value: bigint ): void {
		this.write( 16, value,
			( d, v ) => {
				d._data.setBigUint64( d._write_offset, v >> 64n );
				d._data.setBigUint64( d._write_offset + 8, v & MESSAGE_DATA_MAX_UINT64 );
			}
		);
	}

	read_int16(): number {
		return this.read( 2, d => d._data.getInt16( d._read_offset ) );
	}

	write_int16( value: number ): void {
		this.write( 2, value, ( d, v ) => d._data.setInt16( d._write_offset, v ) );
	}

	read_int32(): number {
		return this.read( 4, d => d._data.getInt32( d._read_offset ) );
	}

	write_int32( value: number ): void {
		this.write( 4, value, ( d, v ) => d._data.setInt32( d._write_offset, v ) );
	}

	read_int64(): bigint {
		return this.read( 8, d => d._data.getBigInt64( d._read_offset ) );
	}

	write_int64( value: bigint ): void {
		this.write( 8, value, ( d, v ) => d._data.setBigInt64( d._write_offset, v ) );
	}

	read_int128(): bigint {
		return this.read( 16,
			d => ( ( d._data.getBigInt64( d._read_offset ) << 64n ) + d._data.getBigUint64( d._read_offset + 8 ) )
		);
	}

	write_int128( value: bigint ): void {
		this.write( 16, value,
			( d, v ) => {
				d._data.setBigInt64( d._write_offset, v >> 64n );
				d._data.setBigUint64( d._write_offset + 8, v & MESSAGE_DATA_MAX_UINT64 );
			}
		);
	}

	read_float32(): number {
		return this.read( 4, d => d._data.getFloat32( d._read_offset ) );
	}

	write_float32( value: number ): void {
		this.write( 4, value, ( d, v ) => d._data.setFloat32( d._write_offset, v ) );
	}

	read_float64(): number {
		return this.read( 8, d => d._data.getFloat64( d._read_offset ) );
	}

	write_float64( value: number ): void {
		this.write( 8, value, ( d, v ) => d._data.setFloat64( d._write_offset, v ) );
	}

	/**
		Reads DataView of specified byte length
		@param length number of bytes to read
		@returns the DataView
	*/
	read_dat( length: number ): DataView {
		const len = Math.min( length || 0, MESSAGE_DATA_MAX_UINT32 );
		return this.read( len,
			d => new DataView( d._data.buffer, d._data.byteOffset + d._read_offset, len )
		);
	}

	/**
		Writes DataView without byte length prefix
	*/
	write_dat( value: DataView ): void {
		this.write( value.byteLength, value,
			( d, v ) => Message_Data.copy_data( new DataView( d._data.buffer, d._data.byteOffset + d._write_offset, v.byteLength ), v )
		);
	}

	/**
		Reads ArrayBuffer of specified byte length
		@param length number of bytes to read
		@returns the ArrayBuffer
	*/
	read_buf( length: number ): ArrayBuffer {
		const len = Math.min( length || 0, MESSAGE_DATA_MAX_UINT32 );
		return this.read( len,
			d => d._data.buffer.slice( d._data.byteOffset + d._read_offset, d._data.byteOffset + d._read_offset + len )
		);
	}

	/**
		Writes ArrayBufferLike without byte length prefix
	*/
	write_buf( value: ArrayBufferLike ): void {
		this.write( value.byteLength, value,
			( d, v ) => Message_Data.copy_data( new DataView( d._data.buffer, d._data.byteOffset + d._write_offset, v.byteLength ), new DataView( v ) )
		);
	}

	/**
		Reads string of specified byte length
		@param length number of bytes to read
		@returns the string
	*/
	read_str( length: number ): string {
		const len = Math.min( length || 0, MESSAGE_DATA_MAX_UINT32 );
		return new TextDecoder().decode( this.read_dat( len ) );
	}

	/**
		Writes string without byte length prefix
	*/
	write_str( value: string ): void {
		const len = Math.min( value.length || 0, MESSAGE_DATA_MAX_UINT32 );
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
		return new Date( this.read_int32() * MESSAGE_DATA_MS_IN_DAY );
	}

	write_date( value: Date ): void {
		this.write_int32( value.getTime() / MESSAGE_DATA_MS_IN_DAY );
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
		this.write_length( Math.min( value.byteLength, MESSAGE_DATA_MAX_UINT32 ) );
		this.write_dat( value );
	}

	read_buffer(): ArrayBuffer {
		return this.read_buf( this.read_length() );
	}

	write_buffer( value: ArrayBuffer ): void {
		this.write_length( Math.min( value.byteLength, MESSAGE_DATA_MAX_UINT32 ) );
		this.write_buf( value );
	}

	read_string(): string {
		return new TextDecoder().decode( this.read_data() );
	}

	write_string( value: string ): void {
		this.write_buffer( new TextEncoder().encode( value ).buffer );
	}

	read_nullable<T>( reader: ( d: Message_Data ) => T ): T | null {
		return this.read_bool() ? reader( this ) : null;
	}

	write_nullable<T>( value: T | null | undefined, writer: ( d: Message_Data, v: T ) => void ): void {
		if ( value != null ) {
			this.write_bool( true );
			writer( this, value );
		}
		else {
			this.write_bool( false );
		}
	}

	read_array<T>( reader: ( d: Message_Data ) => T ): T[] {
		const length = this.read_length();
		const value = new Array<T>( length );
		for ( let i = 0; i < length; ++i ) {
			value[ i ] = reader( this );
		}
		return value;
	}

	write_array<T>( value: T[], writer: ( d: Message_Data, v: T ) => void ): void {
		const length = Math.min( value.length, MESSAGE_DATA_MAX_UINT32 );
		this.write_length( length );
		for ( let i = 0; i < length; ++i ) {
			writer( this, value[ i ] );
		}
	}

	read_set<K>( reader: ( d: Message_Data ) => K ): Set<K> {
		const size = this.read_length();
		const value = new Set<K>();
		for ( let i = 0; i < size; ++i ) {
			const t = reader( this );
			value.add( t );
		}
		return value;
	}

	write_set<K>( value: Set<K>, writer: ( d: Message_Data, k: K ) => void ): void {
		let size = Math.min( value.size, MESSAGE_DATA_MAX_UINT32 );
		this.write_length( size );
		for ( const [ k ] of value.entries() ) {
			if ( --size < 0 ) {
				return;
			}
			writer( this, k );
		}
	}

	read_map<K, V>( reader: ( d: Message_Data ) => [ K, V ] ): Map<K, V> {
		const size = this.read_length();
		const value = new Map<K, V>();
		for ( let i = 0; i < size; ++i ) {
			const [ k, v ] = reader( this );
			value.set( k, v );
		}
		return value;
	}

	write_map<K, V>( value: Map< K, V>, writer: ( d: Message_Data, v: [ K, V ] ) => void ): void {
		let size = Math.min( value.size, MESSAGE_DATA_MAX_UINT32 );
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
		return `${ bytes.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( ' ' ) }`;
	}

	/**
		Creates new instance of message data from the buffer
		@param buffer ArrayBufferLike to create data from
	*/
	static of_buffer( buffer: ArrayBufferLike ): Message_Data {
		return new Message_Data( new DataView( buffer ) );
	}

	/**
		Creates new instance of message data and writes the string
		@param value string to write
	*/
	static on_string( value: string ): Message_Data {
		const msg = new Message_Data();
		msg.write_string( value );
		return msg;
	}

	/**
		Copies data from source data view to destination data view
		@param dst the DataView to copy to
		@param src the DataView to copy from
	*/
	static copy_data( dst: DataView, src: DataView ): void {
		const length = Math.min( dst.byteLength, src.byteLength, MESSAGE_DATA_MAX_UINT32 );
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
		@param dst the DataView to equate
		@param src the DataView to equate
	*/
	static equate_data( dst: DataView | null | undefined, src: DataView | null | undefined ): boolean {
		if ( dst == null && src == null ) {
			return true;
		}
		if ( dst == null || src == null ) {
			return false;
		}
		if ( dst.byteLength !== src.byteLength ) {
			return false;
		}
		const length = Math.min( dst.byteLength, src.byteLength, MESSAGE_DATA_MAX_UINT32 );
		for ( let lfi = length - 3, i = 0; i < length; ) {
			if ( i < lfi ) {
				if ( dst.getUint32( i ) !== src.getUint32( i ) ) {
					return false;
				}
				i += 4;
			}
			else {
				if ( dst.getUint8( i ) !== src.getUint8( i ) ) {
					return false;
				}
				++i;
			}
		}
		return true;
	}

}
