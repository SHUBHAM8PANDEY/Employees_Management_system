module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        employee_code: {
            type: DataTypes.STRING(100),
            primaryKey: true,
            allowNull: false,
            unique: true,
            field: 'employee_code'
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            field: 'email'
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'password'
        },
        role: {
            type: DataTypes.STRING(50),
            defaultValue: 'Employee',
            field: 'role'
        },
        last_seen: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_seen'
        }
    }, {
        tableName: 'users',
        timestamps: false  // ✅ TIMESTAMPS DISABLE KARO
    });

    User.associate = (models) => {
        User.hasOne(models.Employee, {
            foreignKey: 'employee_code',
            sourceKey: 'employee_code',
            as: 'employeeDetails'
        });
    };

    return User;
};