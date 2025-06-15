const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Invalid request data');
    }
    next();
};

// Sheet routes validators
const sheetValidators = {
    getSheet: [
        param('sheetName').isString().trim().notEmpty(),
        query('sport').optional().isString(),
        query('eventId').optional().isString(),
        query('packageId').optional().isString(),
        validate
    ],

    getSheetRow: [
        param('sheetName').isString().trim().notEmpty(),
        param('idColumn').isString().trim().notEmpty(),
        param('idValue').isString().trim().notEmpty(),
        validate
    ],

    createRow: [
        param('sheetName').isString().trim().notEmpty(),
        body().isObject().notEmpty(),
        validate
    ],

    updateCell: [
        param('sheetName').isString().trim().notEmpty(),
        param('idColumn').isString().trim().notEmpty(),
        param('idValue').isString().trim().notEmpty(),
        body('column').isString().trim().notEmpty(),
        body('value').optional(),
        validate
    ],

    bulkUpdate: [
        param('sheetName').isString().trim().notEmpty(),
        param('idColumn').isString().trim().notEmpty(),
        param('idValue').isString().trim().notEmpty(),
        body().isArray().notEmpty(),
        body('*.column').isString().trim().notEmpty(),
        body('*.value').optional(),
        validate
    ],

    deleteRow: [
        param('sheetName').isString().trim().notEmpty(),
        param('idColumn').isString().trim().notEmpty(),
        param('idValue').isString().trim().notEmpty(),
        validate
    ]
};

module.exports = {
    validate,
    sheetValidators
}; 