module.exports = (sequelize, DataTypes) => {
    const Attendance = sequelize.define('Attendance', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        employee_code: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'employee_code'
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'date',
            defaultValue: DataTypes.NOW
        },
        punch_in: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'punch_in'
        },
        punch_out: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'punch_out'
        },
        punch_in_type: {
            type: DataTypes.ENUM('Office', 'Client', 'Remote'),
            allowNull: true,
            field: 'punch_in_type',
            defaultValue: 'Office'
        },
        punch_out_type: {
            type: DataTypes.ENUM('Manual', 'Auto'),
            allowNull: true,
            field: 'punch_out_type',
            defaultValue: 'Manual'
        },
        status: {
            type: DataTypes.ENUM('Present', 'Absent', 'Half Day', 'Short Leave', 'On Leave', 'Holiday'),
            allowNull: false,
            defaultValue: 'Absent',
            field: 'status'
        },
        latitude: DataTypes.DECIMAL(10, 8),
        longitude: DataTypes.DECIMAL(11, 8),
        punch_in_photo: DataTypes.TEXT,
        punch_out_photo: DataTypes.TEXT,
        punch_out_location: DataTypes.STRING(500),
        punch_out_latitude: DataTypes.DECIMAL(10, 8),
        punch_out_longitude: DataTypes.DECIMAL(11, 8),
        total_hours: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field: 'total_hours',
            defaultValue: 0
        },
        location: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'location'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'notes'
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        },
        device_info: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'device_info'
        }
    }, {
        tableName: 'attendances',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    

    // ✅ FIX: Associate function
    Attendance.associate = (models) => {
        Attendance.belongsTo(models.Employee, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'employee'
        });
    };

    return Attendance;
};