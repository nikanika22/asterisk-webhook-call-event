const pool = require('../config/database');

class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
    }

    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            pool.query(sql, params, (error, results) => {
                if (error) {
                    console.error(`[DB Error - ${this.tableName}]`, error.message);
                    return reject(error);
                }
                resolve(results);
            });
        });
    }

    findAll(conditions = {}) {
        let sql = `SELECT * FROM ${this.tableName}`;
        let params = [];
        const keys = Object.keys(conditions);
        if (keys.length > 0) {
            const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            params = Object.values(conditions);
        }
        return this.query(sql, params);
    }

    findById(id) {
        const sql = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
        return this.query(sql, [id]).then(rows => rows[0]);
    }

    create(data) {
        const sql = `INSERT INTO ${this.tableName} SET ?`;
        return this.query(sql, [data]);
    }

    update(id, data) {
        const sql = `UPDATE ${this.tableName} SET ? WHERE id = ?`;
        return this.query(sql, [data, id]);
    }

    delete(id) {
        const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
        return this.query(sql, [id]);
    }
}

module.exports = BaseModel;
