module.exports = (sequelize, DataTypes) => {
    const ChatMessage = sequelize.define('ChatMessage', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        sender_code: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'sender_code'
        },
        receiver_code: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'receiver_code'
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'message'
        },
        attachment_name: DataTypes.STRING(255),
        attachment_type: DataTypes.STRING(100),
        attachment_data: DataTypes.BLOB,
        is_read: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_read'
        }
    }, {
        tableName: 'chat_messages',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    ChatMessage.associate = (models) => {
        ChatMessage.belongsTo(models.Employee, {
            foreignKey: 'sender_code',
            targetKey: 'employee_code',
            as: 'sender'
        });
        ChatMessage.belongsTo(models.Employee, {
            foreignKey: 'receiver_code',
            targetKey: 'employee_code',
            as: 'receiver'
        });
    };

    return ChatMessage;
};
