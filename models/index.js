const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);

const sequelize = require('../config/database');

const db = {};

// Read all model files
fs.readdirSync(__dirname)
    .filter(file => {
        return (
            file.indexOf('.') !== 0 &&
            file !== basename &&
            file.slice(-3) === '.js' &&
            file.indexOf('.test.js') === -1
        );
    })
    .forEach(file => {
        try {
            const modelDef = require(path.join(__dirname, file));
            if (typeof modelDef === 'function') {
                const model = modelDef(sequelize, Sequelize.DataTypes);
                db[model.name] = model;
            } else {
                db[modelDef.name] = modelDef;
            }
        } catch (err) {
            console.error(`❌ Error loading model ${file}:`, err.message);
        }
    });

// Run associations
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log('✅ Models loaded:', Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize'));

module.exports = db;