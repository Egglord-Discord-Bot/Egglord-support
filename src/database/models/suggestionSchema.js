const { Schema, model } = require('mongoose');

const suggestionSchema = Schema({
	num: Number,
	messageId: String,
	suggestion: String,
	response: String,
	responseOption: String,
});

module.exports = model('Suggestions', suggestionSchema);
