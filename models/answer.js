var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;

var AnswerSchema = new Schema({
  content: { type: String },
  question_id: { type: ObjectId},
  author_id: { type: ObjectId },
  answer_id: { type: ObjectId },
  create_at: { type: Date, default: Date.now },
  update_at: { type: Date, default: Date.now },
  content_is_html: { type: Boolean },
  ups: [Schema.Types.ObjectId],
  deleted: {type: Boolean, default: false},
});

AnswerSchema.plugin(BaseModel);
AnswerSchema.index({question_id: 1});
AnswerSchema.index({author_id: 1, create_at: -1});

mongoose.model('Answer', AnswerSchema);
