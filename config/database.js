const { Sequelize } = require('sequelize');
require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
}

const url = new URL(process.env.DATABASE_URL);

module.exports = new Sequelize(
    decodeURIComponent(url.pathname.slice(1)),
    decodeURIComponent(url.username),
    decodeURIComponent(url.password),
    {
        host: url.hostname,
        port: Number(url.port || 5432),
        dialect: 'postgres',
        dialectOptions: {
            ssl: { rejectUnauthorized: true },
            enableChannelBinding: url.searchParams.get('channel_binding') === 'require',
        },
        keepDefaultTimezone: true,
        logging: false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
    }
);
