module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define('Employee', {
        employee_code: {
            type: DataTypes.STRING(100),
            primaryKey: true,
            allowNull: false,
            unique: true,
            field: 'employee_code'
        },
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'first_name'
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'last_name'
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            field: 'email'
        },
        mobile_number: DataTypes.STRING(16),
        date_of_birth: DataTypes.DATEONLY,
        joining_date: DataTypes.DATEONLY,
        profile_picture: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            field: 'profile_picture'
        }
    }, {
        tableName: 'employees',
        timestamps: false
    });

    Employee.associate = (models) => {
        Employee.belongsTo(models.User, {
            foreignKey: 'employee_code',
            targetKey: 'employee_code',
            as: 'userDetails'
        });

        Employee.hasMany(models.EmployeeAddress, {
            foreignKey: 'employee_code',
            sourceKey: 'employee_code',
            as: 'EmployeeAddresses'
        });

        Employee.hasMany(models.EmployeeQualification, {
            foreignKey: 'employee_code',
            sourceKey: 'employee_code',
            as: 'EmployeeQualifications'
        });

        Employee.hasMany(models.EmployeeSkill, {
            foreignKey: 'employee_code',
            sourceKey: 'employee_code',
            as: 'EmployeeSkills'
        });

        Employee.hasMany(models.LeaveRequest, {
            foreignKey: 'employee_code',
            sourceKey: 'employee_code',
            as: 'leaveRequests'
        });

        Employee.hasOne(models.LeaveLimit, {
            foreignKey: 'employee_code',
            sourceKey: 'employee_code',
            as: 'leaveLimit'
        });

        Employee.hasMany(models.Attendance, {
            foreignKey: 'employee_code',
            sourceKey: 'employee_code',
            as: 'attendances'
        });
    };

    return Employee;
};