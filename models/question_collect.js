var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;

var QuestionCollectSchema = new Schema({
  user_id: { type: ObjectId },
  question_id: { type: ObjectId },
  create_at: { type: Date, default: Date.now }
});

QuestionCollectSchema.plugin(BaseModel);
QuestionCollectSchema.index({user_id: 1, question_id: 1}, {unique: true});

mongoose.model('QuestionCollect', QuestionCollectSchema);
