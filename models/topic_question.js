var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;

var TopicQuestionSchema = new Schema({
  topic_id: { type: ObjectId },
  question_id: { type: ObjectId },
  create_at: { type: Date, default: Date.now }
});

TopicQuestionSchema.plugin(BaseModel);
TopicQuestionSchema.index({question_id: 1, topic_id: 1}, {unique: true});

mongoose.model('TopicQuestion', TopicQuestionSchema);