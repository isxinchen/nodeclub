var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;

var TopicQuestionSchema = new Schema({
  question_id: { type: ObjectId },
  topic_id: { type: ObjectId },
  create_at: { type: Date, default: Date.now }
});

QuestionCollectSchema.plugin(BaseModel);
QuestionCollectSchema.index({question_id: 1, topic_id: 1}, {unique: true});

mongoose.model('TopicQuestion', TopicQuestionSchema);