(function () {
"use strict";
class ObradORRDatabase {
    constructor() {
        this.sqlite3 = null;
        this.db = null;
    }
    async init() {
        if (this.sqlite3)
            return this.sqlite3;
        this.sqlite3 = await sqlite3InitModule({
            print: (...args) => console.log(...args),
            printErr: (...args) => console.error(...args),
            locateFile: (file) => new URL('./wasm/' + file, window.location.href).href
        });
        return this.sqlite3;
    }
    async loadFromUrl(url) {
        await this.init();
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok)
            throw new Error(`No se pudo cargar ${url}: HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        return this.loadFromBytes(new Uint8Array(buffer));
    }
    loadFromBytes(bytes) {
        this.close();
        const pointer = this.sqlite3.wasm.allocFromTypedArray(bytes);
        this.db = new this.sqlite3.oo1.DB();
        const flags = this.sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | this.sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE;
        const rc = this.sqlite3.capi.sqlite3_deserialize(this.db.pointer, 'main', pointer, bytes.byteLength, bytes.byteLength, flags);
        this.db.checkRc(rc);
        this.exec('PRAGMA foreign_keys = ON;');
        return this.db;
    }
    query(sql, bind = {}) {
        this.assertLoaded();
        const rows = [];
        this.db.exec({ sql, bind, rowMode: 'object', callback: (row) => rows.push(row) });
        return rows;
    }
    value(sql, bind = {}) {
        const row = this.query(sql, bind)[0];
        return row ? Object.values(row)[0] : null;
    }
    exec(sql, bind = {}) {
        this.assertLoaded();
        this.db.exec({ sql, bind });
    }
    exportBytes() {
        this.assertLoaded();
        return new Uint8Array(this.sqlite3.capi.sqlite3_js_db_export(this.db.pointer));
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
    assertLoaded() {
        if (!this.db)
            throw new Error('La base de datos no está cargada.');
    }
}
window.ObradORRDatabase = ObradORRDatabase;

})();
