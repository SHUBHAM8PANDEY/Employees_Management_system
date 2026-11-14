module.exports = (sequelize, DataTypes) => {
    const EmployeeAddress = sequelize.define('EmployeeAddress', {
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
        address_line: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'address_line'
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'city'
        }
    }, {
        tableName: 'employee_addresses',
        timestamps: false
    });

    EmployeeAddress.associate = (models) => {
        EmployeeAddress.belongsTo(models.Employee, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'employee'
        });
    };

    return EmployeeAddress;
};